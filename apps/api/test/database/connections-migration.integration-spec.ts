import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'pg';
import {
  fixture,
  openTestDatabase,
  rollbackTest,
  rejectsSql,
  migrationsFolder,
} from './helpers.js';
let pool: Pool;
beforeAll(async () => {
  pool = await openTestDatabase();
});
afterAll(async () => {
  await pool?.end();
});
it('enforces session/Token binding, immutable grant identity, single exchange and retained receipts', async () => {
  await rollbackTest(pool, async (c) => {
    const f = await fixture(c),
      other = await fixture(c);
    const sid = (
      await c.query(
        "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day') RETURNING id",
        [f.owner, '1'.repeat(64)],
      )
    ).rows[0].id;
    const insert =
      "INSERT INTO agent_connection_grants(id,project_id,user_id,session_id,code_hash,challenge,state_hash,callback_port,token_name,token_expires_in_days,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,49152,'Codex',1,now()+interval '5 minutes')";
    const args = [
      randomUUID(),
      f.project,
      f.owner,
      sid,
      'a'.repeat(64),
      'A'.repeat(43),
      'b'.repeat(64),
    ];
    await c.query(insert, args);
    await rejectsSql(
      c,
      insert,
      [
        randomUUID(),
        f.project,
        other.owner,
        sid,
        'c'.repeat(64),
        'A'.repeat(43),
        'b'.repeat(64),
      ],
      '23514',
    );
    await rejectsSql(
      c,
      insert,
      [
        randomUUID(),
        f.project,
        f.owner,
        sid,
        'a'.repeat(64),
        'A'.repeat(43),
        'b'.repeat(64),
      ],
      '23505',
    );
    for (const patch of [
      "challenge='" + 'B'.repeat(43) + "'",
      "status='EXCHANGED',completed_at=now()",
      'callback_port=80',
      'token_expires_in_days=90',
      "expires_at=now()+interval '6 minutes'",
      "project_id='" + other.project + "'",
    ])
      await rejectsSql(
        c,
        `UPDATE agent_connection_grants SET ${patch} WHERE id=$1`,
        [args[0]],
        '23514',
      );
    await rejectsSql(
      c,
      'DELETE FROM agent_connection_grants WHERE id=$1',
      [args[0]],
      '23514',
    );
    const token = async (project: string) =>
      (
        await c.query(
          "INSERT INTO api_tokens(project_id,user_id,name,token_hash,scopes,expires_at) VALUES($1,$2,'Codex',$3,ARRAY['approved_specs:read'],now()+interval '1 day') RETURNING id",
          [
            project,
            f.owner,
            createHash('sha256').update(randomUUID()).digest('hex'),
          ],
        )
      ).rows[0].id;
    const wrong = await token(other.project);
    await rejectsSql(
      c,
      "UPDATE agent_connection_grants SET status='EXCHANGED',api_token_id=$2,completed_at=clock_timestamp() WHERE id=$1",
      [args[0], wrong],
      '23514',
    );
    const valid = await token(f.project);
    await c.query(
      "UPDATE agent_connection_grants SET status='EXCHANGED',api_token_id=$2,completed_at=clock_timestamp() WHERE id=$1",
      [args[0], valid],
    );
    for (const query of [
      'DELETE FROM agent_connection_grants WHERE id=$1',
      "UPDATE agent_connection_grants SET status='CANCELLED',api_token_id=NULL WHERE id=$1",
    ])
      await rejectsSql(c, query, [args[0]], '23514');
    await c.query(
      'UPDATE api_tokens SET revoked_at=clock_timestamp() WHERE id=$1',
      [valid],
    );
    expect(
      (
        await c.query(
          'SELECT status FROM agent_connection_grants WHERE id=$1',
          [args[0]],
        )
      ).rows[0].status,
    ).toBe('EXCHANGED');
    const next = [
      randomUUID(),
      f.project,
      f.owner,
      sid,
      'd'.repeat(64),
      'A'.repeat(43),
      'b'.repeat(64),
    ];
    await c.query(insert, next);
    await c.query(
      "UPDATE agent_connection_grants SET status='CANCELLED',completed_at=clock_timestamp() WHERE id=$1",
      [next[0]],
    );
    await rejectsSql(
      c,
      "UPDATE agent_connection_grants SET status='AUTHORIZED',completed_at=NULL WHERE id=$1",
      [next[0]],
      '23514',
    );
  });
});
it('upgrades the approved 0000–0007 schema without changing the original 22 tables or data', async () => {
  const journal = JSON.parse(
    await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
  ) as { entries: { tag: string }[] };
  const statements = await Promise.all(
    journal.entries.map((e) =>
      readFile(join(migrationsFolder, e.tag + '.sql'), 'utf8'),
    ),
  );
  expect(createHash('sha256').update(statements[8]).digest('hex')).toBe(
    '2fa26bd9bee6c4f420d9cdd3f8adb9b231fa2c2a2ad5ab77f1edfb087364d74b',
  );
  await rollbackTest(pool, async (c) => {
    const namespace = 'connection_upgrade_' + randomUUID().replaceAll('-', '');
    await c.query(`CREATE SCHEMA "${namespace}"`);
    await c.query(`SET LOCAL search_path TO "${namespace}"`);
    for (const sql of statements.slice(0, 8))
      await c.query(sql.replaceAll('"public".', `"${namespace}".`));
    await fixture(c);
    const tables = (
      await c.query(
        'SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',
        [namespace],
      )
    ).rows as { tablename: string }[];
    expect(tables).toHaveLength(22);
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
      return {
        columns: (
          await c.query(
            'SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2) ORDER BY table_name,ordinal_position',
            [namespace, tables.map((t) => t.tablename)],
          )
        ).rows,
        rows,
      };
    };
    const before = await snapshot();
    await c.query(statements[8].replaceAll('"public".', `"${namespace}".`));
    expect(await snapshot()).toEqual(before);
    expect(
      (
        await c.query('SELECT tablename FROM pg_tables WHERE schemaname=$1', [
          namespace,
        ])
      ).rows,
    ).toHaveLength(23);
  });
});
