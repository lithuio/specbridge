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
import { account, domain } from '../rbac/helpers.js';
let pool: Pool,
  app: INestApplication,
  server: Server,
  workspaces: WorkspacesService,
  projects: ProjectsService;
type User = Awaited<ReturnType<typeof account>>;
const headers = {
  Origin: 'http://localhost:3000',
  'X-CSRF-Protection': '1',
  'Sec-Fetch-Site': 'same-origin',
};
const spec = {
  content: 'Frozen text',
  acceptanceCriteria: ['Observable outcome'],
};
const call = (
  method: 'get' | 'post' | 'patch',
  path: string,
  user: User,
  body?: object,
) => {
  const req = request(server)
    [method](`/api/v1${path}`)
    .set(headers)
    .set('Cookie', user.cookie);
  return body === undefined ? req : req.send(body);
};
const get = (path: string, user: User) => call('get', path, user);
const post = (path: string, user: User, body: object) =>
  call('post', path, user, body);
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
async function setup() {
  const f = await domain(pool, workspaces, projects);
  await workspaces.add(f.owner.id, f.workspace.id, f.developer.email);
  await projects.add(f.owner.id, f.project.id, f.developer.id);
  await projects.bindClient(f.owner.id, f.project.id, f.client.email);
  return f;
}
async function create(projectId: string, user: User) {
  return (
    await post(`/projects/${projectId}/requirements`, user, {
      title: ' Title ',
      originalText: ' Original ',
    }).expect(201)
  ).body.data;
}
it('AC-06/07/08: Client draft, Developer question/revision, Client answer, Ready and immutable history', async () => {
  const f = await setup(),
    row = await create(f.project.id, f.client),
    path = `/requirements/${row.id}`;
  expect(row).toMatchObject({
    createdBy: f.client.id,
    projectId: f.project.id,
    draftVersion: 1,
    status: 'DRAFT',
    title: 'Title',
    originalText: 'Original',
  });
  const edit = await call('patch', path, f.client, {
    expectedVersion: 1,
    title: 'Edited',
  }).expect(200);
  expect(edit.body.data.draftVersion).toBe(2);
  expect(
    (
      await call('patch', path, f.client, {
        expectedVersion: 1,
        title: 'Stale',
      }).expect(409)
    ).body.error.code,
  ).toBe('STALE_VERSION');
  const q = (
    await post(`${path}/clarifications`, f.developer, {
      expectedVersion: 2,
      kind: 'QUESTION',
      body: 'Rule?',
    }).expect(201)
  ).body.data;
  expect(q).toMatchObject({
    status: 'CLARIFYING',
    draftVersion: 3,
    requirementId: row.id,
  });
  const r1 = (
    await post(`${path}/revisions`, f.developer, {
      expectedVersion: 3,
      ...spec,
    }).expect(201)
  ).body.data;
  await post(`${path}/mark-ready`, f.developer, { expectedVersion: 4 }).expect(
    422,
  );
  const answer = (
    await post(`${path}/clarifications`, f.client, {
      expectedVersion: 4,
      kind: 'ANSWER',
      parentId: q.id,
      body: 'Rule explained',
    }).expect(201)
  ).body.data;
  expect(answer.parentId).toBe(q.id);
  await post(`${path}/mark-ready`, f.developer, { expectedVersion: 4 }).expect(
    409,
  );
  expect(
    (
      await post(`${path}/mark-ready`, f.developer, {
        expectedVersion: 5,
      }).expect(200)
    ).body.data,
  ).toMatchObject({ status: 'READY', draftVersion: 6 });
  for (const action of [
    post(`${path}/mark-ready`, f.owner, { expectedVersion: 6 }),
    post(`${path}/clarifications`, f.client, {
      expectedVersion: 6,
      kind: 'QUESTION',
      body: 'New?',
    }),
    post(`${path}/clarifications`, f.client, {
      expectedVersion: 6,
      kind: 'ANSWER',
      parentId: q.id,
      body: 'New answer',
    }),
  ])
    expect((await action.expect(409)).body.error.code).toBe(
      'INVALID_TRANSITION',
    );
  const r2 = (
    await post(`${path}/revisions`, f.owner, {
      expectedVersion: 6,
      ...spec,
      content: 'New frozen text',
    }).expect(201)
  ).body.data;
  expect(r2).toMatchObject({
    revisionNo: 2,
    status: 'CLARIFYING',
    draftVersion: 7,
  });
  const history = (await get(`${path}/revisions?limit=1`, f.client).expect(200))
    .body;
  expect(history.data[0].id).toBe(r2.id);
  expect(history.meta.hasMore).toBe(true);
  expect(
    (await get(`${path}/revisions?offset=1`, f.client).expect(200)).body
      .data[0],
  ).toMatchObject({ id: r1.id, content: spec.content });
  const detail = await get(path, f.client).expect(200);
  expect(detail.headers['cache-control']).toBe('no-store');
  expect(detail.body.meta.requestId).toEqual(expect.any(String));
  expect(detail.body.data.clarifications).toHaveLength(2);
  expect(detail.body.data.latestRevision.id).toBe(r2.id);
  expect(JSON.stringify(detail.body)).not.toMatch(
    /passwordHash|tokenHash|email|sessionId/,
  );
  await call('patch', `${path}/revisions/${r1.id}`, f.owner, {
    content: 'overwrite',
  }).expect(404);
});
it('enforces the complete role matrix and author restrictions', async () => {
  const f = await setup();
  for (const author of [f.owner, f.developer, f.client]) {
    const row = await create(f.project.id, author),
      path = `/requirements/${row.id}`;
    for (const user of [f.owner, f.developer, f.client]) {
      await get(path, user).expect(200);
      await get(`${path}/revisions`, user).expect(200);
      await get(`/projects/${f.project.id}/requirements`, user).expect(200);
      const current = (await get(path, user)).body.data.draftVersion;
      await call('patch', path, user, {
        expectedVersion: current,
        title: 'Updated',
      }).expect(user === f.owner || user === author ? 200 : 403);
    }
    let version = (await get(path, author)).body.data.draftVersion;
    await post(`${path}/revisions`, f.client, {
      expectedVersion: version,
      ...spec,
    }).expect(403);
    await post(`${path}/mark-ready`, f.client, {
      expectedVersion: version,
    }).expect(403);
    await post(`${path}/mark-ready`, f.owner, {
      expectedVersion: version,
    }).expect(422);
    for (const user of [f.owner, f.developer, f.client]) {
      const q = (
        await post(`${path}/clarifications`, user, {
          expectedVersion: version++,
          kind: 'QUESTION',
          body: 'Question',
        }).expect(201)
      ).body.data;
      await post(`${path}/clarifications`, user, {
        expectedVersion: version++,
        kind: 'ANSWER',
        parentId: q.id,
        body: 'Answer',
      }).expect(201);
    }
    await call('patch', path, author, {
      expectedVersion: version,
      title: 'Too late',
    }).expect(409);
    await post(`${path}/revisions`, f.owner, {
      expectedVersion: version++,
      ...spec,
      acceptanceCriteria: [],
    }).expect(201);
    await post(`${path}/mark-ready`, f.owner, {
      expectedVersion: version,
    }).expect(422);
    await post(`${path}/revisions`, f.developer, {
      expectedVersion: version++,
      ...spec,
    }).expect(201);
    await post(`${path}/mark-ready`, f.owner, {
      expectedVersion: version,
    }).expect(200);
  }
});
it('returns 404 on all eight endpoints for invisible and nonexistent resources', async () => {
  const f = await setup(),
    foreign = await setup();
  const sibling = await projects.create(f.owner.id, {
    workspaceId: f.workspace.id,
    name: 'Hidden sibling',
    baselineScope: 'Fixed',
  });
  const local = await create(f.project.id, f.client),
    other = await create(foreign.project.id, foreign.owner),
    sib = await create(sibling.id, f.owner);
  for (const [user, projectId, id] of [
    [f.outsider, f.project.id, local.id],
    [foreign.owner, f.project.id, local.id],
    [f.client, sibling.id, sib.id],
    [f.developer, sibling.id, sib.id],
    [f.owner, foreign.project.id, other.id],
    [f.client, foreign.project.id, other.id],
    [f.developer, foreign.project.id, other.id],
    [f.owner, randomUUID(), randomUUID()],
  ] as const) {
    await get(`/projects/${projectId}/requirements`, user).expect(404);
    await post(`/projects/${projectId}/requirements`, user, {
      title: 'No',
      originalText: 'No',
    }).expect(404);
    const path = `/requirements/${id}`;
    await get(path, user).expect(404);
    await get(`${path}/revisions`, user).expect(404);
    await call('patch', path, user, { expectedVersion: 1, title: 'No' }).expect(
      404,
    );
    await post(`${path}/clarifications`, user, {
      expectedVersion: 1,
      kind: 'QUESTION',
      body: 'No',
    }).expect(404);
    await post(`${path}/revisions`, user, {
      expectedVersion: 1,
      ...spec,
    }).expect(404);
    await post(`${path}/mark-ready`, user, { expectedVersion: 1 }).expect(404);
  }
});
it('rejects invalid answer parents without leaking other Requirement data', async () => {
  const f = await setup(),
    foreign = await setup();
  const row = await create(f.project.id, f.client),
    other = await create(f.project.id, f.owner),
    hidden = await create(foreign.project.id, foreign.owner);
  const path = `/requirements/${row.id}`;
  const q = (
    await post(`${path}/clarifications`, f.owner, {
      expectedVersion: 1,
      kind: 'QUESTION',
      body: 'Q',
    }).expect(201)
  ).body.data;
  const a = (
    await post(`${path}/clarifications`, f.client, {
      expectedVersion: 2,
      kind: 'ANSWER',
      parentId: q.id,
      body: 'A',
    }).expect(201)
  ).body.data;
  const otherQ = (
    await post(`/requirements/${other.id}/clarifications`, f.owner, {
      expectedVersion: 1,
      kind: 'QUESTION',
      body: 'Other Q',
    }).expect(201)
  ).body.data;
  const hiddenQ = (
    await post(`/requirements/${hidden.id}/clarifications`, foreign.owner, {
      expectedVersion: 1,
      kind: 'QUESTION',
      body: 'Secret Q',
    }).expect(201)
  ).body.data;
  for (const parentId of [
    undefined,
    null,
    randomUUID(),
    a.id,
    otherQ.id,
    hiddenQ.id,
  ]) {
    const res = await post(`${path}/clarifications`, f.client, {
      expectedVersion: 3,
      kind: 'ANSWER',
      parentId,
      body: 'Illegal',
    }).expect(422);
    expect(res.body.error).toMatchObject({
      code: 'BUSINESS_RULE_VIOLATION',
      details: [],
    });
    expect(JSON.stringify(res.body)).not.toContain('Secret');
  }
  await post(`${path}/clarifications`, f.owner, {
    expectedVersion: 3,
    kind: 'QUESTION',
    parentId: q.id,
    body: 'Illegal nesting',
  }).expect(422);
  await post(`${path}/clarifications`, f.client, {
    expectedVersion: 3,
    kind: 'ANSWER',
    parentId: q.id,
    body: 'Additional valid answer',
  }).expect(201);
});
it('validates bodies and pagination, preserving Session and CSRF guards', async () => {
  const f = await setup(),
    row = await create(f.project.id, f.client),
    path = `/requirements/${row.id}`;
  for (const body of [
    { expectedVersion: 1 },
    { expectedVersion: 1, title: null },
    { expectedVersion: 0, title: 'X' },
    { expectedVersion: '1', title: 'X' },
    { expectedVersion: 1, title: 'X', status: 'READY' },
  ])
    await call('patch', path, f.client, body).expect(400);
  for (const body of [
    { ...spec },
    { expectedVersion: 1, ...spec, acceptanceCriteria: [' '] },
    { expectedVersion: 1, ...spec, createdBy: f.owner.id },
  ])
    await post(`${path}/revisions`, f.owner, body).expect(400);
  for (const query of ['limit=0', 'limit=101', 'offset=-1', 'status=READY'])
    await get(
      `/projects/${f.project.id}/requirements?${query}`,
      f.client,
    ).expect(400);
  await get('/requirements/not-uuid', f.client).expect(400);
  for (const route of [
    path,
    `${path}/revisions`,
    `/projects/${f.project.id}/requirements`,
  ])
    await request(server).get(`/api/v1${route}`).expect(401);
  for (const [route, body] of [
    [
      `${path}/clarifications`,
      { expectedVersion: 1, kind: 'QUESTION', body: 'Q' },
    ],
    [`${path}/revisions`, { expectedVersion: 1, ...spec }],
    [`${path}/mark-ready`, { expectedVersion: 1 }],
    [
      `/projects/${f.project.id}/requirements`,
      { title: 'T', originalText: 'O' },
    ],
  ] as const) {
    await request(server)
      .post(`/api/v1${route}`)
      .set(headers)
      .send(body)
      .expect(401);
    await request(server)
      .post(`/api/v1${route}`)
      .set('Cookie', f.owner.cookie)
      .send(body)
      .expect(403);
  }
  await request(server)
    .patch(`/api/v1${path}`)
    .set(headers)
    .send({ expectedVersion: 1, title: 'X' })
    .expect(401);
  await request(server)
    .patch(`/api/v1${path}`)
    .set('Cookie', f.client.cookie)
    .send({ expectedVersion: 1, title: 'X' })
    .expect(403);
  await request(server)
    .get(`/api/v1${path}`)
    .set('Cookie', f.outsider.cookie)
    .set('X-User-Id', f.owner.id)
    .expect(404);
});
it('paginates project requirements and handles uppercase UUIDs across all new resource paths', async () => {
  const f = await setup();
  expect(
    (await get(`/projects/${f.project.id}/requirements`, f.owner)).body.data,
  ).toEqual([]);
  const a = await create(f.project.id.toUpperCase(), f.client),
    b = await create(f.project.id, f.owner);
  const list = (
    await get(
      `/projects/${f.project.id.toUpperCase()}/requirements?limit=1`,
      f.client,
    )
  ).body;
  expect(list.data[0].id).toBe(a.id);
  expect(list.meta.hasMore).toBe(true);
  expect(
    (await get(`/projects/${f.project.id}/requirements?offset=1`, f.client))
      .body.data[0].id,
  ).toBe(b.id);
  const path = `/requirements/${a.id.toUpperCase()}`;
  await call('patch', path, f.client, {
    expectedVersion: 1,
    title: 'Case',
  }).expect(200);
  const q = (
    await post(`${path}/clarifications`, f.owner, {
      expectedVersion: 2,
      kind: 'QUESTION',
      body: 'Q',
    }).expect(201)
  ).body.data;
  const ans = (
    await post(`${path}/clarifications`, f.client, {
      expectedVersion: 3,
      kind: 'ANSWER',
      parentId: q.id.toUpperCase(),
      body: 'A',
    }).expect(201)
  ).body.data;
  expect(ans.parentId).toBe(q.id);
  expect(ans.requirementId).toBe(a.id);
  const rev = (
    await post(`${path}/revisions`, f.developer, {
      expectedVersion: 4,
      ...spec,
    }).expect(201)
  ).body.data;
  await post(`${path}/mark-ready`, f.owner, { expectedVersion: 5 }).expect(200);
  expect((await get(path, f.client)).body.data.latestRevisionId).toBe(rev.id);
  expect((await get(`${path}/revisions`, f.client)).body.data[0].id).toBe(
    rev.id,
  );
});
it('returns one 201 and one 409 for concurrent HTTP revisions, with sequential retry numbering', async () => {
  const f = await setup(),
    row = await create(f.project.id, f.owner),
    path = `/requirements/${row.id}/revisions`;
  const results = await Promise.all([
    post(path, f.owner, { expectedVersion: 1, ...spec }),
    post(path, f.developer, { expectedVersion: 1, ...spec }),
  ]);
  expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
    201, 409,
  ]);
  expect(results.find((r) => r.status === 409)?.body.error.code).toBe(
    'STALE_VERSION',
  );
  expect(
    (await post(path, f.owner, { expectedVersion: 2, ...spec }).expect(201))
      .body.data.revisionNo,
  ).toBe(2);
});
it('AC-25 exposes REVIEW_IN_PROGRESS and preserves frozen revisions over HTTP', async () => {
  const f = await setup(),
    row = await create(f.project.id, f.owner),
    path = `/requirements/${row.id}`;
  const rev = (
    await post(`${path}/revisions`, f.owner, {
      expectedVersion: 1,
      ...spec,
    }).expect(201)
  ).body.data;
  const cr = (
    await pool.query(
      "INSERT INTO change_requests(requirement_id,draft_requirement_revision_id,created_by,status) VALUES($1,$2,$3,'SUBMITTED') RETURNING id",
      [row.id, rev.id, f.owner.id],
    )
  ).rows[0];
  for (const status of ['SUBMITTED', 'VENDOR_APPROVED']) {
    await pool.query('UPDATE change_requests SET status=$1 WHERE id=$2', [
      status,
      cr.id,
    ]);
    expect(
      (
        await post(`${path}/revisions`, f.owner, {
          expectedVersion: 2,
          ...spec,
        }).expect(409)
      ).body.error.code,
    ).toBe('REVIEW_IN_PROGRESS');
  }
  expect((await get(`${path}/revisions`, f.client)).body.data).toHaveLength(1);
});
