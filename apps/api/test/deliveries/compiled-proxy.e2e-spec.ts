import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { openTestDatabase } from '../database/helpers.js';

const origin = 'https://app.example.test';
const password = 'R06-proxy-private-password-83';
const headers = {
  Origin: origin,
  'X-CSRF-Protection': '1',
  'Sec-Fetch-Site': 'same-origin',
  'Content-Type': 'application/json',
};
let pool: Pool;
const children: ChildProcess[] = [];
let output = '';
async function freePort(port: number) {
  await new Promise<void>((resolve, reject) => {
    const socket = createServer();
    socket.once('error', reject);
    socket.listen(port, '127.0.0.1', () =>
      socket.close((error) => (error ? reject(error) : resolve())),
    );
  });
}
function start(
  file: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
) {
  const child = spawn(file, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  child.stdout!.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr!.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.on('error', () => {
    /* reported by readiness check, never dump child output */
  });
  return child;
}
async function ready(child: ChildProcess, url: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null || child.pid === undefined)
      throw new Error('Smoke-test child exited before readiness');
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch {
      /* retry startup only */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(
    'Smoke-test child readiness timed out; output intentionally withheld',
  );
}
beforeAll(async () => {
  pool = await openTestDatabase();
});
beforeEach(async () => {
  // Fresh processes give each scenario its own real limiter windows.
  children.length = 0;
  output = '';
  await freePort(4000);
  await freePort(3000);
  const apiDir = fileURLToPath(new URL('../../', import.meta.url));
  const webDir = fileURLToPath(new URL('../../../web/', import.meta.url));
  // Never inherit developer DB/Observe credentials into child processes.
  const common = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NEXT_TELEMETRY_DISABLED: '1',
  };
  const api = start(process.execPath, ['dist/main.js'], apiDir, {
    ...common,
    NODE_ENV: 'production',
    PORT: '4000',
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    AUTH_TRUSTED_ORIGINS: origin,
    AUTH_TRUSTED_PROXIES: 'loopback',
  });
  await ready(api, 'http://127.0.0.1:4000/api/v1/health');
  const web = start(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3000',
    ],
    webDir,
    { ...common, NODE_ENV: 'development' },
  );
  await ready(web, 'http://127.0.0.1:3000/api/v1/health');
}, 60000);
afterEach(async () => {
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      child.kill('SIGTERM');
    });
  }
});
afterAll(async () => {
  await pool?.end();
});
it('runs approval, delivery, rejection and acceptance through Next rewrite and compiled API', async () => {
  const base = 'http://127.0.0.1:3000/api/v1';
  async function call(
    path: string,
    cookie?: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ) {
    return fetch(`${base}${path}`, {
      method,
      headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function login() {
    const email = `${randomUUID()}@example.test`;
    expect(
      (
        await call('/auth/register', undefined, {
          email,
          password,
          displayName: 'Approval proxy user',
        })
      ).status,
    ).toBe(201);
    const response = await call('/auth/login', undefined, { email, password });
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    expect(cookie.startsWith('__Host-specbridge_session=')).toBe(true);
    return { email, cookie, id: (await response.json()).data.user.id };
  }
  const owner = await login(),
    client = await login(),
    outsider = await login(),
    developer = await login();
  async function data(
    path: string,
    cookie: string,
    body: unknown,
    status = 201,
    method = 'POST',
  ) {
    const response = await call(path, cookie, body, method);
    expect(response.status).toBe(status);
    return (await response.json()).data;
  }
  const workspace = await data('/workspaces', owner.cookie, {
    name: 'Approval proxy',
  });
  const project = await data('/projects', owner.cookie, {
    workspaceId: workspace.id,
    name: 'Project',
    baselineScope: 'Baseline',
  });
  await data(`/workspaces/${workspace.id}/members`, owner.cookie, {
    email: developer.email,
  });
  await data(`/projects/${project.id}/members`, owner.cookie, {
    userId: developer.id,
    role: 'DEVELOPER',
  });
  await data(
    `/projects/${project.id}/client`,
    owner.cookie,
    { email: client.email },
    200,
    'PUT',
  );
  const requirement = await data(
    `/projects/${project.id}/requirements`,
    client.cookie,
    { title: 'Change', originalText: 'Original' },
  );
  await data(`/requirements/${requirement.id}/revisions`, owner.cookie, {
    expectedVersion: 1,
    content: 'Specification',
    acceptanceCriteria: ['Result'],
  });
  await data(
    `/requirements/${requirement.id}/mark-ready`,
    owner.cookie,
    { expectedVersion: 2 },
    200,
  );
  const cr = await data(
      `/requirements/${requirement.id}/change-requests`,
      owner.cookie,
      {},
    ),
    path = `/change-requests/${cr.id}`;
  await data(
    path,
    owner.cookie,
    {
      expectedVersion: 0,
      scopeSummary: 'Private draft sentinel',
      estimateHours: '1.25',
      costDeltaMinor: 0,
      currency: 'CNY',
      scheduleDeltaDays: 0,
      acceptanceCriteria: ['Result'],
    },
    200,
    'PATCH',
  );
  const draft = await call(path, client.cookie);
  expect(draft.status).toBe(200);
  expect(JSON.stringify(await draft.json())).not.toContain(
    'Private draft sentinel',
  );
  const frozen = await data(`${path}/submit`, owner.cookie, {
    expectedVersion: 1,
  });
  expect(
    (
      await call(`${path}/client-decision`, client.cookie, {
        expectedVersion: 2,
        decision: 'APPROVED',
      })
    ).status,
  ).toBe(409);
  await data(
    `${path}/vendor-decision`,
    owner.cookie,
    { expectedVersion: 2, decision: 'APPROVED' },
    200,
  );
  const approved = await data(
    `${path}/client-decision`,
    client.cookie,
    { expectedVersion: 3, decision: 'APPROVED' },
    200,
  );
  expect(approved.changeRequestVersionId).toBe(frozen.changeRequestVersionId);
  const detail = await call(path, client.cookie);
  expect(detail.headers.get('cache-control')).toBe('no-store');
  expect((await detail.json()).data.activeVersion.approvals).toHaveLength(2);
  expect((await call(path, outsider.cookie)).status).toBe(404);
  expect((await call(path)).status).toBe(401);
  const csrf = await fetch(`${base}${path}/resubmit`, {
    method: 'POST',
    headers: { Cookie: owner.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedVersion: 4 }),
  });
  expect(csrf.status).toBe(403);
  expect(
    (
      await call(`${path}/client-decision`, client.cookie, {
        expectedVersion: 3,
        decision: 'APPROVED',
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await pool.query(
        'SELECT count(*)::int AS n FROM approvals WHERE change_request_version_id=$1',
        [frozen.changeRequestVersionId],
      )
    ).rows[0].n,
  ).toBe(2);

  const deliveries = `${path}/deliveries`;
  const payload = {
    artifactUrl: 'https://example.test/result',
    summary: 'Delivered',
    evidenceLinks: ['https://example.test/evidence'],
  };
  const one = await data(deliveries, developer.cookie, payload);
  expect(one.changeRequestVersionId).toBe(frozen.changeRequestVersionId);
  expect((await call(deliveries, outsider.cookie)).status).toBe(404);
  expect((await call(deliveries)).status).toBe(401);
  expect(
    (
      await call(`/deliveries/${one.id}/review`, owner.cookie, {
        decision: 'ACCEPTED',
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await call(`/deliveries/${one.id}/review`, outsider.cookie, {
        decision: 'ACCEPTED',
      })
    ).status,
  ).toBe(404);
  const csrfReview = await fetch(`${base}/deliveries/${one.id}/review`, {
    method: 'POST',
    headers: { Cookie: client.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'ACCEPTED' }),
  });
  expect(csrfReview.status).toBe(403);
  await data(
    `/deliveries/${one.id}/review`,
    client.cookie,
    { decision: 'CHANGES_REQUESTED', comment: 'Fix refund' },
    200,
  );
  const two = await data(deliveries, developer.cookie, {
    ...payload,
    summary: 'Refund fixed',
  });
  expect(two.deliveryNo).toBe(2);
  await data(
    `/deliveries/${two.id}/review`,
    client.cookie,
    { decision: 'ACCEPTED' },
    200,
  );
  const completed = await call(deliveries, developer.cookie, payload);
  expect(completed.status).toBe(409);
  expect((await completed.json()).error.code).toBe('DELIVERY_COMPLETED');
  const duplicate = await call(`/deliveries/${two.id}/review`, client.cookie, {
    decision: 'ACCEPTED',
  });
  expect(duplicate.status).toBe(409);
  expect((await duplicate.json()).error.code).toBe('ALREADY_REVIEWED');
  const history = await call(deliveries, client.cookie);
  expect(history.status).toBe(200);
  expect(history.headers.get('cache-control')).toBe('no-store');
  const rows = (await history.json()).data;
  expect(rows.map((d: { status: string }) => d.status)).toEqual([
    'ACCEPTED',
    'CHANGES_REQUESTED',
  ]);
  expect(rows[1].review.comment).toBe('Fix refund');
  expect(
    (
      await pool.query(
        'SELECT count(*)::int AS n FROM delivery_reviews WHERE delivery_id=ANY($1::uuid[])',
        [[one.id, two.id]],
      )
    ).rows[0].n,
  ).toBe(2);
});
