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

// Requires explicit human approval of 0005 before running: openTestDatabase
// applies every journal entry, including this candidate migration.
let pool: Pool;
beforeAll(async () => {
  pool = await openTestDatabase();
});
afterAll(async () => {
  await pool?.end();
});

it('upgrades 0000–0004 without changing the original 16 tables or their business data', async () => {
  const names = [
    '0000_database_foundation.sql',
    '0001_immutable_history.sql',
    '0002_session_activity.sql',
    '0003_requirement_draft_version.sql',
    '0004_project_api_tokens.sql',
    '0005_requirement_working_drafts.sql',
  ];
  const statements = await Promise.all(
    names.map((name) => readFile(join(migrationsFolder, name), 'utf8')),
  );
  expect(createHash('sha256').update(statements[5]).digest('hex')).toBe(
    '3ef341ab762315d265f03ec32ab40813e32eaeec6b308fb7279297c1f0153e7c',
  );
  await rollbackTest(pool, async (c) => {
    const namespace = `working_draft_upgrade_${randomUUID().replaceAll('-', '')}`;
    await c.query(`CREATE SCHEMA "${namespace}"`);
    await c.query(`SET LOCAL search_path TO "${namespace}"`);
    for (const sql of statements.slice(0, 5))
      await c.query(sql.replaceAll('"public".', `"${namespace}".`));
    await fixture(c);
    const tables = (
      await c.query(
        'SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',
        [namespace],
      )
    ).rows as { tablename: string }[];
    expect(tables).toHaveLength(16);
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
          `SELECT table_name,column_name,data_type,is_nullable,column_default
        FROM information_schema.columns WHERE table_schema=$1 AND table_name = ANY($2)
        ORDER BY table_name,ordinal_position`,
          [namespace, tables.map((t) => t.tablename)],
        )
      ).rows;
      return { rows, columns };
    };
    const before = await snapshot();
    await c.query(statements[5].replaceAll('"public".', `"${namespace}".`));
    expect(await snapshot()).toEqual(before);
    expect(
      (
        await c.query('SELECT tablename FROM pg_tables WHERE schemaname=$1', [
          namespace,
        ])
      ).rowCount,
    ).toBe(18);
  });
});

