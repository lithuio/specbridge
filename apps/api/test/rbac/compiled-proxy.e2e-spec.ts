import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { openTestDatabase } from '../database/helpers.js';

const origin = 'https://app.example.test';
const password = 'RBAC-proxy-private-password-83';
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
it('authorizes Workspace/Project requests through the real Next rewrite and compiled API', async () => {
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
          displayName: 'Proxy user',
        })
      ).status,
    ).toBe(201);
    const response = await call('/auth/login', undefined, { email, password });
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    expect(cookie.startsWith('__Host-specbridge_session=')).toBe(true);
    return { email, cookie };
  }
  const owner = await login(),
    client = await login(),
    stranger = await login();
  const workspaceResponse = await call('/workspaces', owner.cookie, {
    name: 'Proxy workspace',
  });
  expect(workspaceResponse.status).toBe(201);
  const workspace = (await workspaceResponse.json()).data;
  const projectResponse = await call('/projects', owner.cookie, {
    workspaceId: workspace.id,
    name: 'Proxy project',
    baselineScope: 'Fixed reference',
  });
  expect(projectResponse.status).toBe(201);
  const project = (await projectResponse.json()).data;
  expect(
    (
      await call(
        `/projects/${project.id}/client`,
        owner.cookie,
        { email: client.email },
        'PUT',
      )
    ).status,
  ).toBe(200);
  const detail = await call(`/projects/${project.id}`, client.cookie);
  expect(detail.status).toBe(200);
  expect(detail.headers.get('cache-control')).toBe('no-store');
  expect((await detail.json()).data.baselineScope).toBe('Fixed reference');
  expect(
    (await (await call('/workspaces', client.cookie)).json()).data,
  ).toEqual([]);
  expect(
    (await (await call('/projects', client.cookie)).json()).data.map(
      (p: { id: string }) => p.id,
    ),
  ).toEqual([project.id]);
  expect((await call(`/projects/${project.id}`, stranger.cookie)).status).toBe(
    404,
  );
  expect(
    (
      await call(
        `/projects/${project.id}/client`,
        client.cookie,
        { email: stranger.email },
        'PUT',
      )
    ).status,
  ).toBe(403);
  expect(
    (await call(`/workspaces/${workspace.id}/members`, client.cookie)).status,
  ).toBe(404);
  const forged = await fetch(`${base}/workspaces`, {
    method: 'POST',
    headers: { ...headers, Cookie: owner.cookie, Origin: 'https://evil.test' },
    body: JSON.stringify({ name: 'Forged' }),
  });
  expect(forged.status).toBe(403);
  expect(
    (await call('/auth/logout', client.cookie, undefined, 'POST')).status,
  ).toBe(204);
  expect((await call(`/projects/${project.id}`, client.cookie)).status).toBe(
    401,
  );
  expect(output).not.toContain(password);
  expect(output).not.toContain(owner.cookie.split('=')[1]);
});
