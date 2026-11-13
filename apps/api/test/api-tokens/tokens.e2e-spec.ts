import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { openTestDatabase } from '../database/helpers.js';
import { setup as fixture } from '../deliveries/helpers.js';
import { snapshot } from '../changes/helpers.js';
import { signal, waitForLock } from '../rbac/helpers.js';
import { ApiTokensService } from '../../src/api-tokens/api-tokens.service.js';
import { ApprovedSpecsService } from '../../src/api-tokens/approved-specs.service.js';
import { TokenAccess } from '../../src/api-tokens/token-access.module.js';
import {
  projectTokenHash,
  newProjectToken,
} from '../../src/api-tokens/token.contract.js';
import { AuditWriter } from '../../src/audit/audit.module.js';
import { RateLimitService } from '../../src/auth/rate-limit.service.js';
import { ChangesService } from '../../src/changes/changes.service.js';
import { ProjectsService } from '../../src/projects/projects.service.js';
import { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import { RequirementsService } from '../../src/requirements/requirements.service.js';
import { assertContract } from '../reads/contract.js';
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
const setup = (approved = true) => fixture(pool, module, approved);
const page = { limit: 100, offset: 0 };
const path = (id: string) => `/projects/${id}/api-tokens`;
const specs = (id: string) => `/projects/${id}/approved-specs`;
const call = (
  method: 'get' | 'post' | 'delete',
  route: string,
  user: { cookie: string },
  body?: object,
) => {
  const req = request(server)
    [method]('/api/v1' + route)
    .set(headers)
    .set('Cookie', user.cookie)
    .expect((res) => assertContract(route, method, res));
  return body === undefined ? req : req.send(body);
};
const bearer = (token: string, route: string) =>
  request(server)
    .get('/api/v1' + route)
    .set('Authorization', 'Bearer ' + token)
    .expect((res) => assertContract(route, 'get', res));
const create = (f: Awaited<ReturnType<typeof setup>>, name = 'Local Agent') =>
  module.get(ApiTokensService).create(f.owner.id, f.project.id, { name });

it('creates once, returns safe paginated metadata, revokes idempotently and audits without credential content', async () => {
  const f = await setup();
  const created = await call('post', path(f.project.id), f.owner, {
    name: 'Local Agent',
    expiresInDays: 1,
  }).expect(201);
  expect(created.headers['cache-control']).toBe('no-store');
  const token = created.body.data as { id: string; token: string };
  const stored = (
    await pool.query('SELECT * FROM api_tokens WHERE id=$1', [token.id])
  ).rows[0];
  expect(stored.token_hash === projectTokenHash(token.token)).toBe(true);
  expect(JSON.stringify(stored).includes(token.token)).toBe(false);
  expect(stored.expires_at.getTime() - stored.created_at.getTime()).toBe(
    86400000,
  );
  await create(f, 'Second');
  const list = await call(
    'get',
    path(f.project.id) + '?limit=1',
    f.owner,
  ).expect(200);
  expect(list.body.meta.hasMore).toBe(true);
  expect(list.body.data).toHaveLength(1);
  const second = await call(
    'get',
    path(f.project.id) + '?limit=1&offset=1',
    f.owner,
  ).expect(200);
  expect(second.body.data[0].id).toBe(token.id);
  expect(second.body.meta.hasMore).toBe(false);
  expect(JSON.stringify(second.body).includes(token.token)).toBe(false);
  expect(JSON.stringify(second.body)).not.toMatch(
    /tokenHash|token_hash|userId/,
  );
  await bearer(token.token, specs(f.project.id)).expect(200);
  for (let n = 0; n < 2; n++)
    await call('delete', `/api-tokens/${token.id}`, f.owner).expect(204);
  await bearer(token.token, specs(f.project.id)).expect(401);
  const audits = (
    await pool.query(
      'SELECT * FROM audit_events WHERE entity_id=$1 ORDER BY created_at',
      [token.id],
    )
  ).rows;
  expect(audits.map((a) => a.event_type)).toEqual([
    'api_token.created',
    'api_token.used',
    'api_token.revoked',
  ]);
  expect(audits[1].actor_id).toBeNull();
  expect(JSON.stringify(audits).includes(token.token)).toBe(false);
  expect(JSON.stringify(audits)).not.toMatch(
    /Local Agent|token_hash|tokenHash/,
  );
  expect(
    (await call('get', path(f.project.id), f.owner)).body.data.find(
      (r: { id: string }) => r.id === token.id,
    ).status,
  ).toBe('REVOKED');
});
it('enforces Owner management, scope, CSRF, project/workspace isolation and strict input', async () => {
  const f = await setup(),
    other = await setup(),
    token = await create(f);
  await module
    .get(WorkspacesService)
    .add(f.owner.id, f.workspace.id, f.outsider.email);
  for (const user of [f.developer, f.client, f.outsider, other.owner]) {
    const status = [f.developer, f.client].includes(user) ? 403 : 404;
    await call('get', path(f.project.id), user).expect(status);
    await call('post', path(f.project.id), user, { name: 'Forbidden' }).expect(
      status,
    );
    await call('delete', `/api-tokens/${token.id}`, user).expect(status);
  }
  await request(server)
    .post('/api/v1' + path(f.project.id))
    .set('Cookie', f.owner.cookie)
    .send({ name: 'CSRF' })
    .expect(403);
  for (const body of [
    { name: ' ' },
    { name: 'x', expiresInDays: 91 },
    { name: 'x', scopes: ['approved_specs:write'] },
    { name: 'x', projectId: other.project.id },
    { name: 'x', token: 'override' },
  ])
    await call('post', path(f.project.id), f.owner, body).expect(400);
  await call('get', path(f.project.id) + '?token=hidden', f.owner).expect(400);
  await bearer(token.token, specs(other.project.id)).expect(404);
  const sibling = await module.get(ProjectsService).create(f.owner.id, {
    workspaceId: f.workspace.id,
    name: 'Sibling',
    baselineScope: 'Reference',
  });
  await bearer(token.token, specs(sibling.id)).expect(404);
  for (const route of [
    '/me',
    path(f.project.id),
    `/requirements/${f.requirement.id}`,
    `/change-requests/${f.cr.id}`,
  ])
    await bearer(token.token, route).expect(401);
  for (const route of [
    path(f.project.id),
    `/requirements/${f.requirement.id}/mark-ready`,
    `/change-requests/${f.cr.id}/vendor-decision`,
  ])
    await request(server)
      .post('/api/v1' + route)
      .set(headers)
      .set('Authorization', 'Bearer ' + token.token)
      .send({})
      .expect(401);
  await request(server)
    .get('/api/v1' + specs(f.project.id))
    .set('Authorization', 'Bearer ' + token.token)
    .set('Cookie', f.owner.cookie)
    .expect(401);
  for (const raw of [
    'bad',
    newProjectToken(),
    token.token + '=',
    token.token.toUpperCase(),
  ])
    await bearer(raw, specs(f.project.id)).expect(401);
  await request(server)
    .get('/api/v1' + specs(f.project.id))
    .set({ Authorization: ['Bearer ' + token.token, 'Bearer ' + token.token] })
    .expect(401);
  await request(server)
    .head('/api/v1' + specs(f.project.id))
    .set('Authorization', 'Bearer ' + token.token)
    .expect(200);
});
it('projects exact dual-approved snapshots only, keeps referenced revisions separate and never mutates business history', async () => {
  const f = await setup(),
    other = await setup(),
    token = await create(f),
    pending = await setup(false),
    pendingToken = await create(pending);
  expect(
    (await bearer(pendingToken.token, specs(pending.project.id)).expect(200))
      .body.data,
  ).toEqual([]);
  await module
    .get(ChangesService)
    .decision(pending.owner.id, pending.cr.id, 'VENDOR', {
      expectedVersion: 2,
      decision: 'APPROVED',
    });
  expect(
    (await bearer(pendingToken.token, specs(pending.project.id)).expect(200))
      .body.data,
  ).toEqual([]);
  await bearer(
    pendingToken.token,
    specs(pending.project.id) + '/' + pending.version.changeRequestVersionId,
  ).expect(404);
  await module.get(RequirementsService).revision(f.owner.id, f.requirement.id, {
    expectedVersion: 3,
    content: 'NEW UNAPPROVED BODY',
    acceptanceCriteria: ['UNAPPROVED'],
  });
  const before = await snapshot(pool, f.project.id);
  const data = (
    await bearer(
      token.token,
      specs(f.project.id) + '/' + f.version.changeRequestVersionId,
    ).expect(200)
  ).body.data;
  expect(data.approvedScope).toEqual({
    summary: 'Commercial scope',
    acceptanceCriteria: ['Observable result'],
  });
  expect(data.referencedRequirement).toMatchObject({
    revisionId: f.revision.id,
    revisionNo: 1,
    content: 'Frozen specification',
  });
  expect(JSON.stringify(data)).not.toMatch(
    /NEW UNAPPROVED|Original|Change test|estimateHours|costDelta|currency|scheduleDelta|comment|email|actorId/,
  );
  await bearer(
    token.token,
    specs(f.project.id) + '/' + other.version.changeRequestVersionId,
  ).expect(404);
  const after = await snapshot(pool, f.project.id);
  expect({ ...after, audit: [] }).toEqual({ ...before, audit: [] });
  for (const user of [f.owner, f.developer, f.client])
    expect(
      (await call('get', specs(f.project.id), user).expect(200)).body.data,
    ).toEqual([data]);
  await call('get', specs(f.project.id), other.owner).expect(404);
});
it('fails closed after expiry, archive, owner-membership removal or ownership change', async () => {
  const f = await setup(),
    token = await create(f);
  await pool.query(
    "UPDATE api_tokens SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE id=$1",
    [token.id],
  );
  await bearer(token.token, specs(f.project.id)).expect(401);
  expect(
    (await call('get', path(f.project.id), f.owner)).body.data[0].status,
  ).toBe('EXPIRED');
  const valid = await create(f);
  await pool.query("UPDATE projects SET status='ARCHIVED' WHERE id=$1", [
    f.project.id,
  ]);
  await bearer(valid.token, specs(f.project.id)).expect(401);
  await call('post', path(f.project.id), f.owner, { name: 'Archived' }).expect(
    422,
  );
  expect(
    (await call('get', path(f.project.id), f.owner)).body.data[0].status,
  ).toBe('UNAVAILABLE');
  await pool.query("UPDATE projects SET status='ACTIVE' WHERE id=$1", [
    f.project.id,
  ]);
  await pool.query(
    'DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',
    [f.workspace.id, f.owner.id],
  );
  await bearer(valid.token, specs(f.project.id)).expect(401);
  await pool.query(
    "UPDATE workspace_members SET role='OWNER' WHERE workspace_id=$1 AND user_id=$2",
    [f.workspace.id, f.developer.id],
  );
  await pool.query('UPDATE workspaces SET owner_id=$1 WHERE id=$2', [
    f.developer.id,
    f.workspace.id,
  ]);
  await bearer(valid.token, specs(f.project.id)).expect(401);
  expect(
    (await call('get', path(f.project.id), f.developer)).body.data[0].status,
  ).toBe('UNAVAILABLE');
  await call('delete', `/api-tokens/${valid.id}`, f.developer).expect(204);
});
it('filters Owner-only token audits before pagination and rejects cross-project audit links', async () => {
  const f = await setup(),
    token = await create(f);
  await bearer(token.token, specs(f.project.id)).expect(200);
  for (const role of [f.developer, f.client]) {
    const res = await call(
      'get',
      `/projects/${f.project.id}/audit-events?entityType=api_token&limit=1`,
      role,
    ).expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.hasMore).toBe(false);
  }
  const res = await call(
    'get',
    `/projects/${f.project.id}/audit-events?eventType=api_token.used&limit=1`,
    f.owner,
  ).expect(200);
  expect(res.body.data[0]).toMatchObject({
    actor: null,
    metadata: {
      principalType: 'project_token',
      operation: 'approved_spec.list',
      resultCount: 1,
    },
    target: { kind: 'api_tokens', projectId: f.project.id },
  });
  const other = await setup();
  await pool.query(
    "INSERT INTO audit_events(workspace_id,project_id,event_type,entity_type,entity_id) VALUES($1,$2,'api_token.revoked','api_token',$3)",
    [other.workspace.id, other.project.id, token.id],
  );
  expect(
    (
      await call(
        'get',
        `/projects/${other.project.id}/audit-events?entityType=api_token`,
        other.owner,
      )
    ).body.data[0].target,
  ).toBeNull();
});
it('rolls back create/revoke/read when audit persistence fails and does not return a secret', async () => {
  const f = await setup(),
    token = await create(f),
    principal = await module.get(TokenAccess).authenticate(token.token);
  const writer = vi
    .spyOn(module.get(AuditWriter), 'write')
    .mockRejectedValue(new Error('Synthetic audit failure'));
  const before = (
    await pool.query('SELECT count(*) FROM api_tokens WHERE project_id=$1', [
      f.project.id,
    ])
  ).rows;
  await expect(create(f, 'Rollback')).rejects.toThrow(
    'Synthetic audit failure',
  );
  expect(
    (
      await pool.query('SELECT count(*) FROM api_tokens WHERE project_id=$1', [
        f.project.id,
      ])
    ).rows,
  ).toEqual(before);
  await expect(
    module.get(ApiTokensService).revoke(f.owner.id, token.id),
  ).rejects.toThrow();
  expect(
    (
      await pool.query('SELECT revoked_at FROM api_tokens WHERE id=$1', [
        token.id,
      ])
    ).rows[0].revoked_at,
  ).toBeNull();
  await expect(
    module.get(ApprovedSpecsService).read(principal, f.project.id, page),
  ).rejects.toThrow();
  writer.mockRestore();
});
it('serializes revocation against an already authenticated reader and rechecks validity after waiting', async () => {
  const f = await setup(),
    token = await create(f),
    principal = await module.get(TokenAccess).authenticate(token.token);
  const audit = module.get(AuditWriter),
    original = audit.write.bind(audit),
    locked = signal(),
    release = signal();
  vi.spyOn(audit, 'write').mockImplementation(async (tx, event) => {
    await original(tx, event);
    if (event.eventType === 'api_token.revoked') {
      locked.resolve();
      await release.promise;
    }
  });
  const revoking = module.get(ApiTokensService).revoke(f.owner.id, token.id);
  await locked.promise;
  const reading = module
    .get(ApprovedSpecsService)
    .read(principal, f.project.id, page);
  const denied = expect(reading).rejects.toMatchObject({ status: 401 });
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  await revoking;
  await denied;
  expect(
    (
      await pool.query(
        "SELECT count(*) FROM audit_events WHERE entity_id=$1 AND event_type='api_token.used'",
        [token.id],
      )
    ).rows[0].count,
  ).toBe('0');
});
it('bounds creation and bearer reads with safe 429 and Retry-After responses', async () => {
  const f = await setup(),
    token = await create(f),
    limits = module.get(RateLimitService);
  // Spend the real limiter budget directly to avoid 60 identical database reads.
  for (let i = 0; i < 60; i++)
    limits.consume('project-token:' + token.id, 60, 60000);
  const rate = await bearer(token.token, specs(f.project.id)).expect(429);
  expect(Number(rate.headers['retry-after'])).toBeGreaterThan(0);
  for (let i = 1; i < 30; i++)
    limits.consume('token-create:' + f.owner.id, 30, 60000);
  const failed = await call('post', path(f.project.id), f.owner, {
    name: 'Limited',
  }).expect(429);
  expect(failed.headers['cache-control']).toBe('no-store');
  expect(JSON.stringify(failed.body).includes(token.token)).toBe(false);
});

it('does not disclose bearer text or digest through unexpected-error responses and logs', async () => {
  const f = await setup(),
    token = await create(f);
  const logs = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  vi.spyOn(module.get(AuditWriter), 'write').mockRejectedValue(
    new Error(token.token),
  );
  const failed = await bearer(token.token, specs(f.project.id)).expect(500);
  expect(failed.headers['cache-control']).toBe('no-store');
  const output = JSON.stringify([failed.body, logs.mock.calls]);
  expect(output.includes(token.token)).toBe(false);
  expect(output.includes(projectTokenHash(token.token)!)).toBe(false);
  expect(logs).toHaveBeenCalled();
});
