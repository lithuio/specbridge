import { AuthorizationRepository } from '../../src/authorization/authorization.repository.js';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Pool } from 'pg';
import { AppModule } from '../../src/app.module.js';
import { ChangesService } from '../../src/changes/changes.service.js';
import { ChangesRepository } from '../../src/changes/changes.repository.js';
import { RequirementsService } from '../../src/requirements/requirements.service.js';
import { ProjectsService } from '../../src/projects/projects.service.js';
import { AuditWriter } from '../../src/audit/audit.module.js';
import { openTestDatabase } from './helpers.js';
import { signal, waitForLock } from '../rbac/helpers.js';
import {
  setup as fixture,
  commercial,
  spec,
  snapshot,
} from '../changes/helpers.js';
let pool: Pool,
  module: TestingModule,
  service: ChangesService,
  requirements: RequirementsService,
  projects: ProjectsService;
beforeAll(async () => {
  pool = await openTestDatabase();
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('OBSERVE_APP_KEY', '');
  vi.stubEnv('OBSERVE_APP_SECRET', '');
  module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  service = module.get(ChangesService);
  requirements = module.get(RequirementsService);
  projects = module.get(ProjectsService);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await module?.close();
  await pool?.end();
  vi.unstubAllEnvs();
});
const setup = (bind = true) => fixture(pool, module, bind);
const page = { limit: 20, offset: 0 };
async function submit(f: Awaited<ReturnType<typeof setup>>) {
  await service.patch(f.developer.id, f.cr.id, {
    expectedVersion: 0,
    ...commercial,
  });
  return service.submit(f.developer.id, f.cr.id, { expectedVersion: 1 });
}
it('freezes exact commercial fields and both approvals on one immutable version, with role-safe history', async () => {
  const f = await setup();
  expect(f.cr).toMatchObject({
    lockVersion: 0,
    draft: { costDeltaMinor: null },
  });
  expect(
    (await service.detail(f.client.id, f.cr.id, page)).data,
  ).not.toHaveProperty('draft');
  const v = await submit(f);
  await expect(
    service.decision(f.client.id, f.cr.id, 'CLIENT', {
      expectedVersion: 2,
      decision: 'APPROVED',
    }),
  ).rejects.toMatchObject({ response: { code: 'INVALID_TRANSITION' } });
  await service.decision(f.owner.id, f.cr.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'APPROVED',
    comment: 'Public vendor comment',
  });
  const approved = await service.decision(f.client.id, f.cr.id, 'CLIENT', {
    expectedVersion: 3,
    decision: 'APPROVED',
  });
  expect(approved).toMatchObject({
    status: 'APPROVED',
    lockVersion: 4,
    changeRequestVersionId: v.changeRequestVersionId,
  });
  const detail = (await service.detail(f.client.id, f.cr.id, page)).data;
  expect(detail.activeVersion).toMatchObject({
    scopeSnapshot: commercial.scopeSummary,
    estimateHours: '16.25',
    costDeltaMinor: -500,
    requirementRevisionId: f.revision.id,
  });
  expect(
    detail.activeVersion!.approvals.map((a) => a.changeRequestVersionId),
  ).toEqual([v.changeRequestVersionId, v.changeRequestVersionId]);
  expect(detail.activeVersion!.approvals[0].comment).toBe(
    'Public vendor comment',
  );
  for (const table of ['change_request_versions', 'approvals']) {
    await expect(
      pool.query(
        `UPDATE ${table} SET id=id WHERE ${table === 'approvals' ? 'change_request_version_id' : 'id'}=$1`,
        [v.changeRequestVersionId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        `DELETE FROM ${table} WHERE ${table === 'approvals' ? 'change_request_version_id' : 'id'}=$1`,
        [v.changeRequestVersionId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  }
  await expect(
    service.reopen(f.owner.id, f.cr.id, { expectedVersion: 4 }),
  ).rejects.toMatchObject({ response: { code: 'INVALID_TRANSITION' } });
  await expect(
    service.patch(f.owner.id, f.cr.id, {
      expectedVersion: 4,
      scopeSummary: 'mutate',
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it.each(['VENDOR', 'CLIENT'] as const)(
  'retains %s rejection, creates a new version and never inherits approval',
  async (step) => {
    const f = await setup();
    const one = await submit(f);
    let n = 2;
    if (step === 'CLIENT') {
      await service.decision(f.owner.id, f.cr.id, 'VENDOR', {
        expectedVersion: n++,
        decision: 'APPROVED',
      });
    }
    await service.decision(
      step === 'VENDOR' ? f.owner.id : f.client.id,
      f.cr.id,
      step,
      { expectedVersion: n++, decision: 'REJECTED', comment: 'Revise scope' },
    );
    const old = (await service.detail(f.client.id, f.cr.id, page)).data
      .activeVersion;
    await expect(
      service.patch(f.owner.id, f.cr.id, {
        expectedVersion: n,
        scopeSummary: 'x',
      }),
    ).rejects.toMatchObject({ status: 409 });
    await service.reopen(f.developer.id, f.cr.id, { expectedVersion: n++ });
    await expect(
      projects.bindClient(f.owner.id, f.project.id, f.outsider.email),
    ).rejects.toMatchObject({ response: { code: 'CLIENT_ASSIGNMENT_LOCKED' } });
    const two = await service.submit(f.developer.id, f.cr.id, {
      expectedVersion: n++,
    });
    expect(two.versionNo).toBe(2);
    expect(two.changeRequestVersionId).not.toBe(one.changeRequestVersionId);
    const detail = await service.detail(f.client.id, f.cr.id, {
      limit: 1,
      offset: 1,
    });
    expect(detail.data.versions[0]).toEqual(old);
    expect(detail.data.activeVersion!.approvals).toEqual([]);
    await expect(
      service.decision(f.client.id, f.cr.id, 'CLIENT', {
        expectedVersion: n,
        decision: 'APPROVED',
      }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_TRANSITION' } });
  },
);
it('requires complete assessment and Client, preserves zero and negative amounts, and permits explicit clearing', async () => {
  const f = await setup(false);
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 0 }),
  ).rejects.toMatchObject({ response: { code: 'CLIENT_REQUIRED' } });
  await projects.bindClient(f.owner.id, f.project.id, f.client.email);
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 0 }),
  ).rejects.toMatchObject({ status: 422 });
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 0,
    ...commercial,
    costDeltaMinor: 0,
    estimateHours: '0',
    scheduleDeltaDays: 0,
  });
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 1,
    currency: null,
  });
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 2 }),
  ).rejects.toMatchObject({ status: 422 });
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 2,
    currency: 'CNY',
  });
  await service.submit(f.owner.id, f.cr.id, { expectedVersion: 3 });
  expect(
    (await service.detail(f.client.id, f.cr.id, page)).data.activeVersion,
  ).toMatchObject({
    estimateHours: '0.00',
    costDeltaMinor: 0,
    scheduleDeltaDays: 0,
  });
});
it('rejects stale/foreign revisions and demands explicit latest Ready revision selection', async () => {
  const f = await setup(),
    other = await setup();
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 0,
    ...commercial,
  });
  await expect(
    service.patch(f.owner.id, f.cr.id, {
      expectedVersion: 1,
      requirementRevisionId: other.revision.id,
    }),
  ).rejects.toMatchObject({ status: 422 });
  const rev = await requirements.revision(f.owner.id, f.requirement.id, {
    expectedVersion: 3,
    ...spec,
  });
  await expect(
    service.create(f.owner.id, f.requirement.id),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 }),
  ).rejects.toMatchObject({ status: 422 });
  await requirements.ready(f.owner.id, f.requirement.id, {
    expectedVersion: 4,
  });
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 }),
  ).rejects.toMatchObject({ status: 422 });
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 1,
    requirementRevisionId: rev.id.toUpperCase(),
  });
  await service.submit(f.owner.id, f.cr.id, { expectedVersion: 2 });
  expect(
    (await service.detail(f.owner.id, f.cr.id, page)).data.activeVersion!
      .requirementRevisionId,
  ).toBe(rev.id);
});
it('rolls back all six mutation types when audit fails, without consuming version numbers', async () => {
  const f = await setup(),
    audit = module.get(AuditWriter);
  async function fails(action: () => Promise<unknown>) {
    const before = await snapshot(pool, f.project.id);
    vi.spyOn(audit, 'write').mockRejectedValueOnce(
      new Error('Injected audit failure'),
    );
    await expect(action()).rejects.toThrow('Injected');
    expect(await snapshot(pool, f.project.id)).toEqual(before);
  }
  await fails(() => service.create(f.owner.id, f.requirement.id));
  await fails(() =>
    service.patch(f.owner.id, f.cr.id, { expectedVersion: 0, ...commercial }),
  );
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 0,
    ...commercial,
  });
  await fails(() =>
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 }),
  );
  expect(
    (await projects.detail(f.owner.id, f.project.id)).clientAssignmentLocked,
  ).toBe(false);
  expect(
    (await service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 }))
      .versionNo,
  ).toBe(1);
  await fails(() =>
    service.decision(f.owner.id, f.cr.id, 'VENDOR', {
      expectedVersion: 2,
      decision: 'APPROVED',
    }),
  );
  await service.decision(f.owner.id, f.cr.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'APPROVED',
  });
  await fails(() =>
    service.decision(f.client.id, f.cr.id, 'CLIENT', {
      expectedVersion: 3,
      decision: 'REJECTED',
    }),
  );
  await service.decision(f.client.id, f.cr.id, 'CLIENT', {
    expectedVersion: 3,
    decision: 'REJECTED',
  });
  await fails(() =>
    service.reopen(f.owner.id, f.cr.id, { expectedVersion: 4 }),
  );
});
// Hold the first real domain transaction at its audit write, then observe the second blocking in PostgreSQL.
async function race<T, U>(first: () => Promise<T>, second: () => Promise<U>) {
  const entered = signal(),
    release = signal(),
    audit = module.get(AuditWriter),
    original = audit.write.bind(audit);
  vi.spyOn(audit, 'write').mockImplementationOnce(async (...args) => {
    await original(...args);
    entered.resolve();
    await release.promise;
  });
  const a = first();
  await entered.promise;
  const b = second().then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  return { first: await a, second: await b };
}
it('serializes duplicate Submit and conflicting Vendor/Client decisions with exactly one write', async () => {
  const f = await setup();
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 0,
    ...commercial,
  });
  const call = () =>
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 });
  expect((await race(call, call)).second).toMatchObject({
    error: { response: { code: 'STALE_VERSION' } },
  });
  for (const [step, actor, n] of [
    ['VENDOR', f.owner.id, 2],
    ['CLIENT', f.client.id, 3],
  ] as const) {
    const result = await race(
      () =>
        service.decision(actor, f.cr.id, step, {
          expectedVersion: n,
          decision: 'APPROVED',
        }),
      () =>
        service.decision(actor, f.cr.id, step, {
          expectedVersion: n,
          decision: 'REJECTED',
        }),
    );
    expect(result.second).toMatchObject({
      error: { response: { code: 'STALE_VERSION' } },
    });
    await expect(
      service.decision(actor, f.cr.id, step, {
        expectedVersion: n + 1,
        decision: 'REJECTED',
      }),
    ).rejects.toMatchObject({ response: { code: 'ALREADY_REVIEWED' } });
  }
  const state = await snapshot(pool, f.project.id);
  expect(state.versions).toHaveLength(1);
  expect(state.approvals).toHaveLength(2);
});
it.each(['submit-first', 'binding-first'])(
  'coordinates actual Client replacement and Submit: %s',
  async (order) => {
    const f = await setup();
    await service.patch(f.owner.id, f.cr.id, {
      expectedVersion: 0,
      ...commercial,
    });
    const submit = () =>
      service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 });
    const bind = () =>
      projects.bindClient(f.owner.id, f.project.id, f.outsider.email);
    if (order === 'submit-first')
      expect((await race(submit, bind)).second).toMatchObject({
        error: { response: { code: 'CLIENT_ASSIGNMENT_LOCKED' } },
      });
    else {
      expect((await race(bind, submit)).second).toHaveProperty('value');
      await expect(
        service.detail(f.client.id, f.cr.id, page),
      ).rejects.toMatchObject({ status: 404 });
      expect(
        (
          await pool.query(
            "SELECT metadata->>'clientId' AS id FROM audit_events WHERE entity_id=$1 AND event_type='change_request.submitted'",
            [f.cr.id],
          )
        ).rows[0].id,
      ).toBe(f.outsider.id);
    }
  },
);
it.each(['submit-first', 'revision-first'])(
  'coordinates actual Revision and Submit: %s',
  async (order) => {
    const f = await setup();
    await service.patch(f.owner.id, f.cr.id, {
      expectedVersion: 0,
      ...commercial,
    });
    const submit = () =>
      service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 });
    const revise = () =>
      requirements.revision(f.owner.id, f.requirement.id, {
        expectedVersion: 3,
        ...spec,
      });
    if (order === 'submit-first')
      expect((await race(submit, revise)).second).toMatchObject({
        error: { response: { code: 'REVIEW_IN_PROGRESS' } },
      });
    else
      expect((await race(revise, submit)).second).toMatchObject({
        error: { status: 422 },
      });
  },
);
it('rejects a Client request waiting behind Owner when its expectedVersion is stale', async () => {
  const f = await setup();
  await submit(f);
  const result = await race(
    () =>
      service.decision(f.owner.id, f.cr.id, 'VENDOR', {
        expectedVersion: 2,
        decision: 'APPROVED',
      }),
    () =>
      service.decision(f.client.id, f.cr.id, 'CLIENT', {
        expectedVersion: 2,
        decision: 'APPROVED',
      }),
  );
  expect(result.second).toMatchObject({
    error: { response: { code: 'STALE_VERSION' } },
  });
  expect((await snapshot(pool, f.project.id)).approvals).toHaveLength(1);
});
it('normalizes service UUIDs and rejects version exhaustion without modifying data', async () => {
  const f = await setup();
  await service.patch(f.owner.id.toUpperCase(), f.cr.id.toUpperCase(), {
    expectedVersion: 0,
    ...commercial,
    requirementRevisionId: f.revision.id.toUpperCase(),
  });
  await pool.query(
    'UPDATE change_requests SET lock_version=2147483647 WHERE id=$1',
    [f.cr.id],
  );
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 2147483647 }),
  ).rejects.toMatchObject({ status: 422 });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('uses conditional update even after locking and revalidates stored draft data', async () => {
  const f = await setup();
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 0,
    ...commercial,
  });
  await pool.query(
    "UPDATE change_requests SET draft_currency='ZZZ' WHERE id=$1",
    [f.cr.id],
  );
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 }),
  ).rejects.toMatchObject({ status: 422 });
  await pool.query(
    "UPDATE change_requests SET draft_currency='CNY' WHERE id=$1",
    [f.cr.id],
  );
  const repo = module.get(ChangesRepository),
    original = repo.advance.bind(repo);
  vi.spyOn(repo, 'advance').mockImplementationOnce((tx, row, values) =>
    original(tx, { ...row, lockVersion: row.lockVersion + 1 }, values),
  );
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 1 }),
  ).rejects.toMatchObject({ response: { code: 'STALE_VERSION' } });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});

