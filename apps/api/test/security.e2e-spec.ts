import { Test } from '@nestjs/testing';
import { Controller, Get, Logger, type INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';

@Controller('api/v1/default-protection')
class ProtectedController {
  @Get() get() {
    return { unsafe: true };
  }
}
let app: INestApplication;
beforeEach(async () => {
  vi.stubEnv('DATABASE_URL', undefined);
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'http://localhost:3000');
  vi.stubEnv('NODE_ENV', 'test');
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProtectedController],
  }).compile();
  app = module.createNestApplication();
  configureApp(app);
  await app.init();
});
afterEach(async () => {
  await app?.close();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it('requires authentication on me and undecorated controllers without querying a DB', async () => {
  await request(app.getHttpServer()).get('/api/v1/me').expect(401);
  await request(app.getHttpServer())
    .get('/api/v1/default-protection')
    .expect(401);
});
it('public registration still requires CSRF and explicit DTO validation', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({})
    .expect(403);
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .set({ Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1' })
    .send({
      email: 'user@example.test',
      password: 'short-secret-sentinel',
      displayName: 'User',
      userId: 'forged',
    })
    .expect(400);
  expect(JSON.stringify(response.body)).not.toContain('sentinel');
});
it('fails closed with a safe error when the database is unavailable', async () => {
  const errorLog = vi
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => {});
  const token = randomBytes(32).toString('base64url');
  const response = await request(app.getHttpServer())
    .get('/api/v1/me')
    .set('Cookie', `specbridge_session=${token}`)
    .expect(500);
  expect(response.body.error.code).toBe('INTERNAL_ERROR');
  expect(JSON.stringify(response.body).includes(token)).toBe(false);
  expect(JSON.stringify(errorLog.mock.calls).includes(token)).toBe(false);
  expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
});
