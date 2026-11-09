import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { DeliveriesService } from '../../src/deliveries/deliveries.service.js';
import { ProjectsService } from '../../src/projects/projects.service.js';
import { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import { AuditWriter } from '../../src/audit/audit.module.js';
import { openTestDatabase } from '../database/helpers.js';
import { setup as fixture, payload, snapshot } from './helpers.js';
let pool: Pool, module: TestingModule, app: INestApplication, server: Server;
const headers = {
  Origin: 'http://localhost:3000',
  'X-CSRF-Protection': '1',
  'Sec-Fetch-Site': 'same-origin',
};
beforeAll(async () => {
  pool = await openTestDatabase();
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', headers.Origin);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('OBSERVE_APP_KEY', '');
  vi.stubEnv('OBSERVE_APP_SECRET', '');
  module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer() as Server;
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await app?.close();
  await pool?.end();
  vi.unstubAllEnvs();
});
const setup = () => fixture(pool, module);
const call = (
  method: 'get' | 'post' | 'patch',
  path: string,
  user: { cookie: string },
  body?: object,
) => {
  const req = request(server)
    [method](`/api/v1${path}`)
    .set(headers)
    .set('Cookie', user.cookie);
  return body === undefined ? req : req.send(body);
};
it('runs submission, changes requested, resubmission, acceptance and immutable paginated history', async () => {
  const f = await setup(),
    path = `/change-requests/${f.cr.id}/deliveries`;
  const one = await call('post', path, f.developer, payload).expect(201);
  expect(one.body.data).toMatchObject({
    deliveryNo: 1,
    changeRequestVersionId: f.version.changeRequestVersionId,
    review: null,
  });
  const pending = await call('post', path, f.owner, payload).expect(409);
  expect(pending.body.error.code).toBe('DELIVERY_PENDING');
  await call('post', `/deliveries/${one.body.data.id}/review`, f.client, {
    decision: 'CHANGES_REQUESTED',
    comment: 'Fix refund',
  }).expect(200);
  const two = await call('post', path, f.owner, {
    ...payload,
    summary: 'Refund fixed',
  }).expect(201);
  expect(two.body.data.deliveryNo).toBe(2);
  const accepted = await call(
    'post',
    `/deliveries/${two.body.data.id}/review`,
    f.client,
    { decision: 'ACCEPTED' },
  ).expect(200);
  expect(accepted.body.data.review).toMatchObject({
    decision: 'ACCEPTED',
    reviewerId: f.client.id,
    comment: null,
  });
  const complete = await call('post', path, f.owner, payload).expect(409);
  expect(complete.body.error.code).toBe('DELIVERY_COMPLETED');
  const history = await call(
    'get',
    `${path}?limit=1&offset=1`,
    f.client,
  ).expect(200);
  expect(history.body.data[0]).toMatchObject({
    id: one.body.data.id,
    status: 'CHANGES_REQUESTED',
    review: { comment: 'Fix refund' },
  });
  expect(history.headers['cache-control']).toBe('no-store');
  expect(history.body.meta).toMatchObject({
    limit: 1,
    offset: 1,
    hasMore: false,
  });
  expect(history.body.meta.requestId).toBeTruthy();
  expect(JSON.stringify(history.body)).not.toMatch(
    /passwordHash|tokenHash|email|draft/,
  );
  const before = await snapshot(pool, f.project.id);
  await call('patch', `/deliveries/${one.body.data.id}`, f.owner, {
    summary: 'overwrite',
  }).expect(404);
  await request(server)
    .delete(`/api/v1/deliveries/${one.body.data.id}`)
    .set(headers)
    .set('Cookie', f.owner.cookie)
    .expect(404);
  await call('patch', `/deliveries/${one.body.data.id}/review`, f.client, {
    comment: 'overwrite',
  }).expect(404);
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('enforces all three routes across roles, workspaces and unassigned/same-workspace projects', async () => {
  const f = await setup(),
    other = await setup();
  const row = await module
    .get(DeliveriesService)
    .create(f.owner.id, f.cr.id, payload);
  await module
    .get(WorkspacesService)
    .add(f.owner.id, f.workspace.id, f.outsider.email);
  const sibling = await module
    .get(ProjectsService)
    .create(f.owner.id, {
      workspaceId: f.workspace.id,
      name: 'Sibling',
      baselineScope: 'Scope',
    });
  await module.get(ProjectsService).add(f.owner.id, sibling.id, f.outsider.id);
  const routes = [
    [
      'post',
      `/change-requests/${f.cr.id}/deliveries`,
      payload,
      ['owner', 'developer'],
    ],
    [
      'get',
      `/change-requests/${f.cr.id}/deliveries`,
      undefined,
      ['owner', 'developer', 'client'],
    ],
    [
      'post',
      `/deliveries/${row.id}/review`,
      { decision: 'ACCEPTED' },
      ['client'],
    ],
  ] as const;
  const before = await snapshot(pool, f.project.id);
  for (const [method, path, body, allowed] of routes) {
    for (const user of [other.owner, other.developer, other.client, f.outsider])
      await call(method, path, user, body).expect(404);
    for (const role of ['owner', 'developer', 'client'] as const)
      if (!(allowed as readonly string[]).includes(role))
        await call(method, path, f[role], body).expect(403);
    const unauth = request(server)[method](`/api/v1${path}`).set(headers);
    await (body ? unauth.send(body) : unauth).expect(401);
    if (method === 'post')
      await request(server)
        .post(`/api/v1${path}`)
        .set('Cookie', f.owner.cookie)
        .send(body)
        .expect(403);
  }
  for (const user of [f.owner, f.developer, f.client])
    await call('get', `/change-requests/${f.cr.id}/deliveries`, user).expect(
      200,
    );
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('rejects version/identity injection, malformed URLs, blank feedback and invalid pagination', async () => {
  const f = await setup(),
    path = `/change-requests/${f.cr.id}/deliveries`;
  const row = await module
      .get(DeliveriesService)
      .create(f.owner.id, f.cr.id, payload),
    before = await snapshot(pool, f.project.id);
  for (const fields of [
    { expectedVersion: 0 },
    { changeRequestVersionId: f.version.changeRequestVersionId },
    { actorId: f.owner.id },
    { artifactUrl: 'http://example.test' },
    { evidenceLinks: [null] },
    { summary: ' ' },
  ])
    await call('post', path, f.owner, { ...payload, ...fields }).expect(400);
  for (const fields of [
    { expectedVersion: 0 },
    { reviewerId: f.client.id },
    { createdAt: 'now' },
    { comment: ' ' },
    { comment: null },
  ])
    await call('post', `/deliveries/${row.id}/review`, f.client, {
      decision: 'CHANGES_REQUESTED',
      comment: 'Fix',
      ...fields,
    }).expect(400);
  await call('get', `${path}?limit=101`, f.client).expect(400);
  await call('get', `${path}?offset=-1`, f.client).expect(400);
  await call('get', '/change-requests/not-a-uuid/deliveries', f.client).expect(
    400,
  );
  await call('post', '/deliveries/not-a-uuid/review', f.client, {
    decision: 'ACCEPTED',
  }).expect(400);
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('serializes concurrent HTTP creates and reviews and rejects repeated reviews', async () => {
  const f = await setup(),
    path = `/change-requests/${f.cr.id}/deliveries`;
  const creates = await Promise.all(
    [f.owner, f.developer].map((user) => call('post', path, user, payload)),
  );
  expect(creates.map((r) => r.status).sort((a, b) => a - b)).toEqual([
    201, 409,
  ]);
  const row = creates.find((r) => r.status === 201)!.body.data;
  const reviews = await Promise.all(
    ['ACCEPTED', 'CHANGES_REQUESTED'].map((decision) =>
      call('post', `/deliveries/${row.id}/review`, f.client, {
        decision,
        comment: 'Concurrent',
      }),
    ),
  );
  expect(reviews.map((r) => r.status).sort((a, b) => a - b)).toEqual([
    200, 409,
  ]);
  const repeated = await call(
    'post',
    `/deliveries/${row.id}/review`,
    f.client,
    { decision: 'ACCEPTED' },
  ).expect(409);
  expect(repeated.body.error.code).toBe('ALREADY_REVIEWED');
  const state = await snapshot(pool, f.project.id);
  expect(state.deliveries).toHaveLength(1);
  expect(state.reviews).toHaveLength(1);
});
it('rolls back HTTP creation and review on audit failure, with safe error responses', async () => {
  const f = await setup(),
    path = `/change-requests/${f.cr.id}/deliveries`;
  async function fails(url: string, user: { cookie: string }, body: object) {
    const before = await snapshot(pool, f.project.id);
    vi.spyOn(module.get(AuditWriter), 'write').mockRejectedValueOnce(
      new Error('private-sentinel SQL'),
    );
    const response = await call('post', url, user, body).expect(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('sentinel');
    expect(await snapshot(pool, f.project.id)).toEqual(before);
  }
  await fails(path, f.owner, payload);
  const row = await module
    .get(DeliveriesService)
    .create(f.owner.id, f.cr.id, payload);
  await fails(`/deliveries/${row.id}/review`, f.client, {
    decision: 'ACCEPTED',
  });
});
it('normalizes UUIDs across paths and exposes invalid transitions safely', async () => {
  const f = await setup();
  const response = await call(
    'post',
    `/change-requests/${f.cr.id.toUpperCase()}/deliveries`,
    f.owner,
    payload,
  ).expect(201);
  expect(response.body.data.changeRequestId).toBe(f.cr.id);
  await call(
    'post',
    `/deliveries/${response.body.data.id.toUpperCase()}/review`,
    f.client,
    { decision: 'ACCEPTED' },
  ).expect(200);
  const pending = await fixture(pool, module, false);
  const invalid = await call(
    'post',
    `/change-requests/${pending.cr.id}/deliveries`,
    pending.owner,
    payload,
  ).expect(409);
  expect(invalid.body.error.code).toBe('INVALID_TRANSITION');
});
