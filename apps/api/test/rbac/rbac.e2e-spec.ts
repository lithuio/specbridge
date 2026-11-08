import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import { ProjectsService } from '../../src/projects/projects.service.js';
import { openTestDatabase } from '../database/helpers.js';
import { account, domain, submittedHistory } from './helpers.js';
let pool: Pool,
  app: INestApplication,
  server: Server,
  workspaces: WorkspacesService,
  projects: ProjectsService;
const headers = {
  Origin: 'http://localhost:3000',
  'X-CSRF-Protection': '1',
  'Sec-Fetch-Site': 'same-origin',
};
type User = Awaited<ReturnType<typeof account>>;
const get = (path: string, user: User) =>
  request(server).get(`/api/v1${path}`).set('Cookie', user.cookie);
const post = (path: string, user: User, body: object) =>
  request(server)
    .post(`/api/v1${path}`)
    .set(headers)
    .set('Cookie', user.cookie)
    .send(body);
const put = (path: string, user: User, body: object) =>
  request(server)
    .put(`/api/v1${path}`)
    .set(headers)
    .set('Cookie', user.cookie)
    .send(body);
beforeAll(async () => {
  pool = await openTestDatabase();
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', headers.Origin);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('OBSERVE_APP_KEY', '');
  vi.stubEnv('OBSERVE_APP_SECRET', '');
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = module.createNestApplication();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer() as Server;
  workspaces = app.get(WorkspacesService);
  projects = app.get(ProjectsService);
});
afterAll(async () => {
  await app?.close();
  await pool?.end();
  vi.unstubAllEnvs();
});
it('AC-03/04: creates workspace/project, registered memberships and safe responses through HTTP', async () => {
  const owner = await account(pool),
    developer = await account(pool),
    client = await account(pool);
  const ws = (
    await post('/workspaces', owner, { name: '  Team  ' }).expect(201)
  ).body.data;
  expect(ws).toMatchObject({ name: 'Team', workspaceRole: 'OWNER' });
  const path = `/workspaces/${ws.id}/members`;
  await post(path, owner, {
    email: ` ${developer.email.toUpperCase()} `,
  }).expect(201);
  await post(path, owner, { email: developer.email }).expect(200);
  const members = (await get(path, owner).expect(200)).body.data;
  expect(members).toHaveLength(2);
  expect(JSON.stringify(members)).not.toMatch(
    /passwordHash|tokenHash|sessionId/,
  );
  const p = (
    await post('/projects', owner, {
      workspaceId: ws.id,
      name: 'App',
      baselineScope: 'Fixed scope',
    }).expect(201)
  ).body.data;
  expect(
    (await get(`/projects/${p.id}`, owner).expect(200)).body.data.members,
  ).toEqual([]);
  await post(`/projects/${p.id}/members`, owner, {
    userId: developer.id,
    role: 'DEVELOPER',
  }).expect(201);
  await put(`/projects/${p.id}/client`, owner, { email: client.email }).expect(
    200,
  );
  const detail = await get(`/projects/${p.id}`, client).expect(200);
  expect(detail.headers['cache-control']).toBe('no-store');
  expect(detail.body.data).toMatchObject({
    baselineScope: 'Fixed scope',
    projectRole: 'CLIENT',
    clientAssignmentLocked: false,
  });
  expect(JSON.stringify(detail.body)).not.toContain('@example.test');
  expect((await get('/workspaces', client).expect(200)).body.data).toEqual([]);
  expect(
    (await get('/projects', client).expect(200)).body.data.map(
      (p: { id: string }) => p.id,
    ),
  ).toEqual([p.id]);
  const me = (await get('/me', owner).expect(200)).body.data;
  expect(Object.keys(me)).toEqual(['user']);
  expect(Object.keys(me.user).sort()).toEqual([
    'createdAt',
    'displayName',
    'email',
    'id',
  ]);
});
it('AC-05/16: enforces cross-workspace and cross-project authorization on every sensitive endpoint', async () => {
  const a = await domain(pool, workspaces, projects),
    b = await domain(pool, workspaces, projects);
  const unassigned = await projects.create(a.owner.id, {
    workspaceId: a.workspace.id,
    name: 'Hidden',
    baselineScope: 'Fixed',
  });
  await workspaces.add(a.owner.id, a.workspace.id, a.developer.email);
  await projects.add(a.owner.id, a.project.id, a.developer.id);
  await projects.bindClient(a.owner.id, a.project.id, a.client.email);
  for (const user of [a.developer, a.client]) {
    await get(`/projects/${a.project.id}`, user).expect(200);
    await get(`/projects/${unassigned.id}`, user).expect(404);
    await get(`/projects/${b.project.id}`, user).expect(404);
    await post(`/projects/${a.project.id}/members`, user, {
      userId: a.outsider.id,
      role: 'DEVELOPER',
    }).expect(403);
    await put(`/projects/${a.project.id}/client`, user, {
      email: a.outsider.email,
    }).expect(403);
    for (const id of [unassigned.id, b.project.id, randomUUID()]) {
      await post(`/projects/${id}/members`, user, {
        userId: a.outsider.id,
        role: 'DEVELOPER',
      }).expect(404);
      await put(`/projects/${id}/client`, user, {
        email: a.outsider.email,
      }).expect(404);
    }
    const ownStatus = user === a.developer ? 403 : 404;
    await get(`/workspaces/${a.workspace.id}/members`, user).expect(ownStatus);
    await post(`/workspaces/${a.workspace.id}/members`, user, {
      email: a.outsider.email,
    }).expect(ownStatus);
    await post('/projects', user, {
      workspaceId: a.workspace.id,
      name: 'No',
      baselineScope: 'No',
    }).expect(ownStatus);
    await get(`/workspaces/${b.workspace.id}/members`, user).expect(404);
    await post(`/workspaces/${b.workspace.id}/members`, user, {
      email: a.outsider.email,
    }).expect(404);
    await post('/projects', user, {
      workspaceId: b.workspace.id,
      name: 'No',
      baselineScope: 'No',
    }).expect(404);
  }
  await get(`/projects/${b.project.id}`, a.owner).expect(404);
  await put(`/projects/${b.project.id}/client`, a.owner, {
    email: a.client.email,
  }).expect(404);
  await post(`/projects/${b.project.id}/members`, a.owner, {
    userId: a.developer.id,
    role: 'DEVELOPER',
  }).expect(404);
  for (const user of [a.outsider, b.owner]) {
    await get(`/projects/${a.project.id}`, user).expect(404);
    await get(`/workspaces/${a.workspace.id}/members`, user).expect(404);
  }
  expect(
    (
      await pool.query(
        'SELECT count(*)::int AS n FROM projects WHERE workspace_id=$1',
        [a.workspace.id],
      )
    ).rows[0].n,
  ).toBe(2);
});
it('filters lists before pagination and applies optional workspace filters without existence leaks', async () => {
  const f = await domain(pool, workspaces, projects);
  await workspaces.add(f.owner.id, f.workspace.id, f.developer.email);
  const visibleIds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const p = await projects.create(f.owner.id, {
      workspaceId: f.workspace.id,
      name: `P${i}`,
      baselineScope: 'Fixed',
    });
    if (i % 2) {
      await projects.add(f.owner.id, p.id, f.developer.id);
      await projects.bindClient(f.owner.id, p.id, f.client.email);
      visibleIds.push(p.id);
    }
  }
  for (const user of [f.developer, f.client]) {
    const first = (await get('/projects?limit=1&offset=0', user).expect(200))
      .body;
    const second = (
      await get(
        `/projects?workspaceId=${f.workspace.id}&limit=1&offset=1`,
        user,
      ).expect(200)
    ).body;
    expect([first.data[0].id, second.data[0].id]).toEqual(visibleIds);
    expect(first.meta.hasMore).toBe(true);
    expect(second.meta.hasMore).toBe(false);
    expect(
      (await get(`/projects?workspaceId=${randomUUID()}`, user).expect(200))
        .body.data,
    ).toEqual([]);
  }
  expect(
    (await get(`/projects?workspaceId=${f.workspace.id}`, f.owner).expect(200))
      .body.data,
  ).toHaveLength(5);
  expect(
    (
      await get(`/projects?workspaceId=${f.workspace.id}`, f.outsider).expect(
        200,
      )
    ).body.data,
  ).toEqual([]);
});
it('AC-23: rejects both directions of role conflicts, unknown emails and foreign developers', async () => {
  const f = await domain(pool, workspaces, projects),
    b = await domain(pool, workspaces, projects);
  await workspaces.add(f.owner.id, f.workspace.id, f.developer.email);
  const clientPath = `/projects/${f.project.id}/client`,
    membersPath = `/workspaces/${f.workspace.id}/members`;
  for (const target of [f.owner, f.developer])
    expect(
      (await put(clientPath, f.owner, { email: target.email }).expect(422)).body
        .error.code,
    ).toBe('ROLE_CONFLICT');
  await put(clientPath, f.owner, { email: f.client.email }).expect(200);
  expect(
    (await post(membersPath, f.owner, { email: f.client.email }).expect(422))
      .body.error.code,
  ).toBe('ROLE_CONFLICT');
  expect(
    (await post(membersPath, f.owner, { email: f.owner.email }).expect(422))
      .body.error.code,
  ).toBe('ROLE_CONFLICT');
  for (const path of [clientPath, membersPath]) {
    const response =
      path === clientPath
        ? await put(path, f.owner, { email: `${randomUUID()}@example.test` })
        : await post(path, f.owner, { email: `${randomUUID()}@example.test` });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('USER_NOT_REGISTERED');
  }
  await workspaces.add(b.owner.id, b.workspace.id, b.developer.email);
  expect(
    (
      await post(`/projects/${f.project.id}/members`, f.owner, {
        userId: b.developer.id,
        role: 'DEVELOPER',
      }).expect(422)
    ).body.error.code,
  ).toBe('WORKSPACE_DEVELOPER_REQUIRED');
  await post(`/projects/${f.project.id}/members`, f.owner, {
    userId: f.owner.id,
    role: 'DEVELOPER',
  }).expect(422);
  // A supplier of a different workspace is a valid Client here.
  await put(clientPath, f.owner, { email: b.developer.email }).expect(200);
  await get(`/projects/${f.project.id}`, f.client).expect(404);
  await get(`/projects/${f.project.id}`, b.developer).expect(200);
});
it('AC-24: locks Client after any historical Version but allows same-user retry', async () => {
  const f = await domain(pool, workspaces, projects);
  await projects.bindClient(f.owner.id, f.project.id, f.client.email);
  await submittedHistory(pool, f.project.id, f.owner.id);
  const before = (
    await pool.query(
      'SELECT count(*)::int AS n FROM audit_events WHERE project_id=$1',
      [f.project.id],
    )
  ).rows[0].n;
  expect(
    (
      await put(`/projects/${f.project.id}/client`, f.owner, {
        email: f.outsider.email,
      }).expect(409)
    ).body.error.code,
  ).toBe('CLIENT_ASSIGNMENT_LOCKED');
  await put(`/projects/${f.project.id}/client`, f.owner, {
    email: f.client.email,
  }).expect(200);
  expect(
    (
      await pool.query(
        'SELECT count(*)::int AS n FROM audit_events WHERE project_id=$1',
        [f.project.id],
      )
    ).rows[0].n,
  ).toBe(before);
});
it('deduplicates concurrent HTTP member assignment and Client binding', async () => {
  const f = await domain(pool, workspaces, projects);
  const add = await Promise.all([
    post(`/workspaces/${f.workspace.id}/members`, f.owner, {
      email: f.developer.email,
    }),
    post(`/workspaces/${f.workspace.id}/members`, f.owner, {
      email: f.developer.email,
    }),
  ]);
  expect(add.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 201]);
  const assign = await Promise.all([
    post(`/projects/${f.project.id}/members`, f.owner, {
      userId: f.developer.id,
      role: 'DEVELOPER',
    }),
    post(`/projects/${f.project.id}/members`, f.owner, {
      userId: f.developer.id,
      role: 'DEVELOPER',
    }),
  ]);
  expect(assign.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 201]);
  const bind = await Promise.all([
    put(`/projects/${f.project.id}/client`, f.owner, { email: f.client.email }),
    put(`/projects/${f.project.id}/client`, f.owner, { email: f.client.email }),
  ]);
  expect(bind.map((r) => r.status)).toEqual([200, 200]);
  expect(
    (
      await pool.query(
        "SELECT id FROM audit_events WHERE project_id=$1 AND event_type='project.client_bound'",
        [f.project.id],
      )
    ).rowCount,
  ).toBe(1);
});
it('AC-26: validates strict DTOs and offers no baseline update or ownership transfer route', async () => {
  const f = await domain(pool, workspaces, projects);
  for (const baselineScope of ['', ' \n ', 'x'.repeat(20001), null])
    await post('/projects', f.owner, {
      workspaceId: f.workspace.id,
      name: 'Bad',
      baselineScope,
    }).expect(400);
  await post('/workspaces', f.owner, {
    name: 'Bad',
    ownerId: f.outsider.id,
  }).expect(400);
  await post('/projects', f.owner, {
    workspaceId: f.workspace.id,
    name: 'Bad',
    baselineScope: 'Fixed',
    status: 'ARCHIVED',
  }).expect(400);
  await post(`/projects/${f.project.id}/members`, f.owner, {
    userId: f.client.id,
    role: 'CLIENT',
  }).expect(400);
  await post(`/workspaces/${f.workspace.id}/members`, f.owner, {
    email: f.developer.email,
    role: 'OWNER',
  }).expect(400);
  for (const query of [
    'limit=0',
    'limit=101',
    'offset=-1',
    'offset=1.5',
    'limit[]=2',
    'role=OWNER',
    'workspaceId=bad',
  ])
    await get(`/projects?${query}`, f.owner).expect(400);
  await get('/projects/not-a-uuid', f.owner).expect(400);
  await request(server)
    .patch(`/api/v1/projects/${f.project.id}`)
    .set(headers)
    .set('Cookie', f.owner.cookie)
    .send({ baselineScope: 'Changed' })
    .expect(404);
  expect(
    (await get(`/projects/${f.project.id}`, f.owner).expect(200)).body.data
      .baselineScope,
  ).toBe('Initial reference');
});
it('preserves default Session/CSRF protections on new endpoints and ignores forged identity headers', async () => {
  const f = await domain(pool, workspaces, projects);
  for (const path of [
    '/workspaces',
    '/projects',
    `/projects/${f.project.id}`,
    `/workspaces/${f.workspace.id}/members`,
  ])
    await request(server).get(`/api/v1${path}`).expect(401);
  await request(server)
    .post('/api/v1/workspaces')
    .set(headers)
    .send({ name: 'No auth' })
    .expect(401);
  await request(server)
    .post('/api/v1/workspaces')
    .set('Cookie', f.owner.cookie)
    .send({ name: 'No csrf' })
    .expect(403);
  await request(server)
    .get(`/api/v1/projects/${f.project.id}`)
    .set('Cookie', f.outsider.cookie)
    .set('X-User-Id', f.owner.id)
    .set('X-Forwarded-For', '127.0.0.1')
    .expect(404);
  await pool.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1', [
    f.owner.id,
  ]);
  await get('/projects', f.owner).expect(401);
});

