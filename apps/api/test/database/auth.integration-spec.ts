import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { AuthRepository } from '../../src/auth/auth.repository.js';
import { SessionService, tokenHash } from '../../src/auth/session.service.js';
import { PasswordService } from '../../src/auth/password.service.js';
import * as schema from '../../src/database/schema/index.js';
import { openTestDatabase } from './helpers.js';

let pool: Pool;
let repository: AuthRepository;
let sessions: SessionService;
const ids: string[] = [];
beforeAll(async () => {
  pool = await openTestDatabase();
  const db = drizzle(pool, { schema });
  repository = new AuthRepository({ db, transaction: db.transaction.bind(db) });
  sessions = new SessionService(repository);
});
afterAll(async () => {
  if (!pool) return;
  await pool.query('DELETE FROM sessions WHERE user_id = ANY($1::uuid[])', [
    ids,
  ]);
  await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
  await pool.end();
});
async function user() {
  const result = await repository.register(
    `${randomUUID()}@example.test`,
    'Auth test',
    await new PasswordService().hash('integration password value'),
  );
  ids.push(result!.id);
  return result!.id;
}
it('stores Argon2id and arbitrates concurrent case-insensitive registration', async () => {
  const email = `${randomUUID()}@example.test`;
  const hash = await new PasswordService().hash('integration password value');
  const results = await Promise.all([
    repository.register(email, 'User', hash),
    repository.register(email.toUpperCase(), 'User', hash),
  ]);
  const successes = results.filter((r) => r !== undefined);
  expect(successes).toHaveLength(1);
  ids.push(successes[0]!.id);
  const stored = await repository.findCredentials(email);
  expect(stored?.passwordHash).toBe(hash);
});
it('stores only a digest, rotates tokens and revokes the previous cookie', async () => {
  const id = await user();
  const first = await sessions.create(id);
  const auth = await sessions.authenticate(first.token);
  expect(auth?.user.id).toBe(id);
  expect(Object.keys(auth!.user).sort()).toEqual([
    'createdAt',
    'displayName',
    'email',
    'id',
  ]);
  const second = await sessions.create(id, first.token);
  expect(await sessions.authenticate(first.token)).toBeUndefined();
  expect(await sessions.authenticate(second.token)).toBeDefined();
  const row = (
    await pool.query('SELECT * FROM sessions WHERE token_hash=$1', [
      tokenHash(second.token),
    ])
  ).rows[0];
  expect(JSON.stringify(row)).not.toContain(second.token);
  expect(
    new Date(row.expires_at).getTime() - new Date(row.created_at).getTime(),
  ).toBe(7 * 86400000);
  await sessions.revoke((await sessions.authenticate(second.token))!.sessionId);
  expect(await sessions.authenticate(second.token)).toBeUndefined();
});
it('enforces absolute/idle boundaries and activity never extends the absolute deadline', async () => {
  const id = await user();
  const created = await sessions.create(id);
  const hash = tokenHash(created.token);
  await pool.query(
    "UPDATE sessions SET last_activity_at=now()-interval '23 hours' WHERE token_hash=$1",
    [hash],
  );
  expect(await sessions.authenticate(created.token)).toBeDefined();
  const touched = (
    await pool.query('SELECT * FROM sessions WHERE token_hash=$1', [hash])
  ).rows[0];
  expect(new Date(touched.expires_at).toISOString()).toBe(
    created.expiresAt.toISOString(),
  );
  expect(
    Date.now() - new Date(touched.last_activity_at).getTime(),
  ).toBeLessThan(5000);
  await pool.query(
    "UPDATE sessions SET last_activity_at=now()-interval '24 hours' WHERE token_hash=$1",
    [hash],
  );
  expect(await sessions.authenticate(created.token)).toBeUndefined();
  await pool.query(
    'UPDATE sessions SET last_activity_at=now(), expires_at=now() WHERE token_hash=$1',
    [hash],
  );
  expect(await sessions.authenticate(created.token)).toBeUndefined();
});
it('rolls back old-session revocation when replacement insertion fails', async () => {
  const id = await user();
  const first = await sessions.create(id);
  const second = await sessions.create(id);
  await expect(
    repository.rotateSession(
      id,
      tokenHash(second.token)!,
      tokenHash(first.token),
    ),
  ).rejects.toThrow();
  expect(await sessions.authenticate(first.token)).toBeDefined();
});
it('does not revive a session when revoke races with activity refresh', async () => {
  const created = await sessions.create(await user());
  const auth = (await sessions.authenticate(created.token))!;
  await Promise.all([
    sessions.revoke(auth.sessionId),
    sessions.authenticate(created.token),
  ]);
  expect(await sessions.authenticate(created.token)).toBeUndefined();
  expect(await sessions.authenticate('invalid')).toBeUndefined();
});