it('blocks Revision while any sibling CR is pending and preserves the approved historical revision', async () => {
  const f = await setup(),
    first = await submit(f);
  const sibling = await service.create(f.owner.id, f.requirement.id);
  await service.patch(f.owner.id, sibling.id, {
    expectedVersion: 0,
    ...commercial,
  });
  await service.submit(f.owner.id, sibling.id, { expectedVersion: 1 });
  await service.decision(f.owner.id, f.cr.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'APPROVED',
  });
  await service.decision(f.client.id, f.cr.id, 'CLIENT', {
    expectedVersion: 3,
    decision: 'APPROVED',
  });
  await expect(
    requirements.revision(f.owner.id, f.requirement.id, {
      expectedVersion: 3,
      ...spec,
    }),
  ).rejects.toMatchObject({ response: { code: 'REVIEW_IN_PROGRESS' } });
  await service.decision(f.owner.id, sibling.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'REJECTED',
  });
  await requirements.revision(f.owner.id, f.requirement.id, {
    expectedVersion: 3,
    ...spec,
  });
  const detail = (await service.detail(f.client.id, f.cr.id, page)).data;
  expect(detail.status).toBe('APPROVED');
  expect(detail.activeVersion).toMatchObject({
    id: first.changeRequestVersionId,
    requirementRevisionId: f.revision.id,
    requirementRevision: { content: spec.content },
  });
});
it('never overflows versionNo and never rounds stored bigint amounts into JSON', async () => {
  const f = await setup();
  await service.patch(f.owner.id, f.cr.id, {
    expectedVersion: 0,
    ...commercial,
    costDeltaMinor: Number.MAX_SAFE_INTEGER,
  });
  const first = await service.submit(f.owner.id, f.cr.id, {
    expectedVersion: 1,
  });
  expect(
    (await service.detail(f.client.id, f.cr.id, page)).data.activeVersion!
      .costDeltaMinor,
  ).toBe(Number.MAX_SAFE_INTEGER);
  await service.decision(f.owner.id, f.cr.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'REJECTED',
  });
  await service.reopen(f.owner.id, f.cr.id, { expectedVersion: 3 });
  // Explicit storage fixture to reach an otherwise impractical integer boundary; never mutate a frozen row.
  await pool.query(
    `INSERT INTO change_request_versions(change_request_id,version_no,requirement_revision_id,scope_snapshot,estimate_hours,cost_delta_minor,currency,schedule_delta_days,acceptance_criteria,submitted_by)
    SELECT change_request_id,2147483647,requirement_revision_id,scope_snapshot,estimate_hours,cost_delta_minor,currency,schedule_delta_days,acceptance_criteria,submitted_by FROM change_request_versions WHERE id=$1`,
    [first.changeRequestVersionId],
  );
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.submit(f.owner.id, f.cr.id, { expectedVersion: 4 }),
  ).rejects.toMatchObject({ status: 422 });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
  await pool.query(
    'UPDATE change_requests SET draft_cost_delta_minor=9007199254740992 WHERE id=$1',
    [f.cr.id],
  );
  await expect(service.detail(f.owner.id, f.cr.id, page)).rejects.toThrow(
    'Stored amount',
  );
  // Client projection must not even convert the private draft amount.
  expect(
    (await service.detail(f.client.id, f.cr.id, page)).data,
  ).not.toHaveProperty('draft');
});
it('rejects invalid stored active pointers and forged Vendor records instead of approving another snapshot', async () => {
  const f = await setup();
  const one = await submit(f);
  await service.decision(f.owner.id, f.cr.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'REJECTED',
  });
  await service.reopen(f.owner.id, f.cr.id, { expectedVersion: 3 });
  await service.submit(f.owner.id, f.cr.id, { expectedVersion: 4 });
  await pool.query(
    'UPDATE change_requests SET active_version_id=$1 WHERE id=$2',
    [one.changeRequestVersionId, f.cr.id],
  );
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.decision(f.owner.id, f.cr.id, 'VENDOR', {
      expectedVersion: 5,
      decision: 'APPROVED',
    }),
  ).rejects.toMatchObject({ status: 422 });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
  const g = await setup(),
    current = await submit(g);
  await pool.query(
    "UPDATE change_requests SET status='VENDOR_APPROVED' WHERE id=$1",
    [g.cr.id],
  );
  await expect(
    service.decision(g.client.id, g.cr.id, 'CLIENT', {
      expectedVersion: 2,
      decision: 'APPROVED',
    }),
  ).rejects.toMatchObject({ status: 422 });
  await pool.query(
    "INSERT INTO approvals(change_request_version_id,step,actor_id,decision) VALUES($1,'VENDOR',$2,'APPROVED')",
    [current.changeRequestVersionId, g.developer.id],
  );
  await expect(
    service.decision(g.client.id, g.cr.id, 'CLIENT', {
      expectedVersion: 2,
      decision: 'APPROVED',
    }),
  ).rejects.toMatchObject({ status: 422 });
  expect((await snapshot(pool, g.project.id)).approvals).toHaveLength(1);
});
it('rejects Client-first concurrent approval before allowing the waiting Vendor decision', async () => {
  const f = await setup();
  await submit(f);
  const repo = module.get(ChangesRepository),
    original = repo.get.bind(repo);
  const entered = signal(),
    release = signal();
  let paused = false;
  vi.spyOn(repo, 'get').mockImplementation(async (...args) => {
    const row = await original(...args);
    if (args[2] && !paused) {
      paused = true;
      entered.resolve();
      await release.promise;
    }
    return row;
  });
  const client = service
    .decision(f.client.id, f.cr.id, 'CLIENT', {
      expectedVersion: 2,
      decision: 'APPROVED',
    })
    .catch((error: unknown) => error);
  await entered.promise;
  const vendor = service.decision(f.owner.id, f.cr.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'APPROVED',
  });
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  expect(await client).toMatchObject({
    response: { code: 'INVALID_TRANSITION' },
  });
  expect((await vendor).status).toBe('VENDOR_APPROVED');
  expect((await snapshot(pool, f.project.id)).approvals).toHaveLength(1);
});
it('keeps read authorization and projection in one snapshot during Client replacement', async () => {
  const f = await setup(),
    repo = module.get(AuthorizationRepository),
    original = repo.project.bind(repo);
  const entered = signal(),
    release = signal();
  vi.spyOn(repo, 'project').mockImplementationOnce(async (...args) => {
    const authorized = await original(...args);
    entered.resolve();
    await release.promise;
    return authorized;
  });
  const read = service.detail(f.client.id, f.cr.id, page);
  await entered.promise;
  try {
    await projects.bindClient(f.owner.id, f.project.id, f.outsider.email);
  } finally {
    release.resolve();
  }
  expect((await read).data.id).toBe(f.cr.id);
  await expect(
    service.detail(f.client.id, f.cr.id, page),
  ).rejects.toMatchObject({ status: 404 });
});
