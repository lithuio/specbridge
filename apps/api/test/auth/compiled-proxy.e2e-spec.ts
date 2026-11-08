import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { openTestDatabase } from '../database/helpers.js';

const origin = 'https://app.example.test';
const password = 'Proxy-smoke-private-password-83';
const email = `${randomUUID()}@example.test`;
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
afterAll(async () => {
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
  if (pool) {
    await pool.query(
      'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email=$1)',
      [email],
    );
    await pool.query('DELETE FROM users WHERE email=$1', [email]);
    await pool.end();
  }
});
it('runs compiled bootstrap and real Next rewrite with production cookies, CSRF and logout', async () => {
  const base = 'http://127.0.0.1:3000/api/v1';
  const headers = {
    Origin: origin,
    'X-CSRF-Protection': '1',
    'Sec-Fetch-Site': 'same-origin',
    'Content-Type': 'application/json',
  };
  const registered = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, displayName: 'Proxy User' }),
  });
  expect(registered.status).toBe(201);
  const loggedIn = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });
  expect(loggedIn.status).toBe(200);
  const setCookie = loggedIn.headers.get('set-cookie')!;
  expect(setCookie.startsWith('__Host-specbridge_session=')).toBe(true);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/'])
    expect(setCookie.includes(flag)).toBe(true);
  const cookie = setCookie.split(';')[0];
  const me = await fetch(`${base}/me`, { headers: { Cookie: cookie } });
  expect(me.status).toBe(200);
  expect((await me.json()).data.user.email).toBe(email);
  const forged = await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { ...headers, Origin: 'https://evil.test', Cookie: cookie },
  });
  expect(forged.status).toBe(403);
  const logout = await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { ...headers, Cookie: cookie },
  });
  expect(logout.status).toBe(204);
  expect(logout.headers.get('set-cookie')).toContain(
    'Expires=Thu, 01 Jan 1970',
  );
  expect(
    (await fetch(`${base}/me`, { headers: { Cookie: cookie } })).status,
  ).toBe(401);
  const badDto = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      displayName: 'Proxy User',
      userId: randomUUID(),
    }),
  });
  expect(badDto.status).toBe(400);
  expect(output.includes(password)).toBe(false);
  expect(output.includes(cookie.split('=')[1])).toBe(false);
});