it.each(['upper', 'lower', 'mixed'] as const)(
  'UUID casing: %s first HTTP assignment and retries preserve complete data and idempotency',
  async (firstCase) => {
    const f = await domain(pool, workspaces, projects);
    const targetId = `ab${randomUUID().slice(2)}`;
    const email = `${targetId}@example.test`;
    await pool.query(
      'INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)',
      [targetId, email, 'Case Developer', 'fixture-not-for-login'],
    );
    await workspaces.add(f.owner.id, f.workspace.id, email);
    const variants = {
      upper: targetId.toUpperCase(),
      lower: targetId,
      mixed: `aB${targetId.slice(2)}`,
    };
    for (const [index, userId] of [
      variants[firstCase],
      variants.lower,
      variants.mixed,
      variants.upper,
    ].entries()) {
      const response = await post(
        `/projects/${f.project.id.toUpperCase()}/members`,
        f.owner,
        { userId, role: 'DEVELOPER' },
      ).expect(index === 0 ? 201 : 200);
      expect
        .soft(response.body.data)
        .toEqual({
          userId: targetId,
          displayName: 'Case Developer',
          role: 'DEVELOPER',
        });
      expect(response.body.meta.requestId).toEqual(expect.any(String));
      expect(
        (
          await pool.query(
            'SELECT user_id,role FROM project_members WHERE project_id=$1',
            [f.project.id],
          )
        ).rows,
      ).toEqual([{ user_id: targetId, role: 'DEVELOPER' }]);
      expect(
        (
          await pool.query(
            "SELECT id FROM audit_events WHERE project_id=$1 AND event_type='project.developer_added'",
            [f.project.id],
          )
        ).rowCount,
      ).toBe(1);
    }
  },
);

