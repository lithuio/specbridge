import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  DatabaseService,
  type Database,
  type DatabaseTransaction,
} from '../database/database.service.js';

export type Connection = Database | DatabaseTransaction;
export type WorkspaceRow = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
};
export type ProjectRow = {
  id: string;
  workspaceId: string;
  name: string;
  baselineScope: string;
  status: string;
  createdAt: Date;
};
export type Access = 'OWNER' | 'DEVELOPER' | 'CLIENT';

@Injectable()
export class AuthorizationRepository {
  constructor(@Inject(DatabaseService) readonly database: DatabaseService) {}

  // Aliases p and w are internal constants, never supplied by a request.
  visibleProjects(userId: string) {
    return sql`(
      (w.owner_id = ${userId} AND EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=w.id AND wm.user_id=${userId} AND wm.role='OWNER')
        AND NOT EXISTS (SELECT 1 FROM project_members cm JOIN projects cp ON cp.id=cm.project_id WHERE cp.workspace_id=w.id AND cm.user_id=${userId} AND cm.role='CLIENT'))
      OR (w.owner_id <> ${userId} AND EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=w.id AND wm.user_id=${userId} AND wm.role='DEVELOPER')
        AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=${userId} AND pm.role='DEVELOPER')
        AND NOT EXISTS (SELECT 1 FROM project_members cm JOIN projects cp ON cp.id=cm.project_id WHERE cp.workspace_id=w.id AND cm.user_id=${userId} AND cm.role='CLIENT'))
      OR (w.owner_id <> ${userId} AND NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=w.id AND wm.user_id=${userId})
        AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=${userId} AND pm.role='CLIENT'))
    ) AND EXISTS (SELECT 1 FROM workspace_members om WHERE om.workspace_id=w.id AND om.user_id=w.owner_id AND om.role='OWNER')`;
  }

  async workspace(
    userId: string,
    id: string,
    db: Connection = this.database.db,
    lock = false,
  ) {
    const result = await db.execute<WorkspaceRow>(
      sql`SELECT id,name,owner_id AS "ownerId",created_at AS "createdAt" FROM workspaces WHERE id=${id} ${lock ? sql`FOR UPDATE` : sql``}`,
    );
    const workspace = result.rows[0];
    if (!workspace) throw new NotFoundException();
    const members = await db.execute<{ userId: string; role: string }>(
      sql`SELECT user_id AS "userId",role FROM workspace_members WHERE workspace_id=${id} AND (user_id=${userId} OR role='OWNER')`,
    );
    const owner = members.rows.find((m) => m.role === 'OWNER');
    const member = members.rows.find((m) => m.userId === userId);
    const conflicts = await db.execute(
      sql`SELECT 1 FROM project_members pm JOIN projects p ON p.id=pm.project_id WHERE p.workspace_id=${id} AND pm.user_id=${userId} AND pm.role='CLIENT' LIMIT 1`,
    );
    if (
      !member ||
      owner?.userId !== workspace.ownerId ||
      conflicts.rows.length ||
      (member.role === 'OWNER') !== (workspace.ownerId === userId)
    )
      throw new NotFoundException();
    return {
      ...workspace,
      workspaceRole: member.role as 'OWNER' | 'DEVELOPER',
    };
  }
  async owner(userId: string, id: string, db: Connection, lock = true) {
    const workspace = await this.workspace(userId, id, db, lock);
    if (workspace.workspaceRole !== 'OWNER') throw new ForbiddenException();
    return workspace;
  }
  async project(userId: string, id: string, db: Connection = this.database.db) {
    const result = await db.execute<ProjectRow & { projectRole: Access }>(sql`
      SELECT p.id,p.workspace_id AS "workspaceId",p.name,p.baseline_scope AS "baselineScope",p.status,p.created_at AS "createdAt",
      CASE WHEN w.owner_id=${userId} THEN 'OWNER' ELSE (SELECT pm.role::text FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=${userId}) END AS "projectRole"
      FROM projects p JOIN workspaces w ON w.id=p.workspace_id WHERE p.id=${id} AND ${this.visibleProjects(userId)}`);
    if (!result.rows[0]) throw new NotFoundException();
    return result.rows[0];
  }
  async projectOwner(userId: string, id: string, tx: DatabaseTransaction) {
    const visible = await this.project(userId, id, tx);
    if (visible.projectRole !== 'OWNER') throw new ForbiddenException();
    await this.owner(userId, visible.workspaceId, tx);
    await tx.execute(
      sql`SELECT id FROM projects WHERE id=${id} AND workspace_id=${visible.workspaceId} FOR UPDATE`,
    );
    // Authorization is checked again after acquiring the serialization locks.
    const current = await this.project(userId, id, tx);
    if (current.projectRole !== 'OWNER') throw new ForbiddenException();
    return current;
  }
}
