import { Test } from '@nestjs/testing';
import { Controller, Get, Logger, type INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { AuthConfig } from '../../src/auth/auth.config.js';
import { openTestDatabase } from '../database/helpers.js';
import { tokenHash } from '../../src/auth/session.service.js';

@Controller('api/v1/protected-test')
class DefaultProtectedController {
  @Get() read() {
    return { data: 'protected' };
  }
}
const origin = 'http://localhost:3000';
const headers = {
  Origin: origin,
  'X-CSRF-Protection': '1',
  'Sec-Fetch-Site': 'same-origin',
};
const password = 'HTTP-test-secret-password-472!';
let pool: Pool;
let app: INestApplication;
let server: Server;
let email: string;
let logs: string[];
const emails: string[] = [];
beforeAll(async () => {
  pool = await openTestDatabase();
});
beforeEach(async () => {
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', origin);
  vi.stubEnv('AUTH_TRUSTED_PROXIES', '');
  vi.stubEnv('NODE_ENV', 'test');
  logs = [];
  for (const method of ['log', 'error', 'warn'] as const)
    vi.spyOn(Logger.prototype, method).mockImplementation(
      (...args: unknown[]) => {
        logs.push(JSON.stringify(args));
      },
    );
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [DefaultProtectedController],
  }).compile();
  app = module.createNestApplication();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer() as Server;
  email = `${randomUUID()}@example.test`;
  emails.push(email);
});
afterEach(async () => {
  await app?.close();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  if (!pool) return;
  await pool.query(
    'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email=ANY($1::text[]))',
    [emails],
  );
  await pool.query('DELETE FROM users WHERE email=ANY($1::text[])', [emails]);
  await pool.end();
});
const register = () =>
  request(server)
    .post('/api/v1/auth/register')
    .set(headers)
    .send({ email, password, displayName: 'HTTP User' });
const login = () =>
  request(server)
    .post('/api/v1/auth/login')
    .set(headers)
    .send({ email, password });