it('UUID casing does not relax missing-member, authorization or validation failures', async () => {
  const f = await domain(pool, workspaces, projects);
  const path = `/projects/${f.project.id.toUpperCase()}/members`;
  const body = { userId: f.developer.id.toUpperCase(), role: 'DEVELOPER' };
  for (const userId of [randomUUID().toUpperCase(), body.userId]) {
    expect(
      (await post(path, f.owner, { ...body, userId }).expect(422)).body.error
        .code,
    ).toBe('WORKSPACE_DEVELOPER_REQUIRED');
  }
  await workspaces.add(f.owner.id, f.workspace.id, f.developer.email);
  await projects.bindClient(f.owner.id, f.project.id, f.client.email);
  await post(path, f.client, body).expect(403);
  await post(path, f.outsider, body).expect(404);
  await post(path, f.owner, { ...body, userId: 'INVALID-UUID' }).expect(400);
  expect(
    (
      await pool.query(
        "SELECT id FROM project_members WHERE project_id=$1 AND role='DEVELOPER'",
        [f.project.id],
      )
    ).rowCount,
  ).toBe(0);
  expect(
    (
      await pool.query(
        "SELECT id FROM audit_events WHERE project_id=$1 AND event_type='project.developer_added'",
        [f.project.id],
      )
    ).rowCount,
  ).toBe(0);
});
