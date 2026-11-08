import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { migrationsFolder, openTestDatabase, rollbackTest } from './helpers.js';

let pool: Pool;
beforeAll(async () => {
  pool = await openTestDatabase();
});
afterAll(async () => {
  await pool?.end();
});
it('upgrades the actual R01 schema without resetting session age or losing records', async () => {
  const baseline = await readFile(
    join(migrationsFolder, '0000_database_foundation.sql'),
    'utf8',
  );
  const history = await readFile(
    join(migrationsFolder, '0001_immutable_history.sql'),
    'utf8',
  );
  expect(createHash('sha256').update(baseline).digest('hex')).toBe(
    '6d889c530d70c1544aa5755164a49683f2e54a7e9cd5f346da9f3b2a9c96f996',
  );
  expect(createHash('sha256').update(history).digest('hex')).toBe(
    '8d225e656539733de64267a58b14b68b82c9c6198f167ac58a25d7bbc758f98f',
  );
  const upgrade = await readFile(
    join(migrationsFolder, '0002_session_activity.sql'),
    'utf8',
  );
  await rollbackTest(pool, async (client) => {
    // Run the reviewed SQL in a transaction-local namespace. Never reset public or developer data.
    const namespace = `upgrade_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${namespace}"`);
    await client.query(`SET LOCAL search_path TO "${namespace}"`);
    await client.query(baseline.replaceAll('"public".', `"${namespace}".`));
    await client.query(history);
    const id = randomUUID();
    await client.query(
      "INSERT INTO users(id,email,display_name,password_hash) VALUES($1,'upgrade@example.test','Upgrade','fixture')",
      [id],
    );
    await client.query(
      "INSERT INTO sessions(user_id,token_hash,created_at,expires_at) VALUES($1,$2,now()-interval '2 days',now()+interval '5 days')",
      [id, 'a'.repeat(64)],
    );
    const before = (await client.query('SELECT * FROM sessions')).rows[0];
    await client.query(upgrade);
    const after = (await client.query('SELECT * FROM sessions')).rows[0];
    expect(after).toMatchObject(before);
    expect(after.last_activity_at).toEqual(before.created_at);
    expect(
      (await client.query('SELECT count(*)::int AS count FROM users')).rows[0]
        .count,
    ).toBe(1);
    await client.query(
      "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')",
      [id, 'b'.repeat(64)],
    );
    expect(
      (
        await client.query(
          'SELECT last_activity_at FROM sessions WHERE token_hash=$1',
          ['b'.repeat(64)],
        )
      ).rows[0].last_activity_at,
    ).toBeInstanceOf(Date);
  });
});
