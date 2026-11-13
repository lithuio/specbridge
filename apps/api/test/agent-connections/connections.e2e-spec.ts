import { Test, type TestingModule } from '@nestjs/testing';
import {
  Logger,
  ServiceUnavailableException,
  type INestApplication,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { openTestDatabase } from '../database/helpers.js';
import { setup, snapshot } from '../deliveries/helpers.js';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { z } from 'zod';
import { assertContract } from '../reads/contract.js';
import { waitForLock } from '../rbac/helpers.js';
import { AuditWriter } from '../../src/audit/audit.module.js';
import { projectTokenHash } from '../../src/api-tokens/token.contract.js';
import { connectionHash } from '../../src/agent-connections/connection.contract.js';
import { RateLimitService } from '../../src/auth/rate-limit.service.js';
let pool: Pool, module: TestingModule, app: INestApplication, server: Server;
const headers = {
  Origin: 'http://localhost:3000',
  'X-CSRF-Protection': '1',
  'Sec-Fetch-Site': 'same-origin',
};
beforeAll(async () => {
  pool = await openTestDatabase();
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', headers.Origin);
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
const path = (project: string) => `/projects/${project}/agent-connections`;
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
    .expect((r) => assertContract(route, method, r));
  return body === undefined ? req : req.send(body);
};
const proof = () => {
  const verifier = randomBytes(32).toString('base64url');
  return {
    verifier,
    state: randomBytes(32).toString('base64url'),
    grantId: randomUUID(),
    challenge: createHash('sha256').update(verifier).digest('base64url'),
    challengeMethod: 'S256',
    callbackPort: 49152,
    name: 'Codex integration',
    expiresInDays: 1,
  };
};
const fixture = () => setup(pool, module);
async function authorize(f: Awaited<ReturnType<typeof fixture>>, p = proof()) {
  const { verifier: _verifier, ...input } = p;
  const r = await call('post', path(f.project.id), f.owner, input).expect(201);
  return {
    projectId: f.project.id,
    grantId: p.grantId,
    code: r.body.data.code as string,
    verifier: p.verifier,
    state: p.state,
    callbackPort: p.callbackPort,
  };
}
const exchange = (body: object) =>
  request(server)
    .post('/api/v1/agent-connections/exchange')
    .send(body)
    .expect((r) => assertContract('/agent-connections/exchange', 'post', r));
const countTokens = async (projectId: string) =>
  (
    await pool.query(
      'SELECT count(*)::int n FROM api_tokens WHERE project_id=$1',
      [projectId],
    )
  ).rows[0].n as number;
it('authorizes once, exchanges once, returns only metadata to the browser and reuses read-only Token lifecycle', async () => {
  const f = await fixture();
  const body = await authorize(f);
  expect(await countTokens(f.project.id)).toBe(0);
  const r = await exchange(body).expect(200);
  expect(r.headers['cache-control']).toBe('no-store');
  const token = r.body.data.token as string;
  expect(
    (
      await pool.query('SELECT token_hash FROM api_tokens WHERE id=$1', [
        r.body.data.id,
      ])
    ).rows[0].token_hash === projectTokenHash(token),
  ).toBe(true);
  const stored = (
    await pool.query('SELECT * FROM agent_connection_grants WHERE id=$1', [
      body.grantId,
    ])
  ).rows[0];
  for (const secret of [token, body.code, body.verifier, body.state])
    expect(JSON.stringify(stored).includes(secret)).toBe(false);
  const list = await call('get', path(f.project.id), f.owner).expect(200);
  expect(list.body.data[0]).toMatchObject({
    status: 'EXCHANGED',
    apiTokenId: r.body.data.id,
  });
  expect(JSON.stringify(list.body)).not.toMatch(
    /codeHash|stateHash|verifier|challenge|sessionId/,
  );
  await exchange(body).expect(409);
  expect(await countTokens(f.project.id)).toBe(1);
  await request(server)
    .get(`/api/v1/projects/${f.project.id}/approved-specs`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  await request(server)
    .get(`/api/v1/projects/${f.project.id}/requirements`)
    .set('Authorization', `Bearer ${token}`)
    .expect(401);
  await call('delete', `/api-tokens/${r.body.data.id}`, f.owner).expect(204);
  await request(server)
    .get(`/api/v1/projects/${f.project.id}/approved-specs`)
    .set('Authorization', `Bearer ${token}`)
    .expect(401);
  await call(
    'post',
    path(f.project.id) + `/${body.grantId}/cancel`,
    f.owner,
    {},
  ).expect(409);
});
it('rejects non-Owner, cross-tenant, forged scopes, CSRF and mixed exchange authentication', async () => {
  const f = await fixture(),
    other = await fixture();
  const p = proof();
  const { verifier: _v, ...input } = p;
  for (const u of [f.client, f.developer])
    await call('post', path(f.project.id), u, input).expect(403);
  await call('post', path(f.project.id), other.owner, input).expect(404);
  await request(server)
    .post('/api/v1' + path(f.project.id))
    .set('Cookie', f.owner.cookie)
    .send(input)
    .expect(403);
  await call('post', path(f.project.id), f.owner, {
    ...input,
    scopes: ['write'],
  }).expect(400);
  const body = await authorize(f, p);
  await call('post', path(f.project.id), f.owner, input).expect(409);
  await call(
    'get',
    path(other.project.id) + `/${body.grantId}`,
    other.owner,
  ).expect(404);
  for (const extra of [
    { Cookie: f.owner.cookie },
    { Authorization: 'Bearer invalid' },
    { Origin: headers.Origin },
    { 'Sec-Fetch-Site': 'none' },
  ])
    await request(server)
      .post('/api/v1/agent-connections/exchange')
      .set(extra)
      .send(body)
      .expect(401);
  for (const changed of [
    { code: 'sbc_' + randomBytes(32).toString('base64url') },
    { verifier: randomBytes(32).toString('base64url') },
    { state: randomBytes(32).toString('base64url') },
    { callbackPort: 49153 },
    { projectId: other.project.id },
    { grantId: randomUUID() },
  ])
    await exchange({ ...body, ...changed }).expect(401);
  expect(await countTokens(f.project.id)).toBe(0);
  await exchange({ ...body, expiresInDays: 90 }).expect(400);
  await exchange({ payload: 'x'.repeat(5000) }).expect(413);
  await call('get', path(f.project.id) + '?limit=51', f.owner).expect(400);
});
it('cancels idempotently and never exchanges a cancelled attempt', async () => {
  const f = await fixture(),
    body = await authorize(f);
  for (let i = 0; i < 2; i++)
    await call(
      'post',
      path(f.project.id) + `/${body.grantId}/cancel`,
      f.owner,
      {},
    ).expect(200);
  await exchange(body).expect(409);
  expect(await countTokens(f.project.id)).toBe(0);
  expect(
    (
      await pool.query(
        "SELECT count(*)::int n FROM audit_events WHERE entity_id=$1 AND event_type='agent_connection.cancelled'",
        [body.grantId],
      )
    ).rows[0].n,
  ).toBe(1);
});
it('rechecks current project status and the authorizing session', async () => {
  const f = await fixture();
  const body = await authorize(f);
  await pool.query("UPDATE projects SET status='ARCHIVED' WHERE id=$1", [
    f.project.id,
  ]);
  await exchange(body).expect(401);
  await pool.query("UPDATE projects SET status='ACTIVE' WHERE id=$1", [
    f.project.id,
  ]);
  await pool.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1', [
    f.owner.id,
  ]);
  await exchange(body).expect(401);
  expect(await countTokens(f.project.id)).toBe(0);
});
it('serializes concurrent exchange and rolls back Token creation when the grant audit fails', async () => {
  const f = await fixture(),
    body = await authorize(f);
  const audit = module.get(AuditWriter),
    original = audit.write.bind(audit);
  const spy = vi.spyOn(audit, 'write').mockImplementation(async (tx, e) => {
    if (e.eventType === 'agent_connection.exchanged')
      throw new ServiceUnavailableException();
    return original(tx, e);
  });
  await exchange(body).expect(503);
  expect(await countTokens(f.project.id)).toBe(0);
  expect(
    (
      await call(
        'get',
        path(f.project.id) + `/${body.grantId}`,
        f.owner,
      ).expect(200)
    ).body.data.status,
  ).toBe('AUTHORIZED');
  spy.mockRestore();
  const responses = await Promise.all([exchange(body), exchange(body)]);
  expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
    200, 409,
  ]);
  expect(await countTokens(f.project.id)).toBe(1);
});
it('refuses exchange if logout happens while it waits on the Workspace lock', async () => {
  const f = await fixture(),
    body = await authorize(f),
    blocker = await pool.connect();
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE', [
      f.workspace.id,
    ]);
    const pending = exchange(body).then((r) => r);
    await waitForLock(pool);
    await pool.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1', [
      f.owner.id,
    ]);
    await blocker.query('COMMIT');
    expect((await pending).status).toBe(401);
    expect(await countTokens(f.project.id)).toBe(0);
  } finally {
    await blocker.query('ROLLBACK');
    blocker.release();
  }
});
it('enforces active attempt quotas and keeps codes, proofs and Tokens out of logs and audit', async () => {
  const f = await fixture();
  const logs: string[] = [];
  const capture = (v: unknown) => {
    logs.push(typeof v === 'string' ? v : JSON.stringify(v));
  };
  vi.spyOn(Logger.prototype, 'log').mockImplementation(capture);
  vi.spyOn(Logger.prototype, 'error').mockImplementation(capture);
  const bodies = [];
  for (let i = 0; i < 5; i++) bodies.push(await authorize(f));
  const { verifier: _v, ...input } = proof();
  await call('post', path(f.project.id), f.owner, input).expect(422);
  const exchanged = await exchange(bodies[0]).expect(200);
  const audit = await pool.query(
    'SELECT * FROM audit_events WHERE project_id=$1',
    [f.project.id],
  );
  for (const secret of [
    bodies[0].code,
    bodies[0].state,
    bodies[0].verifier,
    exchanged.body.data.token as string,
  ]) {
    expect(JSON.stringify(logs).includes(secret)).toBe(false);
    expect(JSON.stringify(audit.rows).includes(secret)).toBe(false);
  }
});
it('rejects an actually expired grant using database time', async () => {
  const f = await fixture(),
    p = proof(),
    code = 'sbc_' + randomBytes(32).toString('base64url');
  const session = (
    await pool.query('SELECT id FROM sessions WHERE user_id=$1', [f.owner.id])
  ).rows[0].id as string;
  await pool.query(
    "INSERT INTO agent_connection_grants(id,project_id,user_id,session_id,code_hash,challenge,state_hash,callback_port,token_name,token_expires_in_days,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'Expiring',1,clock_timestamp()+interval '50 milliseconds')",
    [
      p.grantId,
      f.project.id,
      f.owner.id,
      session,
      connectionHash(code),
      p.challenge,
      connectionHash(p.state),
      p.callbackPort,
    ],
  );
  await new Promise((resolve) => setTimeout(resolve, 70));
  await exchange({
    grantId: p.grantId,
    projectId: f.project.id,
    code,
    verifier: p.verifier,
    state: p.state,
    callbackPort: p.callbackPort,
  }).expect(401);
  expect(
    (
      await call('get', path(f.project.id) + `/${p.grantId}`, f.owner).expect(
        200,
      )
    ).body.data.status,
  ).toBe('EXPIRED');
  expect(await countTokens(f.project.id)).toBe(0);
});
it('rejects a former Owner and serializes cancellation against exchange', async () => {
  const f = await fixture(),
    body = await authorize(f);
  await pool.query(
    "UPDATE workspace_members SET role='DEVELOPER' WHERE workspace_id=$1 AND user_id=$2",
    [f.workspace.id, f.owner.id],
  );
  await exchange(body).expect(401);
  expect(await countTokens(f.project.id)).toBe(0);
  await pool.query(
    "UPDATE workspace_members SET role='OWNER' WHERE workspace_id=$1 AND user_id=$2",
    [f.workspace.id, f.owner.id],
  );
  const [cancelled, exchanged] = await Promise.all([
    call('post', path(f.project.id) + `/${body.grantId}/cancel`, f.owner, {}),
    exchange(body),
  ]);
  expect([cancelled.status, exchanged.status].sort((a, b) => a - b)).toEqual([
    200, 409,
  ]);
  const record = await call(
    'get',
    path(f.project.id) + `/${body.grantId}`,
    f.owner,
  ).expect(200);
  expect(record.body.data.status).toBe(
    exchanged.status === 200 ? 'EXCHANGED' : 'CANCELLED',
  );
  expect(await countTokens(f.project.id)).toBe(
    exchanged.status === 200 ? 1 : 0,
  );
});
it('uses a newly exchanged credential in a real stdio client, reads exact approved sources and refuses cross-project access and revocation', async () => {
  const f = await fixture(),
    other = await fixture();
  const body = await authorize(f);
  const issued = await exchange(body).expect(200);
  const token = issued.body.data.token as string;
  const client = new Client({
    name: 'workflow-final-integration',
    version: '1.0.0',
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve('../mcp/dist/main.js')],
    env: {
      SPECBRIDGE_API_BASE_URL: await app.getUrl(),
      SPECBRIDGE_PROJECT_ID: f.project.id,
      SPECBRIDGE_API_TOKEN: token,
    },
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk: Buffer) => {
    if (stderr.length < 8192) stderr += chunk.toString();
  });
  const business = async () => ({
    ...(await snapshot(pool, f.project.id)),
    audit: [],
  });
  const before = await business();
  try {
    await client.connect(transport);
    expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual([
      'get_approved_spec',
      'list_project_requirements',
    ]);
    const listed = await client.callTool({
      name: 'list_project_requirements',
      arguments: { limit: 10, offset: 0 },
    });
    expect(listed.isError).not.toBe(true);
    const list = z
      .object({
        projectId: z.uuid(),
        items: z.array(z.object({ versionId: z.uuid(), revisionId: z.uuid() })),
      })
      .parse(listed.structuredContent);
    expect(list.projectId).toBe(f.project.id);
    expect(list.items).toEqual([
      {
        versionId: f.version.changeRequestVersionId,
        revisionId: f.revision.id,
      },
    ]);
    const detail = await client.callTool({
      name: 'get_approved_spec',
      arguments: { versionId: f.version.changeRequestVersionId },
    });
    expect(detail.isError).not.toBe(true);
    expect(JSON.stringify(detail).includes(token)).toBe(false);
    expect(detail.structuredContent).toMatchObject({
      specification: {
        projectId: f.project.id,
        versionId: f.version.changeRequestVersionId,
        approvedScope: { summary: 'Commercial scope' },
        referencedRequirement: {
          revisionId: f.revision.id,
          content: 'Frozen specification',
        },
      },
      source: {
        apiPath: `/api/v1/projects/${f.project.id}/approved-specs/${f.version.changeRequestVersionId}`,
      },
    });
    expect(
      (
        await client.callTool({
          name: 'get_approved_spec',
          arguments: { versionId: other.version.changeRequestVersionId },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await client.callTool({
          name: 'list_project_requirements',
          arguments: { projectId: other.project.id },
        })
      ).isError,
    ).toBe(true);
    await call('delete', `/api-tokens/${issued.body.data.id}`, f.owner).expect(
      204,
    );
    expect(
      (
        await client.callTool({
          name: 'get_approved_spec',
          arguments: { versionId: f.version.changeRequestVersionId },
        })
      ).isError,
    ).toBe(true);
    expect(await business()).toEqual(before);
    expect(
      (
        await call(
          'get',
          path(f.project.id) + `/${body.grantId}`,
          f.owner,
        ).expect(200)
      ).body.data.status,
    ).toBe('EXCHANGED');
  } finally {
    await client.close();
    await call('delete', `/api-tokens/${issued.body.data.id}`, f.owner).expect(
      204,
    );
    expect(stderr.includes(token)).toBe(false);
    expect(stderr.length).toBe(0);
  }
});
it('applies Owner/project/hour and native peer limits without creating grants on rejection', async () => {
  const f = await fixture(),
    other = await fixture(),
    limits = module.get(RateLimitService);
  const { verifier: _v, ...input } = proof();
  for (let i = 0; i < 20; i++)
    limits.consume(`connection-owner:${f.owner.id}`, 20, 3600000);
  await call('post', path(f.project.id), f.owner, input).expect(429);
  for (let i = 0; i < 40; i++)
    limits.consume(`connection-project:${other.project.id}`, 40, 3600000);
  await call('post', path(other.project.id), other.owner, input).expect(429);
  expect(
    (await call('get', path(f.project.id), f.owner).expect(200)).body.data,
  ).toHaveLength(0);
  // Saturate the same TCP peer bucket; forwarding headers cannot bypass it.
  for (let i = 0; i < 60; i++) {
    try {
      limits.consume('connection-exchange-ip:127.0.0.1', 60, 60000);
    } catch {
      break;
    }
  }
  await request(server)
    .post('/api/v1/agent-connections/exchange')
    .set('X-Forwarded-For', '192.0.2.5')
    .send({})
    .expect(429);
});
