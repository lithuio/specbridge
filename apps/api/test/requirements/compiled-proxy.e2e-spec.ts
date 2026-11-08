import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { openTestDatabase } from '../database/helpers.js';

const origin = 'https://app.example.test';
const password = 'R04-proxy-private-password-83';
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
it('runs Requirement clarification, revisions and Ready through real Next rewrite and compiled API', async () => {
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
  const created = await call(
    `/projects/${project.id}/requirements`,
    client.cookie,
    { title: 'Proxy requirement', originalText: 'Private original sentinel' },
  );
  expect(created.status).toBe(201);
  const requirement = (await created.json()).data;
  const path = `/requirements/${requirement.id}`;
  const question = await call(`${path}/clarifications`, owner.cookie, {
    expectedVersion: 1,
    kind: 'QUESTION',
    body: 'Which rule?',
  });
  expect(question.status).toBe(201);
  const q = (await question.json()).data;
  expect(
    (
      await call(`${path}/clarifications`, client.cookie, {
        expectedVersion: 2,
        kind: 'ANSWER',
        parentId: q.id,
        body: 'Confirmed rule',
      })
    ).status,
  ).toBe(201);
  const spec = {
    content: 'Confirmed specification',
    acceptanceCriteria: ['Observable criterion'],
  };
  expect(
    (
      await call(`${path}/revisions`, client.cookie, {
        expectedVersion: 3,
        ...spec,
      })
    ).status,
  ).toBe(403);
  const revision = await call(`${path}/revisions`, owner.cookie, {
    expectedVersion: 3,
    ...spec,
  });
  expect(revision.status).toBe(201);
  const rev = (await revision.json()).data;
  expect(
    (await call(`${path}/mark-ready`, owner.cookie, { expectedVersion: 4 }))
      .status,
  ).toBe(200);
  const detail = await call(path, client.cookie);
  expect(detail.status).toBe(200);
  expect(detail.headers.get('cache-control')).toBe('no-store');
  expect((await detail.json()).data).toMatchObject({
    status: 'READY',
    draftVersion: 5,
    latestRevisionId: rev.id,
  });
  expect((await call(path, stranger.cookie)).status).toBe(404);
  expect(
    (
      await call(`${path}/revisions`, stranger.cookie, {
        expectedVersion: 5,
        ...spec,
      })
    ).status,
  ).toBe(404);
  const forged = await fetch(`${base}${path}/revisions`, {
    method: 'POST',
    headers: { ...headers, Cookie: owner.cookie, Origin: 'https://evil.test' },
    body: JSON.stringify({ expectedVersion: 5, ...spec }),
  });
  expect(forged.status).toBe(403);
  expect(
    (await call('/auth/logout', client.cookie, undefined, 'POST')).status,
  ).toBe(204);
  expect((await call(path, client.cookie)).status).toBe(401);
  expect(output).not.toContain('Private original sentinel');
  expect(output).not.toContain(password);
  expect(output).not.toContain(owner.cookie.split('=')[1]);
});
