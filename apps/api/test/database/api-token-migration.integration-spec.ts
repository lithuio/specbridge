import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Pool } from 'pg';
import {
  fixture,
  migrationsFolder,
  openTestDatabase,
  rejectsSql,
  rollbackTest,
} from './helpers.js';
let pool: Pool;
beforeAll(async () => {
  pool = await openTestDatabase();
});
afterAll(async () => {
  await pool?.end();
});
it('applies the approved 0004 hash to the previous schema without changing existing business rows', async () => {
  const names = [
    '0000_database_foundation.sql',
    '0001_immutable_history.sql',
    '0002_session_activity.sql',
    '0003_requirement_draft_version.sql',
    '0004_project_api_tokens.sql',
  ];
  const statements = await Promise.all(
    names.map((n) => readFile(join(migrationsFolder, n), 'utf8')),
  );
  expect(createHash('sha256').update(statements[4]).digest('hex')).toBe(
    '7133f1d8fc11ef93f84314dede4257cbba23452dec9ca49a2fdb57ce5cc0bd0a',
  );
  await rollbackTest(pool, async (c) => {
    const namespace = `token_upgrade_${randomUUID().replaceAll('-', '')}`;
    await c.query(`CREATE SCHEMA "${namespace}"`);
    await c.query(`SET LOCAL search_path TO "${namespace}"`);
    for (const s of statements.slice(0, 4))
      await c.query(s.replaceAll('"public".', `"${namespace}".`));
    await fixture(c);
    const tables = (
      await c.query(
        'SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',
        [namespace],
      )
    ).rows as { tablename: string }[];
    expect(tables).toHaveLength(15);
    const snapshot = async () => {
      const rows: unknown[] = [];
      for (const { tablename } of tables)
        rows.push(
          (
            await c.query(
              `SELECT to_jsonb(t) AS row FROM "${tablename}" t ORDER BY to_jsonb(t)::text`,
            )
          ).rows,
        );
      return rows;
    };
    const before = await snapshot();
    await c.query(statements[4].replaceAll('"public".', `"${namespace}".`));
    expect(await snapshot()).toEqual(before);
    const columns = (
      await c.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='api_tokens' ORDER BY ordinal_position",
        [namespace],
      )
    ).rows.map((r) => r.column_name);
    expect(columns).toEqual([
      'id',
      'project_id',
      'user_id',
      'name',
      'token_hash',
      'scopes',
      'created_at',
      'expires_at',
      'revoked_at',
    ]);
    const indexes = (
      await c.query(
        "SELECT indexname FROM pg_indexes WHERE schemaname=$1 AND tablename='api_tokens'",
        [namespace],
      )
    ).rows.map((r) => r.indexname);
    expect(indexes.sort((a: string, b: string) => a.localeCompare(b))).toEqual([
      'api_tokens_pkey',
      'api_tokens_project_created_idx',
      'api_tokens_token_hash_unique',
    ]);
  });
});
it('enforces digest uniqueness, fixed scope, names, finite lifetime, revocation times and restrictive references', async () => {
  await rollbackTest(pool, async (c) => {
    const f = await fixture(c),
      hash = createHash('sha256').update(randomUUID()).digest('hex');
    const insert =
      "INSERT INTO api_tokens(project_id,user_id,name,token_hash,scopes,expires_at) VALUES($1,$2,'Local',$3,ARRAY['approved_specs:read'],now()+interval '1 day') RETURNING id";
    const id = (await c.query(insert, [f.project, f.owner, hash])).rows[0].id;
    await rejectsSql(c, insert, [f.project, f.owner, hash], '23505');
    await rejectsSql(
      c,
      insert,
      [randomUUID(), f.owner, 'a'.repeat(64)],
      '23503',
    );
    await rejectsSql(
      c,
      insert,
      [f.project, randomUUID(), 'a'.repeat(64)],
      '23503',
    );
    for (const value of ['', ' ', 'x'.repeat(101)])
      await rejectsSql(
        c,
        'UPDATE api_tokens SET name=$1 WHERE id=$2',
        [value, id],
        '23514',
      );
    for (const value of ['short', 'A'.repeat(64), 'z'.repeat(64)])
      await rejectsSql(
        c,
        'UPDATE api_tokens SET token_hash=$1 WHERE id=$2',
        [value, id],
        '23514',
      );
    for (const value of [
      [],
      ['write'],
      ['approved_specs:read', 'approved_specs:read'],
      ['approved_specs:read', 'write'],
      [['approved_specs:read']],
      [null],
    ])
      await rejectsSql(
        c,
        'UPDATE api_tokens SET scopes=$1 WHERE id=$2',
        [value, id],
        '23514',
      );
    for (const expression of [
      "created_at+interval '23 hours'",
      "created_at+interval '91 days'",
      "'infinity'::timestamptz",
    ])
      await rejectsSql(
        c,
        `UPDATE api_tokens SET expires_at=${expression} WHERE id=$1`,
        [id],
        '23514',
      );
    for (const expression of [
      "created_at-interval '1 second'",
      "'infinity'::timestamptz",
    ])
      await rejectsSql(
        c,
        `UPDATE api_tokens SET revoked_at=${expression} WHERE id=$1`,
        [id],
        '23514',
      );
    for (const col of [
      'project_id',
      'user_id',
      'name',
      'token_hash',
      'scopes',
      'created_at',
      'expires_at',
    ])
      await rejectsSql(
        c,
        `UPDATE api_tokens SET ${col}=NULL WHERE id=$1`,
        [id],
        '23502',
      );
    // Dedicated parents make these failures specifically attributable to the token FKs.
    const project = randomUUID(),
      user = randomUUID();
    await c.query(
      "INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,'Token user','fixture')",
      [user, user + '@example.test'],
    );
    await c.query(
      "INSERT INTO projects(id,workspace_id,name,baseline_scope) VALUES($1,$2,'Token project','Scope')",
      [project, f.workspace],
    );
    await c.query(insert, [project, user, 'b'.repeat(64)]);
    await rejectsSql(c, 'DELETE FROM projects WHERE id=$1', [project], '23503');
    await rejectsSql(c, 'DELETE FROM users WHERE id=$1', [user], '23503');
    await c.query(
      "UPDATE api_tokens SET expires_at=created_at+interval '90 days',revoked_at=now() WHERE id=$1",
      [id],
    );
  });
});
