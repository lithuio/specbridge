import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthConfig } from './auth.config.js';
import { CsrfGuard } from './csrf.guard.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { PasswordService } from './password.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { tokenHash } from './session.service.js';
import { randomBytes } from 'node:crypto';

const password = 'A sufficiently long password!';
afterEach(() => vi.unstubAllEnvs());

it('normalizes email/name but preserves password and rejects forged identity fields', async () => {
  const dto = plainToInstance(RegisterDto, {
    email: ' Test@Example.com ',
    displayName: ' User ',
    password,
  });
  expect(await validate(dto)).toEqual([]);
  expect(dto).toMatchObject({
    email: 'test@example.com',
    displayName: 'User',
    password,
  });
  const forged = plainToInstance(RegisterDto, {
    email: dto.email,
    displayName: dto.displayName,
    password: dto.password,
    userId: 'attacker',
    role: 'OWNER',
  });
  expect(
    await validate(forged, { whitelist: true, forbidNonWhitelisted: true }),
  ).toHaveLength(2);
});
it.each(['short', 'x'.repeat(129), null, 123])(
  'rejects invalid registration password %s',
  async (value) => {
    expect(
      await validate(
        plainToInstance(RegisterDto, {
          email: 'user@example.com',
          displayName: 'User',
          password: value,
        }),
      ),
    ).not.toHaveLength(0);
  },
);
it('accepts Unicode passwords by codepoint and rejects oversized email/name', async () => {
  expect(
    await validate(
      plainToInstance(RegisterDto, {
        email: 'u@example.com',
        displayName: 'U',
        password: '🦊'.repeat(15),
      }),
    ),
  ).toEqual([]);
  expect(
    await validate(
      plainToInstance(LoginDto, { email: 'a'.repeat(255), password }),
    ),
  ).not.toHaveLength(0);
  expect(
    await validate(
      plainToInstance(RegisterDto, {
        email: 'u@example.com',
        displayName: ' ',
        password,
      }),
    ),
  ).not.toHaveLength(0);
});
it('uses real Argon2id, random salt, and safe failed verification', async () => {
  const service = new PasswordService();
  const first = await service.hash(password);
  const second = await service.hash(password);
  expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  expect(first).not.toBe(second);
  expect(await service.verify(password, first)).toBe(true);
  expect(await service.verify('wrong', first)).toBe(false);
  expect(await service.verify(password)).toBe(false);
  expect(await service.verify(password, 'corrupt')).toBe(false);
});
it('only accepts canonical 256-bit token encodings', () => {
  const token = randomBytes(32).toString('base64url');
  expect(tokenHash(token)).toMatch(/^[0-9a-f]{64}$/);
  for (const value of [
    '',
    'a',
    'x'.repeat(1000),
    ['a'],
    undefined,
    'a'.repeat(43),
  ])
    expect(tokenHash(value)).toBeUndefined();
});
it('validates production origins, proxies, and host-prefixed cookies', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', undefined);
  expect(() => new AuthConfig()).toThrow();
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'https://app.example.com');
  const config = new AuthConfig();
  expect(config.cookieName).toBe('__Host-specbridge_session');
  expect(config.cookieOptions).toEqual({
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  expect(config.trustedProxies).toEqual([]);
  for (const value of [
    'https://app.example.com/path',
    'null',
    'http://app.example.com',
    '*',
  ]) {
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', value);
    expect(() => new AuthConfig()).toThrow();
  }
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'https://app.example.com');
  vi.stubEnv('AUTH_TRUSTED_PROXIES', 'true');
  expect(() => new AuthConfig()).toThrow();
});
it('checks origin, custom header, fetch metadata and simple content types independently', () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'http://localhost:3000');
  const guard = new CsrfGuard(new AuthConfig());
  const request = (headers: Record<string, string | undefined>, json = true) =>
    ({
      method: 'POST',
      headers,
      get: (key: string) => headers[key],
      is: () => (json ? 'application/json' : false),
    }) as unknown as Request;
  const headers = {
    origin: 'http://localhost:3000',
    'x-csrf-protection': '1',
    'content-length': '2',
  };
  expect(() => guard.check(request(headers))).not.toThrow();
  for (const changed of [
    { origin: 'null' },
    { origin: '' },
    { origin: 'http://localhost:3000.evil.test' },
    { 'x-csrf-protection': '' },
    { 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-site' },
  ]) {
    expect(() => guard.check(request({ ...headers, ...changed }))).toThrow();
  }
  expect(() => guard.check(request(headers, false))).toThrow();
});
it('limits synchronously, expires windows, isolates keys and returns Retry-After', () => {
  const service = new RateLimitService();
  try {
    service.consume('a', 2, 1000, 0);
    service.consume('a', 2, 1000, 1);
    try {
      service.consume('a', 2, 1000, 2);
      throw new Error('Expected rate limit');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        retryAfter: 1,
      });
    }
    service.consume('b', 2, 1000, 2);
    service.consume('a', 2, 1000, 1000);
    for (let i = 0; i < 9998; i++) service.consume(`key:${i}`, 1, 1000, 1000);
    expect(() => service.consume('overflow', 1, 1000, 1000)).toThrow();
    expect(() => service.consume('expired', 1, 1000, 3000)).not.toThrow();
  } finally {
    service.onModuleDestroy();
  }
});
