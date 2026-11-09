import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { ChangesService } from '../../src/changes/changes.service.js';
import { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import { AuditWriter } from '../../src/audit/audit.module.js';
import { openTestDatabase } from '../database/helpers.js';
import { setup as fixture, commercial, snapshot } from './helpers.js';
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
const setup = (bind = true) => fixture(pool, module, bind);
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
it('executes all seven routes, sequential approval, rejection and new frozen version through HTTP', async () => {
  const f = await setup();
  const created = await call(
    'post',
    `/requirements/${f.requirement.id}/change-requests`,
    f.developer,
    {},
  ).expect(201);
  const id = created.body.data.id,
    path = `/change-requests/${id}`;
  expect(created.body.data.lockVersion).toBe(0);
  await call('patch', path, f.developer, {
    expectedVersion: 0,
    ...commercial,
  }).expect(200);
  const submitted = await call('post', `${path}/submit`, f.developer, {
    expectedVersion: 1,
  }).expect(201);
  const v1 = submitted.body.data.changeRequestVersionId;
  await call('post', `${path}/client-decision`, f.client, {
    expectedVersion: 2,
    decision: 'APPROVED',
  }).expect(409);
  await call('post', `${path}/vendor-decision`, f.owner, {
    expectedVersion: 2,
    decision: 'APPROVED',
    comment: 'Visible vendor assessment',
  }).expect(200);
  await call('post', `${path}/client-decision`, f.client, {
    expectedVersion: 3,
    decision: 'REJECTED',
  }).expect(200);
  await call('post', `${path}/resubmit`, f.developer, {
    expectedVersion: 4,
  }).expect(200);
  const reopened = await call('get', path, f.client).expect(200);
  expect(reopened.body.data).not.toHaveProperty('draft');
  expect(reopened.body.data.activeVersion.approvals[0].comment).toBe(
    'Visible vendor assessment',
  );
  await call('patch', path, f.owner, {
    expectedVersion: 5,
    scopeSummary: 'Updated scope',
  }).expect(200);
  const next = await call('post', `${path}/submit`, f.owner, {
    expectedVersion: 6,
  }).expect(201);
  expect(next.body.data.versionNo).toBe(2);
  expect(next.body.data.changeRequestVersionId).not.toBe(v1);
  await call('post', `${path}/vendor-decision`, f.owner, {
    expectedVersion: 7,
    decision: 'APPROVED',
  }).expect(200);
  await call('post', `${path}/client-decision`, f.client, {
    expectedVersion: 8,
    decision: 'APPROVED',
  }).expect(200);
  const detail = await call('get', `${path}?limit=1&offset=1`, f.client).expect(
    200,
  );
  expect(detail.headers['cache-control']).toBe('no-store');
  expect(detail.body.meta.requestId).toBeTruthy();
  expect(detail.body.data.versions[0].id).toBe(v1);
  const approvals = detail.body.data.activeVersion.approvals;
  expect(approvals).toHaveLength(2);
  expect(approvals[0].changeRequestVersionId).toBe(
    approvals[1].changeRequestVersionId,
  );
  expect(JSON.stringify(detail.body)).not.toMatch(
    /passwordHash|tokenHash|draftScopeSummary|email/,
  );
});
it('enforces the complete role and cross-project matrix on all seven endpoints with no side effects', async () => {
  const f = await setup(),
    other = await setup();
  const path = `/change-requests/${f.cr.id}`;
  await module
    .get(WorkspacesService)
    .add(f.owner.id, f.workspace.id, f.outsider.email); // Workspace member without project assignment.
  const routes = [
    [
      'post',
      `/requirements/${f.requirement.id}/change-requests`,
      {},
      ['owner', 'developer'],
    ],
    ['get', path, undefined, ['owner', 'developer', 'client']],
    [
      'patch',
      path,
      { expectedVersion: 0, ...commercial },
      ['owner', 'developer'],
    ],
    ['post', `${path}/submit`, { expectedVersion: 0 }, ['owner', 'developer']],
    [
      'post',
      `${path}/vendor-decision`,
      { expectedVersion: 0, decision: 'APPROVED' },
      ['owner'],
    ],
    [
      'post',
      `${path}/client-decision`,
      { expectedVersion: 0, decision: 'APPROVED' },
      ['client'],
    ],
    [
      'post',
      `${path}/resubmit`,
      { expectedVersion: 0 },
      ['owner', 'developer'],
    ],
  ] as const;
  const before = await snapshot(pool, f.project.id);
  for (const [method, url, body, allowed] of routes) {
    for (const user of [other.owner, other.developer, other.client, f.outsider])
      await call(method, url, user, body).expect(404);
    for (const role of ['owner', 'developer', 'client'] as const)
      if (!(allowed as readonly string[]).includes(role))
        await call(method, url, f[role], body).expect(403);
    const unauth = request(server)[method](`/api/v1${url}`).set(headers);
    await (body ? unauth.send(body) : unauth).expect(401);
    if (method !== 'get')
      await request(server)
        [method](`/api/v1${url}`)
        .set('Cookie', f.owner.cookie)
        .send(body)
        .expect(403);
  }
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('rejects forged fields, malformed values, empty PATCH and unsafe numbers before writes', async () => {
  const f = await setup(),
    path = `/change-requests/${f.cr.id}`,
    before = await snapshot(pool, f.project.id);
  for (const input of [
    { expectedVersion: 0 },
    { expectedVersion: -1, ...commercial },
    { expectedVersion: 0, actorId: f.owner.id },
    { expectedVersion: 0, estimateHours: '0.001' },
    { expectedVersion: 0, costDeltaMinor: Number.MAX_SAFE_INTEGER + 1 },
    { expectedVersion: 0, requirementRevisionId: null },
    { expectedVersion: 0, acceptanceCriteria: [' '] },
  ])
    await call('patch', path, f.owner, input).expect(400);
  await call(
    'post',
    `/requirements/${f.requirement.id}/change-requests`,
    f.owner,
    { actorId: f.owner.id },
  ).expect(400);
  for (const action of [
    'submit',
    'resubmit',
    'vendor-decision',
    'client-decision',
  ])
    await call('post', `${path}/${action}`, f.owner, {
      expectedVersion: 0,
      decision: 'APPROVED',
      changeRequestVersionId: f.revision.id,
    }).expect(400);
  await call('get', '/change-requests/not-a-uuid', f.owner).expect(400);
  await call('get', `${path}?limit=101`, f.owner).expect(400);
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('returns public business codes and never freezes without Client or complete assessment', async () => {
  const f = await setup(false),
    path = `/change-requests/${f.cr.id}`;
  const response = await call('post', `${path}/submit`, f.owner, {
    expectedVersion: 0,
  }).expect(422);
  expect(response.body.error.code).toBe('CLIENT_REQUIRED');
  await call('patch', path, f.owner, {
    expectedVersion: 0,
    ...commercial,
  }).expect(200);
  const stale = await call('patch', path, f.owner, {
    expectedVersion: 0,
    scopeSummary: 'stale',
  }).expect(409);
  expect(stale.body.error.code).toBe('STALE_VERSION');
  expect((await snapshot(pool, f.project.id)).versions).toEqual([]);
});
it('handles concurrent HTTP Submit and decisions without duplicate records', async () => {
  const f = await setup(),
    path = `/change-requests/${f.cr.id}`;
  await call('patch', path, f.developer, {
    expectedVersion: 0,
    ...commercial,
  }).expect(200);
  const submissions = await Promise.all(
    [1, 2].map(() =>
      call('post', `${path}/submit`, f.developer, { expectedVersion: 1 }),
    ),
  );
  expect(submissions.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
  for (const [action, user, n] of [
    ['vendor-decision', f.owner, 2],
    ['client-decision', f.client, 3],
  ] as const) {
    const results = await Promise.all(
      [1, 2].map(() =>
        call('post', `${path}/${action}`, user, {
          expectedVersion: n,
          decision: 'APPROVED',
        }),
      ),
    );
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    const duplicate = await call('post', `${path}/${action}`, user, {
      expectedVersion: n + 1,
      decision: 'REJECTED',
    }).expect(409);
    expect(duplicate.body.error.code).toBe('ALREADY_REVIEWED');
  }
  const state = await snapshot(pool, f.project.id);
  expect(state.versions).toHaveLength(1);
  expect(state.approvals).toHaveLength(2);
});
it('rolls back a real HTTP submission when auditing fails and returns a safe error', async () => {
  const f = await setup(),
    path = `/change-requests/${f.cr.id}`;
  await call('patch', path, f.owner, {
    expectedVersion: 0,
    ...commercial,
  }).expect(200);
  const before = await snapshot(pool, f.project.id);
  vi.spyOn(module.get(AuditWriter), 'write').mockRejectedValueOnce(
    new Error('private-sentinel SQL parameters'),
  );
  const response = await call('post', `${path}/submit`, f.owner, {
    expectedVersion: 1,
  }).expect(500);
  expect(response.body.error.code).toBe('INTERNAL_ERROR');
  expect(JSON.stringify(response.body)).not.toContain('sentinel');
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('normalizes mixed-case UUIDs on HTTP paths and revision input', async () => {
  const f = await setup(),
    path = `/change-requests/${f.cr.id.toUpperCase()}`;
  const response = await call('patch', path, f.owner, {
    expectedVersion: 0,
    ...commercial,
    requirementRevisionId: f.revision.id.toUpperCase(),
  }).expect(200);
  expect(response.body.data.id).toBe(f.cr.id);
  expect(response.body.data.draft.requirementRevisionId).toBe(f.revision.id);
  await call('post', `${path}/submit`, f.owner, { expectedVersion: 1 }).expect(
    201,
  );
  expect(
    (
      await module
        .get(ChangesService)
        .detail(f.owner.id, f.cr.id, { limit: 20, offset: 0 })
    ).data.activeVersion,
  ).toBeTruthy();
});
