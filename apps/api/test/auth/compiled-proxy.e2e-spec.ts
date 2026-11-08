import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { openTestDatabase } from '../database/helpers.js';

const origin = 'https://app.example.test';
const password = 'Proxy-smoke-private-password-83';
const email = `${randomUUID()}@example.test`;
const emails = new Set<string>();
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
  emails.clear();
  emails.add(email);
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
  if (pool) {
    await pool.query(
      'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email=ANY($1::text[]))',
      [Array.from(emails)],
    );
    await pool.query('DELETE FROM users WHERE email=ANY($1::text[])', [
      Array.from(emails),
    ]);
  }
});
afterAll(async () => {
  await pool?.end();
});
it('runs compiled bootstrap and real Next rewrite with production cookies, CSRF and logout', async () => {
  const base = 'http://127.0.0.1:3000/api/v1';
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

// Both paths deliberately keep AUTH_TRUSTED_PROXIES=loopback. Disabling proxy
// trust here would conceal the production bug this regression must detect.
const targets = [
  ['Next rewrite', 'http://127.0.0.1:3000/api/v1'],
  ['direct API', 'http://127.0.0.1:4000/api/v1'],
] as const;
async function forgedRequest(
  base: string,
  route: string,
  attempt: number,
  address: string,
) {
  const response = await fetch(`${base}/auth/${route}`, {
    method: 'POST',
    headers: {
      ...headers,
      'X-Forwarded-For': `203.0.113.${attempt + 1}`,
      'X-Real-IP': `198.51.100.${attempt + 1}`,
      Forwarded: `for=192.0.2.${attempt + 1};proto=https`,
    },
    body: JSON.stringify({
      email: address,
      password,
      ...(route === 'register' ? { displayName: 'Rate limit test' } : {}),
    }),
  });
  return {
    status: response.status,
    retryAfter: response.headers.get('retry-after'),
    body: await response.json(),
  };
}
function expectLimited(response: Awaited<ReturnType<typeof forgedRequest>>) {
  expect(response.status).toBe(429);
  expect(response.body.error.code).toBe('RATE_LIMITED');
  expect(Number(response.retryAfter)).toBeGreaterThan(0);
}
it.each(targets)(
  '%s: rotating forwarded headers cannot bypass the registration IP limit',
  async (_name, base) => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const address = `${randomUUID()}@example.test`;
      emails.add(address);
      const response = await forgedRequest(base, 'register', attempt, address);
      if (attempt < 5) expect(response.status).toBe(201);
      else {
        expectLimited(response);
        expect(
          (await pool.query('SELECT id FROM users WHERE email=$1', [address]))
            .rowCount,
        ).toBe(0);
      }
    }
  },
);
it.each(targets)(
  '%s: rotating forwarded headers cannot bypass the IP+email limit',
  async (_name, base) => {
    // No registered account: all five allowed attempts must reach credential validation.
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(
        (await forgedRequest(base, 'login', attempt % 2, email)).status,
      ).toBe(401);
    }
    expectLimited(await forgedRequest(base, 'login', 5, email));
    // This was the identity bucket, not the 30-request IP bucket.
    expect(
      (await forgedRequest(base, 'login', 6, `${randomUUID()}@example.test`))
        .status,
    ).toBe(401);
  },
);
it.each(targets)(
  '%s: rotating emails and forwarded headers cannot bypass the independent login IP limit',
  async (_name, base) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      expect(
        (
          await forgedRequest(
            base,
            'login',
            attempt,
            `${randomUUID()}@example.test`,
          )
        ).status,
      ).toBe(401);
    }
    expectLimited(
      await forgedRequest(base, 'login', 30, `${randomUUID()}@example.test`),
    );
  },
);
