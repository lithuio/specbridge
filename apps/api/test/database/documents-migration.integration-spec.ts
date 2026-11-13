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

// Requires explicit human approval of 0006 before running: openTestDatabase
// applies every journal entry, including this candidate migration.
let pool: Pool;
beforeAll(async () => {
  pool = await openTestDatabase();
});

it('enforces READY-only pointers, immutable terminal versions/chunks and exact parent chains', async () => {
  await rollbackTest(pool, async (c) => {
    const a = await fixture(c),
      b = await fixture(c);
    const doc = (
      await c.query(
        'INSERT INTO project_documents(project_id,title,created_by) VALUES($1,$2,$3) RETURNING id',
        [a.project, 'Background', a.owner],
      )
    ).rows[0].id;
    const insert = `INSERT INTO project_document_versions(project_id,document_id,version_no,original_name,media_type,size_bytes,blob_id,sha256,created_by)
      VALUES($1,$2,$3,'sample.txt','text/plain',10,$4,$5,$6) RETURNING id`;
    const values = [a.project, doc, 1, randomUUID(), 'a'.repeat(64), a.owner];
    const v = (await c.query(insert, values)).rows[0].id;
    await rejectsSql(
      c,
      insert,
      [b.project, doc, 2, randomUUID(), 'a'.repeat(64), a.owner],
      '23503',
    );
    await rejectsSql(c, insert, values, '23505');
    await rejectsSql(
      c,
      'UPDATE project_documents SET shared_version_id=$1 WHERE id=$2',
      [v, doc],
      '23514',
    );
    await rejectsSql(
      c,
      "UPDATE project_document_versions SET status='READY',parser_version='test',completed_at=now(),extracted_chars=10 WHERE id=$1",
      [v],
      '23514',
    );
    const add =
      "INSERT INTO project_document_chunks(project_id,document_id,version_id,ordinal,locator_kind,locator_start,locator_end,content) VALUES($1,$2,$3,$4,'paragraph',1,1,'Hello😀') RETURNING id";
    await rejectsSql(c, add, [b.project, doc, v, 1], '23503');
    const chunk = (await c.query(add, [a.project, doc, v, 1])).rows[0].id;
    await rejectsSql(c, add, [a.project, doc, v, 1], '23505');
    await rejectsSql(
      c,
      "UPDATE project_document_versions SET status='FAILED',error_code='INVALID_FILE',completed_at=now() WHERE id=$1",
      [v],
      '23514',
    );
    await c.query(
      "UPDATE project_document_versions SET status='READY',parser_version='test',completed_at=now(),extracted_chars=6 WHERE id=$1",
      [v],
    );
    await c.query(
      'UPDATE project_documents SET current_version_id=$1,shared_version_id=$1 WHERE id=$2',
      [v, doc],
    );
    for (const statement of [
      "UPDATE project_document_versions SET original_name='changed' WHERE id=$1",
      'DELETE FROM project_document_versions WHERE id=$1',
    ])
      await rejectsSql(c, statement, [v], '23514');
    for (const statement of [
      "UPDATE project_document_chunks SET content='changed' WHERE id=$1",
      'DELETE FROM project_document_chunks WHERE id=$1',
    ])
      await rejectsSql(c, statement, [chunk], '23514');
    await rejectsSql(c, add, [a.project, doc, v, 2], '23514');
    const failed = (
      await c.query(insert, [
        a.project,
        doc,
        2,
        randomUUID(),
        'a'.repeat(64),
        a.owner,
      ])
    ).rows[0].id;
    await c.query(
      "UPDATE project_document_versions SET status='FAILED',error_code='NO_TEXT',completed_at=now() WHERE id=$1",
      [failed],
    );
    await rejectsSql(
      c,
      'UPDATE project_documents SET current_version_id=$1 WHERE id=$2',
      [failed, doc],
      '23514',
    );
    expect(
      (
        await c.query(
          'SELECT current_version_id,shared_version_id FROM project_documents WHERE id=$1',
          [doc],
        )
      ).rows[0],
    ).toEqual({ current_version_id: v, shared_version_id: v });
  });
});
afterAll(async () => {
  await pool?.end();
});

