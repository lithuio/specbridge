import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { tokenHash } from '../../src/auth/session.service.js';
import type { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import type { ProjectsService } from '../../src/projects/projects.service.js';
export async function account(pool: Pool) {
  const id = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const email = `${id}@example.test`;
  await pool.query(
    'INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)',
    [id, email, 'RBAC user', 'fixture-not-for-login'],
  );
  await pool.query(
    "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [id, tokenHash(token)],
  );
  return { id, email, cookie: `specbridge_session=${token}` };
}
export async function domain(
  pool: Pool,
  workspaces: WorkspacesService,
  projects: ProjectsService,
) {
  const owner = await account(pool);
  const developer = await account(pool);
  const client = await account(pool);
  const outsider = await account(pool);
  const workspace = await workspaces.create(
    owner.id,
    `Workspace ${randomUUID()}`,
  );
  const project = await projects.create(owner.id, {
    workspaceId: workspace.id,
    name: 'Project',
    baselineScope: 'Initial reference',
  });
  return { owner, developer, client, outsider, workspace, project };
}
// Structural history fixture: this is NOT execution of the future Submit workflow.
export async function submittedHistory(
  pool: Pick<Pool, 'query'>,
  projectId: string,
  ownerId: string,
) {
  const requirement = randomUUID(),
    revision = randomUUID(),
    change = randomUUID(),
    version = randomUUID();
  await pool.query(
    'INSERT INTO requirements(id,project_id,created_by,title,original_text) VALUES($1,$2,$3,$4,$5)',
    [requirement, projectId, ownerId, 'Fixture', 'Text'],
  );
  await pool.query(
    "INSERT INTO requirement_revisions(id,requirement_id,revision_no,content,acceptance_criteria,created_by) VALUES($1,$2,1,'Text','[\"Criterion\"]',$3)",
    [revision, requirement, ownerId],
  );
  await pool.query(
    'INSERT INTO change_requests(id,requirement_id,draft_requirement_revision_id,created_by) VALUES($1,$2,$3,$4)',
    [change, requirement, revision, ownerId],
  );
  await pool.query(
    `INSERT INTO change_request_versions(id,change_request_id,version_no,requirement_revision_id,scope_snapshot,estimate_hours,cost_delta_minor,currency,schedule_delta_days,acceptance_criteria,submitted_by)
    VALUES($1,$2,1,$3,'Snapshot',1,0,'CNY',0,'["Criterion"]',$4)`,
    [version, change, revision, ownerId],
  );
  return { requirement, revision, change, version };
}
export function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
export async function waitForLock(pool: Pool) {
  for (let n = 0; n < 200; n++) {
    const result = await pool.query(
      "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0 AND query LIKE '%FOR UPDATE%' LIMIT 1",
    );
    if (result.rowCount) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Expected a real PostgreSQL row-lock waiter');
}
