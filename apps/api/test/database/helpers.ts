import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { testDatabaseUrl } from '../../src/database/database.config.js';

export const migrationsFolder = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
);

export async function openTestDatabase(): Promise<Pool> {
  const pool = new Pool({
    connectionString: testDatabaseUrl(process.env.TEST_DATABASE_URL),
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  pool.on('error', () => {
    throw new Error('Test database connection failed');
  });
  try {
    const result = await pool.query(
      'SELECT current_database() AS name, current_user AS role',
    );
    if (
      result.rows[0].name !== 'specbridge_test' ||
      result.rows[0].role !== 'specbridge_test'
    ) {
      throw new Error('Unexpected test database identity');
    }
    await migrate(drizzle(pool), { migrationsFolder });
    return pool;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

// These fixtures exercise relational storage, not an implemented approval workflow.
export async function fixture(client: Pick<PoolClient, 'query'>) {
  const f = {
    owner: randomUUID(),
    client: randomUUID(),
    other: randomUUID(),
    workspace: randomUUID(),
    project: randomUUID(),
    requirement: randomUUID(),
    revision: randomUUID(),
    change: randomUUID(),
    version: randomUUID(),
  };
  for (const user of [f.owner, f.client, f.other]) {
    await client.query(
      'INSERT INTO users(id,email,display_name,password_hash) VALUES ($1,$2,$3,$4)',
      [
        user,
        `${user}@example.test`,
        'Test user',
        'test-fixture-not-a-password-hash',
      ],
    );
  }
  await client.query(
    'INSERT INTO workspaces(id,name,owner_id) VALUES ($1,$2,$3)',
    [f.workspace, 'Test workspace', f.owner],
  );
  await client.query(
    "INSERT INTO workspace_members(workspace_id,user_id,role) VALUES ($1,$2,'OWNER')",
    [f.workspace, f.owner],
  );
  await client.query(
    'INSERT INTO projects(id,workspace_id,name,baseline_scope) VALUES ($1,$2,$3,$4)',
    [f.project, f.workspace, 'Test project', 'Initial reference'],
  );
  await client.query(
    'INSERT INTO requirements(id,project_id,created_by,title,original_text) VALUES ($1,$2,$3,$4,$5)',
    [f.requirement, f.project, f.owner, 'Test requirement', 'Original text'],
  );
  await client.query(
    'INSERT INTO requirement_revisions(id,requirement_id,revision_no,content,acceptance_criteria,created_by) VALUES ($1,$2,1,$3,$4,$5)',
    [
      f.revision,
      f.requirement,
      'Frozen requirement',
      '["Observable result"]',
      f.owner,
    ],
  );
  await client.query(
    'UPDATE requirements SET latest_revision_id=$1 WHERE id=$2',
    [f.revision, f.requirement],
  );
  await client.query(
    'INSERT INTO change_requests(id,requirement_id,draft_requirement_revision_id,created_by) VALUES ($1,$2,$3,$4)',
    [f.change, f.requirement, f.revision, f.owner],
  );
  await client.query(
    `INSERT INTO change_request_versions(id,change_request_id,version_no,requirement_revision_id,
    scope_snapshot,estimate_hours,cost_delta_minor,currency,schedule_delta_days,acceptance_criteria,submitted_by)
    VALUES ($1,$2,1,$3,'Frozen scope',1.25,-500,'CNY',-1,'["Observable result"]',$4)`,
    [f.version, f.change, f.revision, f.owner],
  );
  await client.query(
    'UPDATE change_requests SET active_version_id=$1 WHERE id=$2',
    [f.version, f.change],
  );
  return f;
}

export async function rollbackTest(
  pool: Pool,
  work: (client: PoolClient) => Promise<void>,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await work(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

export async function rejectsSql(
  client: PoolClient,
  sql: string,
  values: unknown[],
  code: string,
) {
  await client.query('SAVEPOINT expected_failure');
  try {
    await expect(client.query(sql, values)).rejects.toMatchObject({ code });
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT expected_failure');
  }
}
