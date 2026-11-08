import { Test, type TestingModule } from '@nestjs/testing';
import type { Pool } from 'pg';
import { AppModule } from '../../src/app.module.js';
import { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import { ProjectsService } from '../../src/projects/projects.service.js';
import { WorkspacesRepository } from '../../src/workspaces/workspaces.repository.js';
import { ProjectsRepository } from '../../src/projects/projects.repository.js';
import { AuditWriter } from '../../src/audit/audit.module.js';
import { openTestDatabase } from './helpers.js';
import {
  account,
  domain,
  signal,
  submittedHistory,
  waitForLock,
} from '../rbac/helpers.js';
let pool: Pool,
  module: TestingModule,
  workspaces: WorkspacesService,
  projects: ProjectsService;
beforeAll(async () => {
  pool = await openTestDatabase();
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('OBSERVE_APP_KEY', '');
  vi.stubEnv('OBSERVE_APP_SECRET', '');
  module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  workspaces = module.get(WorkspacesService);
  projects = module.get(ProjectsService);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await module?.close();
  await pool?.end();
  vi.unstubAllEnvs();
});
it('atomically creates exactly one consistent Owner and audit, rolling back either failed write', async () => {
  const owner = await account(pool);
  const workspace = await workspaces.create(owner.id, 'Atomic workspace');
  expect(
    (
      await pool.query(
        'SELECT user_id,role FROM workspace_members WHERE workspace_id=$1',
        [workspace.id],
      )
    ).rows,
  ).toEqual([{ user_id: owner.id, role: 'OWNER' }]);
  expect(
    (
      await pool.query(
        'SELECT actor_id FROM audit_events WHERE workspace_id=$1',
        [workspace.id],
      )
    ).rows,
  ).toEqual([{ actor_id: owner.id }]);
  const other = await account(pool);
  await expect(
    pool.query(
      "INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'OWNER')",
      [workspace.id, other.id],
    ),
  ).rejects.toMatchObject({ code: '23505' });
  const repository = module.get(WorkspacesRepository);
  const original = repository.create.bind(repository);
  vi.spyOn(repository, 'create').mockImplementationOnce(async (...args) => {
    await original(...args);
    throw new Error('Injected member failure');
  });
  await expect(workspaces.create(owner.id, 'Failed member')).rejects.toThrow(
    'Injected',
  );
  vi.spyOn(module.get(AuditWriter), 'write').mockRejectedValueOnce(
    new Error('Injected audit failure'),
  );
  await expect(workspaces.create(owner.id, 'Failed audit')).rejects.toThrow(
    'Injected',
  );
  expect(
    (
      await pool.query('SELECT id FROM workspaces WHERE owner_id=$1', [
        owner.id,
      ])
    ).rows,
  ).toHaveLength(1);
});
it('keeps membership, project and client replacement atomic when auditing fails', async () => {
  const f = await domain(pool, workspaces, projects);
  const audit = module.get(AuditWriter);
  vi.spyOn(audit, 'write').mockRejectedValueOnce(
    new Error('audit unavailable'),
  );
  await expect(
    workspaces.add(f.owner.id, f.workspace.id, f.developer.email),
  ).rejects.toThrow();
  expect(
    (
      await pool.query('SELECT id FROM workspace_members WHERE user_id=$1', [
        f.developer.id,
      ])
    ).rowCount,
  ).toBe(0);
  vi.spyOn(audit, 'write').mockRejectedValueOnce(
    new Error('audit unavailable'),
  );
  await expect(
    projects.create(f.owner.id, {
      workspaceId: f.workspace.id,
      name: 'Failed',
      baselineScope: 'Fixed',
    }),
  ).rejects.toThrow();
  expect(
    (
      await pool.query('SELECT id FROM projects WHERE workspace_id=$1', [
        f.workspace.id,
      ])
    ).rowCount,
  ).toBe(1);
  await workspaces.add(f.owner.id, f.workspace.id, f.developer.email);
  vi.spyOn(audit, 'write').mockRejectedValueOnce(
    new Error('audit unavailable'),
  );
  await expect(
    projects.add(f.owner.id, f.project.id, f.developer.id),
  ).rejects.toThrow();
  expect(
    (
      await pool.query('SELECT id FROM project_members WHERE project_id=$1', [
        f.project.id,
      ])
    ).rowCount,
  ).toBe(0);
  await projects.bindClient(f.owner.id, f.project.id, f.client.email);
  vi.spyOn(audit, 'write').mockRejectedValueOnce(
    new Error('audit unavailable'),
  );
  await expect(
    projects.bindClient(f.owner.id, f.project.id, f.outsider.email),
  ).rejects.toThrow();
  expect(
    (
      await pool.query(
        'SELECT user_id FROM project_members WHERE project_id=$1',
        [f.project.id],
      )
    ).rows,
  ).toEqual([{ user_id: f.client.id }]);
});
it.each(['supplier-first', 'client-first'] as const)(
  'serializes reverse role-conflict race: %s',
  async (order) => {
    const f = await domain(pool, workspaces, projects);
    const entered = signal(),
      release = signal();
    const audit = module.get(AuditWriter),
      original = audit.write.bind(audit);
    vi.spyOn(audit, 'write').mockImplementationOnce(async (...args) => {
      entered.resolve();
      await release.promise;
      await original(...args);
    });
    const add = () =>
      workspaces.add(f.owner.id, f.workspace.id, f.client.email);
    const bind = () =>
      projects.bindClient(f.owner.id, f.project.id, f.client.email);
    const first = order === 'supplier-first' ? add() : bind();
    await entered.promise;
    const second = (order === 'supplier-first' ? bind() : add()).then(
      () => null,
      (error) => error,
    );
    try {
      await waitForLock(pool);
    } finally {
      release.resolve();
    }
    await first;
    expect((await second).getResponse()).toMatchObject({
      code: 'ROLE_CONFLICT',
    });
    const count = await pool.query(
      `SELECT (SELECT count(*) FROM workspace_members WHERE workspace_id=$1 AND user_id=$3)::int + (SELECT count(*) FROM project_members WHERE project_id=$2 AND user_id=$3)::int AS total`,
      [f.workspace.id, f.project.id, f.client.id],
    );
    expect(count.rows[0].total).toBe(1);
  },
);
it('serializes distinct Client replacements and deduplicates identical assignments and audits', async () => {
  const f = await domain(pool, workspaces, projects);
  await Promise.all([
    workspaces.add(f.owner.id, f.workspace.id, f.developer.email),
    workspaces.add(f.owner.id, f.workspace.id, f.developer.email),
  ]);
  await Promise.all([
    projects.add(f.owner.id, f.project.id, f.developer.id),
    projects.add(f.owner.id, f.project.id, f.developer.id),
  ]);
  await Promise.all([
    projects.bindClient(f.owner.id, f.project.id, f.client.email),
    projects.bindClient(f.owner.id, f.project.id, f.client.email),
  ]);
  const entered = signal(),
    release = signal();
  const repo = module.get(ProjectsRepository),
    original = repo.replaceClient.bind(repo);
  vi.spyOn(repo, 'replaceClient').mockImplementationOnce(async (...args) => {
    await original(...args);
    entered.resolve();
    await release.promise;
  });
  const first = projects.bindClient(f.owner.id, f.project.id, f.outsider.email);
  await entered.promise;
  const second = projects.bindClient(f.owner.id, f.project.id, f.client.email);
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  await Promise.all([first, second]);
  expect(
    (
      await pool.query(
        "SELECT user_id FROM project_members WHERE project_id=$1 AND role='CLIENT'",
        [f.project.id],
      )
    ).rows,
  ).toEqual([{ user_id: f.client.id }]);
  const events = (
    await pool.query(
      'SELECT event_type,count(*)::int AS n FROM audit_events WHERE workspace_id=$1 GROUP BY event_type',
      [f.workspace.id],
    )
  ).rows;
  expect(events).toEqual(
    expect.arrayContaining([
      { event_type: 'workspace.developer_added', n: 1 },
      { event_type: 'project.developer_added', n: 1 },
      { event_type: 'project.client_bound', n: 1 },
      { event_type: 'project.client_replaced', n: 2 },
    ]),
  );
});
it('checks immutable submission history, even when CR is Draft again or has no active pointer', async () => {
  const f = await domain(pool, workspaces, projects);
  await projects.bindClient(f.owner.id, f.project.id, f.client.email);
  const history = await submittedHistory(pool, f.project.id, f.owner.id);
  for (const status of ['REJECTED', 'DRAFT', 'APPROVED']) {
    await pool.query('UPDATE change_requests SET status=$1 WHERE id=$2', [
      status,
      history.change,
    ]);
    await expect(
      projects.bindClient(f.owner.id, f.project.id, f.outsider.email),
    ).rejects.toMatchObject({ response: { code: 'CLIENT_ASSIGNMENT_LOCKED' } });
    expect(
      (await projects.bindClient(f.owner.id, f.project.id, f.client.email))
        .userId,
    ).toBe(f.client.id);
  }
  expect(
    (await projects.detail(f.client.id, f.project.id)).clientAssignmentLocked,
  ).toBe(true);
});
it.each(['history-first', 'binding-first'] as const)(
  'coordinates the future Submit project lock protocol: %s',
  async (order) => {
    const f = await domain(pool, workspaces, projects);
    await projects.bindClient(f.owner.id, f.project.id, f.client.email);
    const connection = await pool.connect();
    const entered = signal(),
      release = signal();
    try {
      if (order === 'history-first') {
        await connection.query('BEGIN');
        await connection.query(
          'SELECT id FROM projects WHERE id=$1 FOR UPDATE',
          [f.project.id],
        );
        await submittedHistory(connection, f.project.id, f.owner.id);
        const binding = projects
          .bindClient(f.owner.id, f.project.id, f.outsider.email)
          .then(
            () => null,
            (error) => error,
          );
        await waitForLock(pool);
        await connection.query('COMMIT');
        expect((await binding).getResponse()).toMatchObject({
          code: 'CLIENT_ASSIGNMENT_LOCKED',
        });
      } else {
        const repo = module.get(ProjectsRepository),
          original = repo.replaceClient.bind(repo);
        vi.spyOn(repo, 'replaceClient').mockImplementationOnce(
          async (...args) => {
            await original(...args);
            entered.resolve();
            await release.promise;
          },
        );
        const binding = projects.bindClient(
          f.owner.id,
          f.project.id,
          f.outsider.email,
        );
        await entered.promise;
        await connection.query('BEGIN');
        const lock = connection.query(
          'SELECT id FROM projects WHERE id=$1 FOR UPDATE',
          [f.project.id],
        );
        try {
          await waitForLock(pool);
        } finally {
          release.resolve();
        }
        await binding;
        await lock;
        expect(
          (
            await connection.query(
              "SELECT user_id FROM project_members WHERE project_id=$1 AND role='CLIENT'",
              [f.project.id],
            )
          ).rows[0].user_id,
        ).toBe(f.outsider.id);
        await submittedHistory(connection, f.project.id, f.owner.id);
        await connection.query('COMMIT');
        await expect(
          projects.bindClient(f.owner.id, f.project.id, f.client.email),
        ).rejects.toMatchObject({
          response: { code: 'CLIENT_ASSIGNMENT_LOCKED' },
        });
      }
    } finally {
      release.resolve();
      await connection.query('ROLLBACK');
      connection.release();
    }
  },
);
it('fails closed for inconsistent owner or supplier/client data and preserves baseline', async () => {
  const f = await domain(pool, workspaces, projects);
  await expect(
    pool.query('UPDATE projects SET baseline_scope=$1 WHERE id=$2', [
      'Overwritten',
      f.project.id,
    ]),
  ).rejects.toMatchObject({ code: '23514' });
  await pool.query(
    "INSERT INTO project_members(project_id,user_id,role) VALUES($1,$2,'CLIENT')",
    [f.project.id, f.owner.id],
  );
  await expect(projects.detail(f.owner.id, f.project.id)).rejects.toMatchObject(
    { status: 404 },
  );
  expect(await projects.list(f.owner.id, { limit: 20, offset: 0 })).toEqual([]);
  await pool.query('UPDATE workspaces SET owner_id=$1 WHERE id=$2', [
    f.outsider.id,
    f.workspace.id,
  ]);
  await expect(
    workspaces.members(f.owner.id, f.workspace.id, { limit: 20, offset: 0 }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    projects.detail(f.outsider.id, f.project.id),
  ).rejects.toMatchObject({ status: 404 });
});
