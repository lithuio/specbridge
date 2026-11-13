import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
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
it('enforces proposal state, identity, version, expiry, payload and immutable execution receipts', async () => {
  await rollbackTest(pool, async (c) => {
    const f = await fixture(c),
      other = await fixture(c);
    const insert = `INSERT INTO copilot_proposals(requirement_id,user_id,kind,base_requirement_version,payload,sources,expires_at) VALUES($1,$2,'publish_questions',1,'{}','[]',now()+interval '24 hours') RETURNING id`;
    const id = (await c.query(insert, [f.requirement, f.owner])).rows[0].id;
    for (const patch of [
      'version=1',
      "status='EXECUTED',version=2",
      "kind='approve',version=2",
      "payload='[]',version=2",
      "payload=jsonb_build_object('text',repeat('x',100000)),version=2",
      "sources='{}',version=2",
      "expires_at=now()+interval '25 hours',version=2",
      "user_id='" + other.owner + "',version=2",
    ])
      await rejectsSql(
        c,
        `UPDATE copilot_proposals SET ${patch} WHERE id=$1`,
        [id],
        '23514',
      );
    await rejectsSql(
      c,
      `INSERT INTO copilot_proposals(requirement_id,user_id,kind,base_requirement_version,payload,sources,expires_at,status,operation_id,request_hash,result,executed_at) VALUES($1,$2,'publish_questions',1,'{}','[]',now()+interval '1 hour','EXECUTED',$3,$4,'{}',now())`,
      [f.requirement, f.owner, randomUUID(), 'a'.repeat(64)],
      '23514',
    );
    await rejectsSql(
      c,
      `INSERT INTO copilot_proposals(requirement_id,user_id,kind,base_requirement_version,change_request_id,base_change_version,payload,sources,expires_at) VALUES($1,$2,'update_change_draft',1,$3,0,'{}','[]',now()+interval '1 hour')`,
      [f.requirement, f.owner, other.change],
      '23514',
    );
    await rejectsSql(c, insert, [randomUUID(), f.owner], '23503');
    await c.query('UPDATE copilot_proposals SET version=2 WHERE id=$1', [id]);
    const op = randomUUID();
    await c.query(
      "UPDATE copilot_proposals SET version=3,status='EXECUTED',operation_id=$2,request_hash=$3,result='{}',executed_at=now() WHERE id=$1",
      [id, op, 'a'.repeat(64)],
    );
    await rejectsSql(
      c,
      'DELETE FROM copilot_proposals WHERE id=$1',
      [id],
      '23514',
    );
    await rejectsSql(
      c,
      'UPDATE copilot_proposals SET version=4 WHERE id=$1',
      [id],
      '23514',
    );
    const second = (await c.query(insert, [f.requirement, f.owner])).rows[0].id;
    await rejectsSql(
      c,
      "UPDATE copilot_proposals SET version=2,status='EXECUTED',operation_id=$2,request_hash=$3,result='{}',executed_at=now() WHERE id=$1",
      [second, op, 'b'.repeat(64)],
      '23505',
    );
    await c.query('DELETE FROM copilot_proposals WHERE id=$1', [second]);
  });
});
it('upgrades 0000–0006 without changing the original 21 tables or business data', async () => {
  const names = [
    '0000_database_foundation',
    '0001_immutable_history',
    '0002_session_activity',
    '0003_requirement_draft_version',
    '0004_project_api_tokens',
    '0005_requirement_working_drafts',
    '0006_project_documents',
    '0007_copilot_proposals',
  ];
  const statements = await Promise.all(
    names.map((n) => readFile(join(migrationsFolder, n + '.sql'), 'utf8')),
  );
  expect(createHash('sha256').update(statements[7]).digest('hex')).toBe(
    'a5a9788072b5caf6366a83f28197340f7709fb4a5c50fd2c181d21407bc66010',
  );
  await rollbackTest(pool, async (c) => {
    const namespace = `proposal_upgrade_${randomUUID().replaceAll('-', '')}`;
    await c.query(`CREATE SCHEMA "${namespace}"`);
    await c.query(`SET LOCAL search_path TO "${namespace}"`);
    for (const sql of statements.slice(0, 7))
      await c.query(sql.replaceAll('"public".', `"${namespace}".`));
    await fixture(c);
    const tables = (
      await c.query(
        'SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',
        [namespace],
      )
    ).rows as { tablename: string }[];
    expect(tables).toHaveLength(21);
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
      const columns = (
        await c.query(
          `SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2) ORDER BY table_name,ordinal_position`,
          [namespace, tables.map((t) => t.tablename)],
        )
      ).rows;
      return { rows, columns };
    };
    const before = await snapshot();
    await c.query(statements[7].replaceAll('"public".', `"${namespace}".`));
    expect(await snapshot()).toEqual(before);
    expect(
      (
        await c.query('SELECT tablename FROM pg_tables WHERE schemaname=$1', [
          namespace,
        ])
      ).rowCount,
    ).toBe(22);
  });
});