function cookieOf(response: { headers: Record<string, unknown> }): string {
  const cookies = response.headers['set-cookie'] as string[];
  return cookies[0].split(';')[0];
}
it('AC-01/02: registers, logs in, reads me, logs out and rejects a replayed cookie', async () => {
  const agent = request.agent(server);
  const registered = await register().expect(201);
  expect(registered.body.data).toEqual({ id: expect.any(String) });
  const duplicate = await request(server)
    .post('/api/v1/auth/register')
    .set(headers)
    .send({ email: ` ${email.toUpperCase()} `, password, displayName: 'Other' })
    .expect(409);
  expect(duplicate.body.error.code).toBe('REGISTRATION_UNAVAILABLE');
  const loggedIn = await agent
    .post('/api/v1/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  const cookie = cookieOf(loggedIn);
  expect(loggedIn.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(loggedIn.headers['set-cookie'][0]).toContain('SameSite=Lax');
  expect(loggedIn.headers['set-cookie'][0]).toContain('Path=/');
  expect(loggedIn.headers['set-cookie'][0]).not.toContain('Domain=');
  expect(loggedIn.headers['set-cookie'][0]).not.toContain('Secure');
  const me = await agent.get('/api/v1/me').expect(200);
  expect(me.body.data.user).toEqual({
    id: registered.body.data.id,
    email,
    displayName: 'HTTP User',
    createdAt: expect.any(String),
  });
  expect(me.headers['cache-control']).toBe('no-store');
  expect(me.body.meta.requestId).toBe(me.headers['x-request-id']);
  const logout = await agent
    .post('/api/v1/auth/logout')
    .set(headers)
    .expect(204);
  expect(logout.text).toBe('');
  expect(logout.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
  await request(server).get('/api/v1/me').set('Cookie', cookie).expect(401);
  await agent.get('/api/v1/me').expect(401);
  const stored = (
    await pool.query('SELECT password_hash FROM users WHERE id=$1', [
      registered.body.data.id,
    ])
  ).rows[0];
  expect(stored.password_hash).toMatch(/^\$argon2id\$/);
  const all =
    logs.join(' ') + JSON.stringify(me.body) + JSON.stringify(loggedIn.body);
  expect(all.includes(password)).toBe(false);
  expect(all.includes(cookie.split('=')[1])).toBe(false);
  expect(all.includes(stored.password_hash)).toBe(false);
});
it('protects new routes by default, keeps health public, and rejects invalid tokens', async () => {
  await request(server).get('/api/v1/protected-test').expect(401);
  await request(server)
    .get('/api/v1/health')
    .expect(200, { data: { status: 'ok' } });
  await request(server).get('/').expect(200, 'Hello World!');
  for (const token of ['malformed', randomBytes(32).toString('base64url')]) {
    const result = await request(server)
      .get('/api/v1/me')
      .set('Cookie', `specbridge_session=${token}`)
      .expect(401);
    expect(result.body.error.code).toBe('UNAUTHENTICATED');
  }
});
it('returns indistinguishable safe responses for wrong password and missing account', async () => {
  await register().expect(201);
  const wrong = await request(server)
    .post('/api/v1/auth/login')
    .set(headers)
    .send({ email, password: 'wrong' })
    .expect(401);
  const missing = await request(server)
    .post('/api/v1/auth/login')
    .set(headers)
    .send({ email: 'missing@example.test', password })
    .expect(401);
  expect(wrong.body.error).toMatchObject({
    code: missing.body.error.code,
    message: missing.body.error.message,
    details: [],
  });
  expect(wrong.headers['set-cookie']).toBeUndefined();
});
it('rejects injected identity and invalid DTOs over real HTTP', async () => {
  await request(server)
    .post('/api/v1/auth/register')
    .set(headers)
    .send({
      email,
      password,
      displayName: 'User',
      userId: randomUUID(),
      role: 'OWNER',
    })
    .expect(400);
  await request(server)
    .post('/api/v1/auth/register')
    .set(headers)
    .send({ email, password: 'short', displayName: 'User' })
    .expect(400);
  expect(
    (await pool.query('SELECT id FROM users WHERE email=$1', [email])).rowCount,
  ).toBe(0);
});
it('applies CSRF checks even on public login/register, before credential processing', async () => {
  for (const changed of [
    { Origin: 'https://evil.example' },
    { Origin: 'null' },
    { 'X-CSRF-Protection': '' },
    { 'Sec-Fetch-Site': 'same-site' },
    { 'Sec-Fetch-Site': 'cross-site' },
  ]) {
    await request(server)
      .post('/api/v1/auth/login')
      .set({ ...headers, ...changed })
      .send({ email, password })
      .expect(403);
  }
  await request(server)
    .post('/api/v1/auth/login')
    .set('X-CSRF-Protection', '1')
    .send({ email, password })
    .expect(403);
  await request(server)
    .post('/api/v1/auth/register')
    .set({ ...headers, Origin: 'https://evil.example' })
    .send({ email, password, displayName: 'User' })
    .expect(403);
  await request(server)
    .post('/api/v1/auth/login')
    .set(headers)
    .type('form')
    .send({ email, password })
    .expect(403);
  const preflight = await request(server)
    .options('/api/v1/auth/login')
    .set({
      Origin: 'https://evil.example',
      'Access-Control-Request-Headers': 'X-CSRF-Protection',
    });
  expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
  expect(
    (await pool.query('SELECT id FROM users WHERE email=$1', [email])).rowCount,
  ).toBe(0);
});
it('rejects logout CSRF without revoking or refreshing the session', async () => {
  await register().expect(201);
  const cookie = cookieOf(await login().expect(200));
  const hash = tokenHash(cookie.split('=')[1]);
  const before = (
    await pool.query(
      'SELECT last_activity_at FROM sessions WHERE token_hash=$1',
      [hash],
    )
  ).rows[0];
  await request(server)
    .post('/api/v1/auth/logout')
    .set('Cookie', cookie)
    .expect(403);
  const after = (
    await pool.query(
      'SELECT last_activity_at,revoked_at FROM sessions WHERE token_hash=$1',
      [hash],
    )
  ).rows[0];
  expect(after.last_activity_at).toEqual(before.last_activity_at);
  expect(after.revoked_at).toBeNull();
  await request(server).get('/api/v1/me').set('Cookie', cookie).expect(200);
});
it('rejects expired, idle and revoked sessions through HTTP and rotates on login', async () => {
  await register().expect(201);
  let cookie = cookieOf(await login().expect(200));
  const replacement = await request(server)
    .post('/api/v1/auth/login')
    .set(headers)
    .set('Cookie', cookie)
    .send({ email, password })
    .expect(200);
  await request(server).get('/api/v1/me').set('Cookie', cookie).expect(401);
  cookie = cookieOf(replacement);
  for (const assignment of [
    'expires_at=now()',
    "last_activity_at=now()-interval '24 hours'",
    'revoked_at=now()',
  ]) {
    await pool.query(`UPDATE sessions SET ${assignment} WHERE token_hash=$1`, [
      tokenHash(cookie.split('=')[1]),
    ]);
    await request(server).get('/api/v1/me').set('Cookie', cookie).expect(401);
    cookie = cookieOf(await login().expect(200));
  }
});
it('enforces identity/IP login limits, registration limits and does not trust forged XFF', async () => {
  for (let i = 0; i < 5; i++) await login().expect(401);
  const limited = await login().expect(429);
  expect(limited.headers['retry-after']).toBeDefined();
  for (let i = 0; i < 24; i++)
    await request(server)
      .post('/API/V1/AUTH/LOGIN/')
      .set(headers)
      .set('X-Forwarded-For', `192.0.2.${i}`)
      .send({ email: `u${i}@example.test`, password })
      .expect(401);
  await request(server)
    .post('/api/v1/auth/login')
    .set(headers)
    .send({ email: 'other@example.test', password })
    .expect(429);
  for (let i = 0; i < 5; i++)
    await request(server)
      .post('/api/v1/auth/register')
      .set(headers)
      .send({ email, password: 'short' })
      .expect(400);
  await register().expect(429);
});
it('emits production Secure host cookies even when forwarded protocol claims HTTP', async () => {
  // Use the same real app with production cookie settings; HTTP client sends cookies manually.
  const config = app.get(AuthConfig);
  Object.assign(config, {
    cookieName: '__Host-specbridge_session',
    cookieOptions: { ...config.cookieOptions, secure: true },
  });
  await register().expect(201);
  const response = await request(server)
    .post('/api/v1/auth/login')
    .set(headers)
    .set('X-Forwarded-Proto', 'http')
    .send({ email, password })
    .expect(200);
  expect(response.headers['set-cookie'][0]).toMatch(
    /^__Host-specbridge_session=/,
  );
  expect(response.headers['set-cookie'][0]).toContain('Secure');
});
