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
it('upgrades R01–R03 requirements without rewriting content, timestamps, pointers or frozen history', async () => {
  const names = [
    '0000_database_foundation.sql',
    '0001_immutable_history.sql',
    '0002_session_activity.sql',
    '0003_requirement_draft_version.sql',
  ];
  const sql = await Promise.all(
    names.map((name) => readFile(join(migrationsFolder, name), 'utf8')),
  );
  expect(sql.map((s) => createHash('sha256').update(s).digest('hex'))).toEqual([
    '6d889c530d70c1544aa5755164a49683f2e54a7e9cd5f346da9f3b2a9c96f996',
    '8d225e656539733de64267a58b14b68b82c9c6198f167ac58a25d7bbc758f98f',
    '236ecd64b2a7d1ea437ba48a09077107e8cb789a3cced16f5a7dd080a9839ee3',
    '73d3b4839fdc64f43a420a4cf4bd15f2923e194a014a86d174a205ddd4695d68',
  ]);
  await rollbackTest(pool, async (c) => {
    const namespace = `upgrade_${randomUUID().replaceAll('-', '')}`;
    await c.query(`CREATE SCHEMA "${namespace}"`);
    await c.query(`SET LOCAL search_path TO "${namespace}"`);
    await c.query(sql[0].replaceAll('"public".', `"${namespace}".`));
    await c.query(sql[1]);
    await c.query(sql[2]);
    const f = await fixture(c);
    const before = (
      await c.query('SELECT * FROM requirements WHERE id=$1', [f.requirement])
    ).rows[0];
    const history = (
      await c.query('SELECT * FROM requirement_revisions WHERE id=$1', [
        f.revision,
      ])
    ).rows[0];
    await c.query(sql[3]);
    expect(
      (await c.query('SELECT * FROM requirements WHERE id=$1', [f.requirement]))
        .rows[0],
    ).toEqual({ ...before, draft_version: 1 });
    expect(
      (
        await c.query('SELECT * FROM requirement_revisions WHERE id=$1', [
          f.revision,
        ])
      ).rows[0],
    ).toEqual(history);
    for (const value of [0, -1])
      await rejectsSql(
        c,
        'UPDATE requirements SET draft_version=$1 WHERE id=$2',
        [value, f.requirement],
        '23514',
      );
    await rejectsSql(
      c,
      'UPDATE requirements SET draft_version=NULL WHERE id=$1',
      [f.requirement],
      '23502',
    );
    await rejectsSql(
      c,
      "UPDATE requirement_revisions SET content='Changed' WHERE id=$1",
      [f.revision],
      '23514',
    );
    const inserted = (
      await c.query(
        "INSERT INTO requirements(project_id,created_by,title,original_text) VALUES($1,$2,'New','Text') RETURNING draft_version",
        [f.project, f.owner],
      )
    ).rows[0];
    expect(inserted.draft_version).toBe(1);
  });
});