it('serializes chunk insertion against a concurrent READY transition in real PostgreSQL', async () => {
  const f = await fixture(pool);
  const doc = (
    await pool.query(
      "INSERT INTO project_documents(project_id,title,created_by) VALUES($1,'Race',$2) RETURNING id",
      [f.project, f.owner],
    )
  ).rows[0].id;
  const v = (
    await pool.query(
      `INSERT INTO project_document_versions(project_id,document_id,version_no,original_name,media_type,size_bytes,blob_id,sha256,created_by) VALUES($1,$2,1,'race.txt','text/plain',1,$3,$4,$5) RETURNING id`,
      [f.project, doc, randomUUID(), 'a'.repeat(64), f.owner],
    )
  ).rows[0].id;
  const insert = `INSERT INTO project_document_chunks(project_id,document_id,version_id,ordinal,locator_kind,locator_start,locator_end,content) VALUES($1,$2,$3,$4,'paragraph',1,1,'x')`;
  await pool.query(insert, [f.project, doc, v, 1]);
  const writer = await pool.connect(),
    contender = await pool.connect();
  try {
    await writer.query('BEGIN');
    await writer.query(
      'SELECT id FROM project_document_versions WHERE id=$1 FOR UPDATE',
      [v],
    );
    const pid = (await contender.query('SELECT pg_backend_pid() AS id')).rows[0]
      .id;
    const waiting = contender.query(insert, [f.project, doc, v, 2]).then(
      () => ({ code: 'UNEXPECTED_SUCCESS' }),
      (e: { code: string }) => e,
    );
    let blocked = false;
    for (let n = 0; n < 200; n++) {
      if (
        (
          await pool.query(
            'SELECT 1 FROM pg_stat_activity WHERE pid=$1 AND cardinality(pg_blocking_pids(pid))>0',
            [pid],
          )
        ).rowCount
      ) {
        blocked = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(blocked).toBe(true);
    await writer.query(
      `UPDATE project_document_versions SET status='READY',parser_version='fixture',extracted_chars=1,completed_at=now() WHERE id=$1`,
      [v],
    );
    await writer.query('COMMIT');
    expect(await waiting).toMatchObject({ code: '23514' });
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS n FROM project_document_chunks WHERE version_id=$1',
          [v],
        )
      ).rows[0].n,
    ).toBe(1);
  } finally {
    await writer.query('ROLLBACK');
    writer.release();
    contender.release();
  }
});

it('upgrades 0000–0005 without changing the original 18 tables or their business data', async () => {
  const names = [
    '0000_database_foundation.sql',
    '0001_immutable_history.sql',
    '0002_session_activity.sql',
    '0003_requirement_draft_version.sql',
    '0004_project_api_tokens.sql',
    '0005_requirement_working_drafts.sql',
    '0006_project_documents.sql',
  ];
  const statements = await Promise.all(
    names.map((name) => readFile(join(migrationsFolder, name), 'utf8')),
  );
  expect(createHash('sha256').update(statements[6]).digest('hex')).toBe(
    '6efe3cd862b3167478ce1be8095a791379eae39852801d7f0616c635516272e4',
  );
  await rollbackTest(pool, async (c) => {
    const namespace = `document_upgrade_${randomUUID().replaceAll('-', '')}`;
    await c.query(`CREATE SCHEMA "${namespace}"`);
    await c.query(`SET LOCAL search_path TO "${namespace}"`);
    for (const sql of statements.slice(0, 6))
      await c.query(sql.replaceAll('"public".', `"${namespace}".`));
    await fixture(c);
    const tables = (
      await c.query(
        'SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',
        [namespace],
      )
    ).rows as { tablename: string }[];
    expect(tables).toHaveLength(18);
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
    await c.query(statements[6].replaceAll('"public".', `"${namespace}".`));
    expect(await snapshot()).toEqual(before);
    expect(
      (
        await c.query('SELECT tablename FROM pg_tables WHERE schemaname=$1', [
          namespace,
        ])
      ).rowCount,
    ).toBe(21);
  });
});