it('enforces separate author/kind drafts and bounded payloads, versions and references', async () => {
  await rollbackTest(pool, async (c) => {
    const f = await fixture(c);
    const insert = `INSERT INTO requirement_working_drafts(requirement_id,user_id,kind,base_requirement_version,body)
      VALUES($1,$2,$3,1,'{}') RETURNING id`;
    const draft = (await c.query(insert, [f.requirement, f.owner, 'clarify']))
      .rows[0].id;
    await c.query(insert, [f.requirement, f.owner, 'specification']);
    await c.query(insert, [f.requirement, f.client, 'clarify']);
    await rejectsSql(c, insert, [f.requirement, f.owner, 'clarify'], '23505');
    await rejectsSql(c, insert, [randomUUID(), f.owner, 'clarify'], '23503');
    await rejectsSql(
      c,
      insert,
      [f.requirement, randomUUID(), 'clarify'],
      '23503',
    );
    await rejectsSql(c, insert, [f.requirement, f.other, 'approve'], '23514');
    for (const name of ['version', 'base_requirement_version'])
      await rejectsSql(
        c,
        `UPDATE requirement_working_drafts SET ${name}=0 WHERE id=$1`,
        [draft],
        '23514',
      );
    for (const name of ['body', 'publication']) {
      await rejectsSql(
        c,
        `UPDATE requirement_working_drafts SET ${name}='[]' WHERE id=$1`,
        [draft],
        '23514',
      );
      await rejectsSql(
        c,
        `UPDATE requirement_working_drafts SET ${name}='null' WHERE id=$1`,
        [draft],
        '23514',
      );
      await rejectsSql(
        c,
        `UPDATE requirement_working_drafts SET ${name}=NULL WHERE id=$1`,
        [draft],
        '23502',
      );
      await rejectsSql(
        c,
        `UPDATE requirement_working_drafts SET ${name}=$1 WHERE id=$2`,
        [JSON.stringify({ text: '文'.repeat(35000) }), draft],
        '23514',
      );
    }
    await rejectsSql(
      c,
      "UPDATE requirement_working_drafts SET updated_at=created_at-interval '1 second' WHERE id=$1",
      [draft],
      '23514',
    );
    await rejectsSql(
      c,
      "UPDATE requirement_working_drafts SET updated_at='infinity' WHERE id=$1",
      [draft],
      '23514',
    );
    // A personal edit is independent of the aggregate revision and status.
    const before = (
      await c.query('SELECT * FROM requirements WHERE id=$1', [f.requirement])
    ).rows;
    await c.query(
      'UPDATE requirement_working_drafts SET version=version+1,body=$1 WHERE id=$2 AND version=1',
      [JSON.stringify({ questions: [] }), draft],
    );
    expect(
      (
        await c.query(
          'UPDATE requirement_working_drafts SET version=version+1 WHERE id=$1 AND version=1',
          [draft],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (await c.query('SELECT * FROM requirements WHERE id=$1', [f.requirement]))
        .rows,
    ).toEqual(before);
  });
});

it('prevents duplicate consumption and retains receipts after deleting a personal work product', async () => {
  await rollbackTest(pool, async (c) => {
    const f = await fixture(c);
    const draft = (
      await c.query(
        `INSERT INTO requirement_working_drafts(requirement_id,user_id,kind,base_requirement_version,body)
      VALUES($1,$2,'clarify',1,'{}') RETURNING id`,
        [f.requirement, f.owner],
      )
    ).rows[0].id;
    const id = randomUUID();
    const hash = createHash('sha256').update('synthetic request').digest('hex');
    const insert = `INSERT INTO requirement_publish_receipts(id,requirement_id,user_id,draft_id,draft_version,kind,request_hash,result)
      VALUES($1,$2,$3,$4,$5,'clarify',$6,'{"requirementVersion":2,"workingDraftVersion":2,"clarificationIds":[]}')`;
    const values = [id, f.requirement, f.owner, draft, 1, hash];
    await c.query(insert, values);
    await rejectsSql(c, insert, values, '23505');
    await rejectsSql(c, insert, [randomUUID(), ...values.slice(1)], '23505');
    await rejectsSql(
      c,
      insert,
      [randomUUID(), randomUUID(), f.owner, draft, 2, hash],
      '23503',
    );
    await rejectsSql(
      c,
      insert,
      [randomUUID(), f.requirement, randomUUID(), draft, 2, hash],
      '23503',
    );
    for (const badHash of ['short', 'A'.repeat(64), 'z'.repeat(64)])
      await rejectsSql(
        c,
        'UPDATE requirement_publish_receipts SET request_hash=$1 WHERE id=$2',
        [badHash, id],
        '23514',
      );
    for (const body of [
      '[]',
      'null',
      JSON.stringify({ text: 'x'.repeat(8193) }),
    ])
      await rejectsSql(
        c,
        'UPDATE requirement_publish_receipts SET result=$1 WHERE id=$2',
        [body, id],
        '23514',
      );
    await rejectsSql(
      c,
      'UPDATE requirement_publish_receipts SET draft_version=0 WHERE id=$1',
      [id],
      '23514',
    );
    await rejectsSql(
      c,
      "UPDATE requirement_publish_receipts SET kind='approve' WHERE id=$1",
      [id],
      '23514',
    );
    await rejectsSql(
      c,
      "UPDATE requirement_publish_receipts SET created_at='infinity' WHERE id=$1",
      [id],
      '23514',
    );
    await c.query('DELETE FROM requirement_working_drafts WHERE id=$1', [
      draft,
    ]);
    expect(
      (
        await c.query(
          'SELECT id FROM requirement_publish_receipts WHERE id=$1',
          [id],
        )
      ).rowCount,
    ).toBe(1);
    expect(
      (
        await c.query('SELECT id FROM requirement_revisions WHERE id=$1', [
          f.revision,
        ])
      ).rowCount,
    ).toBe(1);
  });
});
