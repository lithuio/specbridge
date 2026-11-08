import { Test, type TestingModule } from '@nestjs/testing';
import type { Pool } from 'pg';
import { AppModule } from '../../src/app.module.js';
import { RequirementsService } from '../../src/requirements/requirements.service.js';
import { RequirementsRepository } from '../../src/requirements/requirements.repository.js';
import { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import { ProjectsService } from '../../src/projects/projects.service.js';
import { AuditWriter } from '../../src/audit/audit.module.js';
import { openTestDatabase } from './helpers.js';
import { domain, signal, waitForLock } from '../rbac/helpers.js';
let pool: Pool, module: TestingModule, service: RequirementsService;
const revision = {
  content: 'Frozen text',
  acceptanceCriteria: ['Observable criterion'],
};
beforeAll(async () => {
  pool = await openTestDatabase();
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('OBSERVE_APP_KEY', '');
  vi.stubEnv('OBSERVE_APP_SECRET', '');
  module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  service = module.get(RequirementsService);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await module?.close();
  await pool?.end();
  vi.unstubAllEnvs();
});
async function setup() {
  const f = await domain(
    pool,
    module.get(WorkspacesService),
    module.get(ProjectsService),
  );
  const row = await service.create(f.owner.id, f.project.id, {
    title: 'Test',
    originalText: 'Original',
  });
  return { ...f, row };
}
async function snapshot(id: string) {
  return (
    await pool.query(
      `SELECT to_jsonb(r) AS requirement,
    (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]') FROM clarifications q WHERE q.requirement_id=r.id) AS questions,
    (SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.revision_no),'[]') FROM requirement_revisions v WHERE v.requirement_id=r.id) AS revisions,
    (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]') FROM audit_events a WHERE a.project_id=r.project_id) AS audit
    FROM requirements r WHERE r.id=$1`,
      [id],
    )
  ).rows[0];
}
it('keeps all domain changes atomic when audit fails, including revision pointer and numbering', async () => {
  const f = await setup();
  const audit = module.get(AuditWriter);
  const actions = [
    () =>
      service.patch(f.owner.id, f.row.id, {
        expectedVersion: 1,
        title: 'Edited',
      }),
    () =>
      service.clarify(f.owner.id, f.row.id, {
        expectedVersion: 1,
        kind: 'QUESTION',
        body: 'Question?',
      }),
    () =>
      service.revision(f.owner.id, f.row.id, {
        expectedVersion: 1,
        ...revision,
      }),
  ];
  for (const action of actions) {
    const before = await snapshot(f.row.id);
    vi.spyOn(audit, 'write').mockRejectedValueOnce(
      new Error('Injected audit failure'),
    );
    await expect(action()).rejects.toThrow('Injected');
    expect(await snapshot(f.row.id)).toEqual(before);
  }
  const first = await service.revision(f.owner.id, f.row.id, {
    expectedVersion: 1,
    ...revision,
  });
  expect(first.revisionNo).toBe(1);
  const before = await snapshot(f.row.id);
  vi.spyOn(audit, 'write').mockRejectedValueOnce(
    new Error('Injected audit failure'),
  );
  await expect(
    service.ready(f.owner.id, f.row.id, { expectedVersion: 2 }),
  ).rejects.toThrow('Injected');
  expect(await snapshot(f.row.id)).toEqual(before);
  vi.spyOn(audit, 'write').mockRejectedValueOnce(
    new Error('Injected audit failure'),
  );
  await expect(
    service.create(f.owner.id, f.project.id, {
      title: 'Fail',
      originalText: 'Fail',
    }),
  ).rejects.toThrow('Injected');
  expect(
    (
      await pool.query('SELECT id FROM requirements WHERE project_id=$1', [
        f.project.id,
      ])
    ).rowCount,
  ).toBe(1);
});
it('rolls back a revision insert if the aggregate update fails', async () => {
  const f = await setup(),
    before = await snapshot(f.row.id);
  vi.spyOn(module.get(RequirementsRepository), 'advance').mockRejectedValueOnce(
    new Error('Injected update failure'),
  );
  await expect(
    service.revision(f.owner.id, f.row.id, { expectedVersion: 1, ...revision }),
  ).rejects.toThrow('Injected');
  expect(await snapshot(f.row.id)).toEqual(before);
});
// Hold the first real transaction at its audit boundary; assert the second waits on a row lock.
async function race(
  first: () => Promise<unknown>,
  second: () => Promise<unknown>,
) {
  const entered = signal(),
    release = signal();
  const audit = module.get(AuditWriter),
    original = audit.write.bind(audit);
  vi.spyOn(audit, 'write').mockImplementationOnce(async (...args) => {
    entered.resolve();
    await release.promise;
    await original(...args);
  });
  const a = first();
  const timeout = setTimeout(() => entered.resolve(), 3000);
  await entered.promise;
  clearTimeout(timeout);
  const b = second().then(
    (value) => ({ value, error: undefined }),
    (error: unknown) => ({ value: undefined, error }),
  );
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  await a;
  return b;
}
it.each(['patch', 'revision'] as const)(
  'serializes concurrent %s using aggregate version with no duplicate audit',
  async (kind) => {
    const f = await setup();
    const action = () =>
      kind === 'patch'
        ? service.patch(f.owner.id, f.row.id, {
            expectedVersion: 1,
            title: 'Changed',
          })
        : service.revision(f.owner.id, f.row.id, {
            expectedVersion: 1,
            ...revision,
          });
    expect((await race(action, action)).error).toMatchObject({
      response: { code: 'STALE_VERSION' },
    });
    const state = await service.detail(f.owner.id, f.row.id);
    expect(state.draftVersion).toBe(2);
    expect(
      (
        await pool.query(
          "SELECT id FROM audit_events WHERE entity_id=$1 OR metadata->>'requirementId'=$1::text",
          [f.row.id],
        )
      ).rowCount,
    ).toBe(2);
    if (kind === 'revision') {
      const next = await service.revision(f.owner.id, f.row.id, {
        expectedVersion: 2,
        ...revision,
      });
      expect(next.revisionNo).toBe(2);
      expect(
        (
          await service.history(f.owner.id, f.row.id, { limit: 20, offset: 0 })
        ).map((r) => r.revisionNo),
      ).toEqual([2, 1]);
      for (const sql of [
        "UPDATE requirement_revisions SET content='Overwrite' WHERE id=$1",
        'DELETE FROM requirement_revisions WHERE id=$1',
      ])
        await expect(pool.query(sql, [next.id])).rejects.toMatchObject({
          code: '23514',
        });
    }
  },
);
it.each([
  'ready-first',
  'revision-first',
  'question-first',
  'ready-before-question',
] as const)('prevents stale Ready decisions: %s', async (order) => {
  const f = await setup();
  await service.revision(f.owner.id, f.row.id, {
    expectedVersion: 1,
    ...revision,
  });
  const ready = () =>
    service.ready(f.owner.id, f.row.id, { expectedVersion: 2 });
  const other = () =>
    order.includes('question')
      ? service.clarify(f.owner.id, f.row.id, {
          expectedVersion: 2,
          kind: 'QUESTION',
          body: 'New question?',
        })
      : service.revision(f.owner.id, f.row.id, {
          expectedVersion: 2,
          ...revision,
        });
  const readyFirst = order.startsWith('ready');
  expect(
    (await race(readyFirst ? ready : other, readyFirst ? other : ready)).error,
  ).toMatchObject({ response: { code: 'STALE_VERSION' } });
  const row = await service.detail(f.owner.id, f.row.id);
  expect(row.draftVersion).toBe(3);
  expect(row.status).toBe(readyFirst ? 'READY' : 'CLARIFYING');
});
it.each([
  'SUBMITTED',
  'VENDOR_APPROVED',
  'DRAFT',
  'REJECTED',
  'APPROVED',
] as const)('checks all related CRs for pending review: %s', async (status) => {
  const f = await setup();
  const rev = await service.revision(f.owner.id, f.row.id, {
    expectedVersion: 1,
    ...revision,
  });
  await pool.query(
    'INSERT INTO change_requests(requirement_id,draft_requirement_revision_id,created_by,status) VALUES($1,$2,$3,$4)',
    [f.row.id, rev.id, f.owner.id, status],
  );
  const before = await snapshot(f.row.id);
  if (status === 'SUBMITTED' || status === 'VENDOR_APPROVED') {
    await expect(
      service.revision(f.owner.id, f.row.id, {
        expectedVersion: 2,
        ...revision,
      }),
    ).rejects.toMatchObject({ response: { code: 'REVIEW_IN_PROGRESS' } });
    expect(await snapshot(f.row.id)).toEqual(before);
  } else
    expect(
      (
        await service.revision(f.owner.id, f.row.id, {
          expectedVersion: 2,
          ...revision,
        })
      ).revisionNo,
    ).toBe(2);
});
it('rechecks Client authorization after waiting for Workspace/Project locks', async () => {
  const f = await setup(),
    projects = module.get(ProjectsService);
  await projects.bindClient(f.owner.id, f.project.id, f.client.email);
  const before = await snapshot(f.row.id);
  const result = await race(
    () => projects.bindClient(f.owner.id, f.project.id, f.outsider.email),
    () =>
      service.clarify(f.client.id, f.row.id, {
        expectedVersion: 1,
        kind: 'QUESTION',
        body: 'Forbidden after replacement',
      }),
  );
  expect(result.error).toMatchObject({ status: 404 });
  const after = await snapshot(f.row.id);
  expect(after.requirement).toEqual(before.requirement);
  expect(after.questions).toEqual([]);
});
it('rejects nonlatest pointers, whitespace legacy criteria, and exhausted counters', async () => {
  const f = await setup();
  const one = await service.revision(f.owner.id, f.row.id, {
    expectedVersion: 1,
    ...revision,
  });
  await service.revision(f.owner.id, f.row.id, {
    expectedVersion: 2,
    ...revision,
  });
  await pool.query(
    'UPDATE requirements SET latest_revision_id=$1 WHERE id=$2',
    [one.id, f.row.id],
  );
  await expect(
    service.ready(f.owner.id, f.row.id, { expectedVersion: 3 }),
  ).rejects.toMatchObject({ status: 422 });
  const legacy = (
    await pool.query(
      'INSERT INTO requirement_revisions(requirement_id,revision_no,content,acceptance_criteria,created_by) VALUES($1,3,$2,$3,$4) RETURNING id',
      [f.row.id, 'Text', '[" "]', f.owner.id],
    )
  ).rows[0];
  await pool.query(
    'UPDATE requirements SET latest_revision_id=$1 WHERE id=$2',
    [legacy.id, f.row.id],
  );
  await expect(
    service.ready(f.owner.id, f.row.id, { expectedVersion: 3 }),
  ).rejects.toMatchObject({ status: 422 });
  await pool.query(
    'UPDATE requirements SET draft_version=2147483647 WHERE id=$1',
    [f.row.id],
  );
  await expect(
    service.revision(f.owner.id, f.row.id, {
      expectedVersion: 2147483647,
      ...revision,
    }),
  ).rejects.toMatchObject({ status: 422 });
});
it('normalizes UUIDs for internal calls and preserves author/pointer identity', async () => {
  const f = await setup();
  const q = await service.clarify(
    f.owner.id.toUpperCase(),
    f.row.id.toUpperCase(),
    { expectedVersion: 1, kind: 'QUESTION', body: 'Question' },
  );
  const a = await service.clarify(
    f.owner.id.toUpperCase(),
    f.row.id.toUpperCase(),
    {
      expectedVersion: 2,
      kind: 'ANSWER',
      parentId: q.id.toUpperCase(),
      body: 'Answer',
    },
  );
  expect(a.parentId).toBe(q.id);
  expect(a.authorId).toBe(f.owner.id);
  expect(a.requirementId).toBe(f.row.id);
});
// Controlled SQL protocol fixture ONLY. R05 Submit is not implemented by this test.
it.each(['submit-first', 'revision-first'] as const)(
  'coordinates future Submit protocol with Revision: %s',
  async (order) => {
    const f = await setup();
    const rev = await service.revision(f.owner.id, f.row.id, {
      expectedVersion: 1,
      ...revision,
    });
    await service.ready(f.owner.id, f.row.id, { expectedVersion: 2 });
    const cr = (
      await pool.query(
        'INSERT INTO change_requests(requirement_id,draft_requirement_revision_id,created_by) VALUES($1,$2,$3) RETURNING id',
        [f.row.id, rev.id, f.owner.id],
      )
    ).rows[0];
    const c = await pool.connect();
    const locked = signal(),
      release = signal();
    async function submit() {
      await c.query('BEGIN');
      await c.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE', [
        f.workspace.id,
      ]);
      await c.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE', [
        f.project.id,
      ]);
      const r = (
        await c.query(
          'SELECT status,latest_revision_id FROM requirements WHERE id=$1 FOR UPDATE',
          [f.row.id],
        )
      ).rows[0];
      await c.query('SELECT id FROM change_requests WHERE id=$1 FOR UPDATE', [
        cr.id,
      ]);
      if (r.status !== 'READY' || r.latest_revision_id !== rev.id) {
        await c.query('ROLLBACK');
        return false;
      }
      if (order === 'submit-first') {
        locked.resolve();
        await release.promise;
      }
      await c.query(
        "UPDATE change_requests SET status='SUBMITTED' WHERE id=$1",
        [cr.id],
      );
      await c.query('COMMIT');
      return true;
    }
    try {
      if (order === 'submit-first') {
        const a = submit();
        await locked.promise;
        const b = service
          .revision(f.owner.id, f.row.id, { expectedVersion: 3, ...revision })
          .catch((error: unknown) => error);
        try {
          await waitForLock(pool);
        } finally {
          release.resolve();
        }
        expect(await a).toBe(true);
        expect(await b).toMatchObject({
          response: { code: 'REVIEW_IN_PROGRESS' },
        });
      } else {
        const result = await race(
          () =>
            service.revision(f.owner.id, f.row.id, {
              expectedVersion: 3,
              ...revision,
            }),
          submit,
        );
        expect(result.value).toBe(false);
        expect(
          (
            await pool.query('SELECT status FROM change_requests WHERE id=$1', [
              cr.id,
            ])
          ).rows[0].status,
        ).toBe('DRAFT');
      }
    } finally {
      release.resolve();
      await c.query('ROLLBACK');
      c.release();
    }
  },
);
