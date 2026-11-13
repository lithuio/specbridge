import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { type Pool } from 'pg';
import { DatabaseModule } from '../../src/database/database.module.js';
import { DatabaseService } from '../../src/database/database.service.js';
import { auditEvents, users } from '../../src/database/schema/index.js';
import {
  fixture,
  migrationsFolder,
  openTestDatabase,
  rejectsSql,
  rollbackTest,
} from './helpers.js';

describe('PostgreSQL foundation (structural guarantees, not business APIs)', () => {
  let pool: Pool;
  beforeAll(async () => {
    pool = await openTestDatabase();
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('migrates all 23 tables and preserves data when migrations run again', async () => {
    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    );
    expect(
      tables.rows.map((row: { tablename: string }) => row.tablename),
    ).toEqual([
      'agent_connection_grants',
      'api_tokens',
      'approvals',
      'audit_events',
      'change_request_versions',
      'change_requests',
      'clarifications',
      'copilot_proposals',
      'deliveries',
      'delivery_reviews',
      'project_document_chunks',
      'project_document_versions',
      'project_documents',
      'project_members',
      'projects',
      'requirement_publish_receipts',
      'requirement_revisions',
      'requirement_working_drafts',
      'requirements',
      'sessions',
      'users',
      'workspace_members',
      'workspaces',
    ]);
    const f = await fixture(pool);
    const before = await pool.query(
      'SELECT * FROM requirement_revisions WHERE id=$1',
      [f.revision],
    );
    await migrate(drizzle(pool), { migrationsFolder });
    expect(
      (
        await pool.query('SELECT * FROM requirement_revisions WHERE id=$1', [
          f.revision,
        ])
      ).rows,
    ).toEqual(before.rows);
    const triggers = await pool.query(
      'SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname',
    );
    expect(triggers.rows.map((row: { tgname: string }) => row.tgname)).toEqual([
      'agent_connection_grants_guard',
      'approvals_immutable',
      'change_request_versions_immutable',
      'copilot_proposals_guard',
      'delivery_reviews_immutable',
      'project_document_chunks_guard',
      'project_document_versions_guard',
      'project_documents_pointer_guard',
      'projects_baseline_scope_immutable',
      'requirement_revisions_immutable',
    ]);
    const foreignKeys = await pool.query(
      "SELECT confdeltype FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace",
    );
    expect(foreignKeys.rows.length).toBeGreaterThan(20);
    expect(
      foreignKeys.rows.every(
        (row: { confdeltype: string }) => row.confdeltype === 'r',
      ),
    ).toBe(true);
    const primaryKeys = await pool.query(
      "SELECT count(*)::int AS count FROM pg_constraint WHERE contype='p' AND connamespace='public'::regnamespace",
    );
    expect(primaryKeys.rows[0].count).toBe(23);
    const ids = await pool.query(
      "SELECT table_name, udt_name, column_default FROM information_schema.columns WHERE table_schema='public' AND column_name='id'",
    );
    expect(ids.rows).toHaveLength(23);
    expect(
      ids.rows.every(
        (row: {
          table_name: string;
          udt_name: string;
          column_default: string | null;
        }) =>
          row.udt_name === 'uuid' &&
          (['requirement_publish_receipts', 'agent_connection_grants'].includes(
            row.table_name,
          )
            ? row.column_default === null
            : row.column_default?.includes('gen_random_uuid()')),
      ),
    ).toBe(true);
  });

  it('allows incomplete drafts, negative deltas and an initially unassigned Client', async () => {
    await rollbackTest(pool, async (c) => {
      const f = await fixture(c);
      const draft = await c.query(
        'SELECT draft_scope_summary, draft_estimate_hours, draft_cost_delta_minor FROM change_requests WHERE id=$1',
        [f.change],
      );
      expect(Object.values(draft.rows[0])).toEqual([null, null, null]);
      expect(
        (
          await c.query('SELECT * FROM project_members WHERE project_id=$1', [
            f.project,
          ])
        ).rowCount,
      ).toBe(0);
      expect(
        (
          await c.query(
            'SELECT cost_delta_minor, schedule_delta_days FROM change_request_versions WHERE id=$1',
            [f.version],
          )
        ).rows[0],
      ).toEqual({ cost_delta_minor: '-500', schedule_delta_days: -1 });
    });
  });

  it('enforces foreign keys and cached pointer/clarification/audit ownership', async () => {
    await rollbackTest(pool, async (c) => {
      const a = await fixture(c);
      const b = await fixture(c);
      await rejectsSql(
        c,
        'UPDATE projects SET workspace_id=$1 WHERE id=$2',
        [randomUUID(), a.project],
        '23503',
      );
      await rejectsSql(
        c,
        'UPDATE requirements SET latest_revision_id=$1 WHERE id=$2',
        [b.revision, a.requirement],
        '23503',
      );
      await rejectsSql(
        c,
        'UPDATE change_requests SET active_version_id=$1 WHERE id=$2',
        [b.version, a.change],
        '23503',
      );
      const parent = randomUUID();
      await c.query(
        "INSERT INTO clarifications(id,requirement_id,author_id,kind,body) VALUES ($1,$2,$3,'QUESTION','Question')",
        [parent, b.requirement, b.owner],
      );
      await rejectsSql(
        c,
        "INSERT INTO clarifications(requirement_id,author_id,parent_id,kind,body) VALUES ($1,$2,$3,'ANSWER','Answer')",
        [a.requirement, a.owner, parent],
        '23503',
      );
      await rejectsSql(
        c,
        "INSERT INTO audit_events(workspace_id,project_id,event_type,entity_type,entity_id) VALUES ($1,$2,'test','project',$3)",
        [a.workspace, b.project, a.project],
        '23503',
      );
      await rejectsSql(
        c,
        'DELETE FROM projects WHERE id=$1',
        [a.project],
        '23503',
      );
    });
  });

  it('rejects duplicates for identity, members, revisions and versions', async () => {
    await rollbackTest(pool, async (c) => {
      const f = await fixture(c);
      await rejectsSql(
        c,
        "INSERT INTO users(email,display_name,password_hash) VALUES ($1,'Duplicate','hash')",
        [`${f.owner}@EXAMPLE.TEST`],
        '23505',
      );
      await c.query(
        "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 day')",
        [f.owner, 'a'.repeat(64)],
      );
      await rejectsSql(
        c,
        "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 day')",
        [f.client, 'a'.repeat(64)],
        '23505',
      );
      await rejectsSql(
        c,
        "INSERT INTO workspace_members(workspace_id,user_id,role) VALUES ($1,$2,'DEVELOPER')",
        [f.workspace, f.owner],
        '23505',
      );
      await rejectsSql(
        c,
        "INSERT INTO workspace_members(workspace_id,user_id,role) VALUES ($1,$2,'OWNER')",
        [f.workspace, f.other],
        '23505',
      );
      await c.query(
        "INSERT INTO project_members(project_id,user_id,role) VALUES ($1,$2,'CLIENT')",
        [f.project, f.client],
      );
      await rejectsSql(
        c,
        "INSERT INTO project_members(project_id,user_id,role) VALUES ($1,$2,'CLIENT')",
        [f.project, f.other],
        '23505',
      );
      await rejectsSql(
        c,
        "INSERT INTO project_members(project_id,user_id,role) VALUES ($1,$2,'DEVELOPER')",
        [f.project, f.client],
        '23505',
      );
      await rejectsSql(
        c,
        "INSERT INTO requirement_revisions(requirement_id,revision_no,content,acceptance_criteria,created_by) VALUES ($1,1,'Duplicate','[]',$2)",
        [f.requirement, f.owner],
        '23505',
      );
      await rejectsSql(
        c,
        `INSERT INTO change_request_versions(change_request_id,version_no,requirement_revision_id,scope_snapshot,
        estimate_hours,cost_delta_minor,currency,schedule_delta_days,acceptance_criteria,submitted_by)
        VALUES ($1,1,$2,'Duplicate',0,0,'CNY',0,'["Result"]',$3)`,
        [f.change, f.revision, f.owner],
        '23505',
      );
    });
  });

  it('rejects invalid values and distinguishes NULL draft fields from frozen required fields', async () => {
    await rollbackTest(pool, async (c) => {
      const f = await fixture(c);
      await rejectsSql(
        c,
        "INSERT INTO projects(workspace_id,name,baseline_scope) VALUES ($1,'Empty',$2)",
        [f.workspace, ' \t\n'],
        '23514',
      );
      await rejectsSql(
        c,
        "UPDATE projects SET status='UNKNOWN' WHERE id=$1",
        [f.project],
        '22P02',
      );
      await rejectsSql(
        c,
        'UPDATE change_requests SET lock_version=-1 WHERE id=$1',
        [f.change],
        '23514',
      );
      for (const hours of ['-0.01', 'NaN']) {
        await rejectsSql(
          c,
          'UPDATE change_requests SET draft_estimate_hours=$1 WHERE id=$2',
          [hours, f.change],
          '23514',
        );
      }
      await rejectsSql(
        c,
        "UPDATE change_requests SET draft_currency='xx' WHERE id=$1",
        [f.change],
        '23514',
      );
      for (const criteria of ['{}', '[42]', 'null']) {
        await rejectsSql(
          c,
          'UPDATE change_requests SET draft_acceptance_criteria=$1 WHERE id=$2',
          [criteria, f.change],
          '23514',
        );
      }
      await rejectsSql(
        c,
        'UPDATE change_requests SET draft_requirement_revision_id=NULL WHERE id=$1',
        [f.change],
        '23502',
      );
      await rejectsSql(
        c,
        "INSERT INTO requirement_revisions(requirement_id,revision_no,content,acceptance_criteria,created_by) VALUES ($1,0,'Invalid','[]',$2)",
        [f.requirement, f.owner],
        '23514',
      );
      for (const criteria of ['[]', '{}', '[42]', 'null', null]) {
        await rejectsSql(
          c,
          `INSERT INTO change_request_versions(change_request_id,version_no,requirement_revision_id,scope_snapshot,
          estimate_hours,cost_delta_minor,currency,schedule_delta_days,acceptance_criteria,submitted_by)
          VALUES ($1,2,$2,'Invalid',0,0,'CNY',0,$3,$4)`,
          [f.change, f.revision, criteria, f.owner],
          criteria === null ? '23502' : '23514',
        );
      }
      await rejectsSql(
        c,
        "INSERT INTO audit_events(workspace_id,event_type,entity_type,entity_id,metadata) VALUES ($1,'test','project',$2,'[]')",
        [f.workspace, f.project],
        '23514',
      );
    });
  });

  it('preserves all four frozen histories and the initial project scope', async () => {
    await rollbackTest(pool, async (c) => {
      const f = await fixture(c);
      const approval = randomUUID();
      const delivery = randomUUID();
      const review = randomUUID();
      await c.query(
        "INSERT INTO approvals(id,change_request_version_id,step,actor_id,decision) VALUES ($1,$2,'VENDOR',$3,'APPROVED')",
        [approval, f.version, f.owner],
      );
      await c.query(
        "INSERT INTO deliveries(id,change_request_version_id,delivery_no,artifact_url,summary,created_by) VALUES ($1,$2,1,'https://example.test/result','Delivery',$3)",
        [delivery, f.version, f.owner],
      );
      await c.query(
        "INSERT INTO delivery_reviews(id,delivery_id,reviewer_id,decision) VALUES ($1,$2,$3,'ACCEPTED')",
        [review, delivery, f.client],
      );
      for (const [table, id] of [
        ['requirement_revisions', f.revision],
        ['change_request_versions', f.version],
        ['approvals', approval],
        ['delivery_reviews', review],
      ]) {
        // Table names are fixed test constants, never user input.
        const before = await c.query(`SELECT * FROM ${table} WHERE id=$1`, [
          id,
        ]);
        await rejectsSql(
          c,
          `UPDATE ${table} SET id=id WHERE id=$1`,
          [id],
          '23514',
        );
        await rejectsSql(c, `DELETE FROM ${table} WHERE id=$1`, [id], '23514');
        expect(
          (await c.query(`SELECT * FROM ${table} WHERE id=$1`, [id])).rows,
        ).toEqual(before.rows);
      }
      await rejectsSql(
        c,
        "UPDATE projects SET baseline_scope='Changed' WHERE id=$1",
        [f.project],
        '23514',
      );
      await c.query(
        "UPDATE projects SET name='Renamed',baseline_scope=baseline_scope WHERE id=$1",
        [f.project],
      );
      expect(
        (
          await c.query(
            'SELECT name,baseline_scope FROM projects WHERE id=$1',
            [f.project],
          )
        ).rows[0],
      ).toEqual({ name: 'Renamed', baseline_scope: 'Initial reference' });
      await rejectsSql(
        c,
        "INSERT INTO approvals(change_request_version_id,step,actor_id,decision) VALUES ($1,'VENDOR',$2,'REJECTED')",
        [f.version, f.owner],
        '23505',
      );
      await rejectsSql(
        c,
        "INSERT INTO delivery_reviews(delivery_id,reviewer_id,decision) VALUES ($1,$2,'ACCEPTED')",
        [delivery, f.client],
        '23505',
      );
    });
  });

  it('checks HTTPS evidence and serializes pending deliveries while retaining rejected history', async () => {
    await rollbackTest(pool, async (c) => {
      const f = await fixture(c);
      const insert = `INSERT INTO deliveries(change_request_version_id,delivery_no,artifact_url,summary,evidence_links,created_by)
        VALUES ($1,$2,$3,'Delivery',$4,$5) RETURNING id`;
      for (const evidence of [
        '{}',
        '[42]',
        '["http://example.test"]',
        '["https://bad url"]',
        'null',
      ]) {
        await rejectsSql(
          c,
          insert,
          [f.version, 1, 'https://example.test', evidence, f.owner],
          '23514',
        );
      }
      await rejectsSql(
        c,
        insert,
        [f.version, 1, 'http://example.test', '[]', f.owner],
        '23514',
      );
      await rejectsSql(
        c,
        insert,
        [f.version, 0, 'https://example.test', '[]', f.owner],
        '23514',
      );
      const first = await c.query(insert, [
        f.version,
        1,
        'https://example.test',
        '["https://example.test/proof"]',
        f.owner,
      ]);
      const delivery = first.rows[0].id as string;
      await rejectsSql(
        c,
        insert,
        [f.version, 2, 'https://example.test', '[]', f.owner],
        '23505',
      );
      for (const comment of [null, '', ' \n']) {
        await rejectsSql(
          c,
          "INSERT INTO delivery_reviews(delivery_id,reviewer_id,decision,comment) VALUES ($1,$2,'CHANGES_REQUESTED',$3)",
          [delivery, f.client, comment],
          '23514',
        );
      }
      await c.query(
        "UPDATE deliveries SET status='CHANGES_REQUESTED' WHERE id=$1",
        [delivery],
      );
      await c.query(insert, [
        f.version,
        2,
        'https://example.test/new',
        '[]',
        f.owner,
      ]);
      await rejectsSql(
        c,
        insert,
        [f.version, 1, 'https://example.test', '[]', f.owner],
        '23505',
      );
      expect(
        (await c.query('SELECT status FROM deliveries WHERE id=$1', [delivery]))
          .rows[0].status,
      ).toBe('CHANGES_REQUESTED');
    });
  });

  it('allows exactly one Client in a race using two independent transactions', async () => {
    const f = await fixture(pool);
    const clients = await Promise.all([pool.connect(), pool.connect()]);
    try {
      await Promise.all(clients.map((c) => c.query('BEGIN')));
      const outcomes = await Promise.allSettled(
        clients.map(async (c, i) => {
          try {
            await c.query(
              "INSERT INTO project_members(project_id,user_id,role) VALUES ($1,$2,'CLIENT')",
              [f.project, i === 0 ? f.client : f.other],
            );
            await c.query('COMMIT');
          } catch (error) {
            await c.query('ROLLBACK');
            throw error;
          }
        }),
      );
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const failure = outcomes.find((r) => r.status === 'rejected');
      expect(failure?.reason).toMatchObject({ code: '23505' });
      expect(
        (
          await pool.query(
            "SELECT * FROM project_members WHERE project_id=$1 AND role='CLIENT'",
            [f.project],
          )
        ).rowCount,
      ).toBe(1);
    } finally {
      for (const c of clients) {
        await c.query('ROLLBACK');
        c.release();
      }
    }
  });

  it('allows one optimistic update and one audit write for the same lock version', async () => {
    const f = await fixture(pool);
    const clients = await Promise.all([pool.connect(), pool.connect()]);
    try {
      await Promise.all(clients.map((c) => c.query('BEGIN')));
      const outcomes = await Promise.all(
        clients.map(async (c) => {
          try {
            const changed = await c.query(
              'UPDATE change_requests SET lock_version=lock_version+1 WHERE id=$1 AND lock_version=0',
              [f.change],
            );
            if (changed.rowCount === 1) {
              await c.query(
                "INSERT INTO audit_events(workspace_id,project_id,event_type,entity_type,entity_id) VALUES ($1,$2,'test.optimistic_write','change_request',$3)",
                [f.workspace, f.project, f.change],
              );
            }
            await c.query('COMMIT');
            return changed.rowCount;
          } catch (error) {
            await c.query('ROLLBACK');
            throw error;
          }
        }),
      );
      expect(outcomes.sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([0, 1]);
      expect(
        (
          await pool.query('SELECT * FROM audit_events WHERE entity_id=$1', [
            f.change,
          ])
        ).rowCount,
      ).toBe(1);
    } finally {
      for (const c of clients) {
        await c.query('ROLLBACK');
        c.release();
      }
    }
  });

  it('uses the Nest provider for real queries, commits and atomic rollback', async () => {
    vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL);
    const module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();
    try {
      await module.init();
      const service = module.get(DatabaseService);
      expect(
        (await service.db.execute(sql`SELECT 1 AS value`)).rows[0],
      ).toEqual({ value: 1 });
      const f = await fixture(pool);
      const userId = randomUUID();
      const auditId = randomUUID();
      await expect(
        service.transaction(async (tx) => {
          await tx.insert(users).values({
            id: userId,
            email: `${userId}@example.test`,
            displayName: 'Rollback',
            passwordHash: 'fixture',
          });
          await tx.insert(auditEvents).values({
            id: auditId,
            workspaceId: f.workspace,
            projectId: f.project,
            eventType: 'test.rollback',
            entityType: 'user',
            entityId: userId,
          });
          throw new Error('Injected failure after both writes');
        }),
      ).rejects.toThrow('Injected failure');
      expect(
        (await pool.query('SELECT * FROM users WHERE id=$1', [userId]))
          .rowCount,
      ).toBe(0);
      expect(
        (await pool.query('SELECT * FROM audit_events WHERE id=$1', [auditId]))
          .rowCount,
      ).toBe(0);
      await service.transaction(async (tx) => {
        await tx.insert(users).values({
          id: userId,
          email: `${userId}@example.test`,
          displayName: 'Committed',
          passwordHash: 'fixture',
        });
      });
      expect(
        (await pool.query('SELECT * FROM users WHERE id=$1', [userId]))
          .rowCount,
      ).toBe(1);
    } finally {
      await module.close();
      vi.unstubAllEnvs();
    }
  });
});
