import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import { workspaces, workspaceMembers } from '../database/schema/index.js';
import type { PageDto } from '../authorization/rbac.dto.js';
@Injectable()
export class WorkspacesRepository {
  constructor(@Inject(DatabaseService) readonly database: DatabaseService) {}
  async list(userId: string, page: PageDto) {
    return (
      await this.database.db
        .execute(sql`SELECT w.id,w.name,w.created_at AS "createdAt",wm.role AS "workspaceRole" FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id=${userId}
      WHERE EXISTS (SELECT 1 FROM workspace_members om WHERE om.workspace_id=w.id AND om.user_id=w.owner_id AND om.role='OWNER')
      AND ((wm.role='OWNER' AND w.owner_id=${userId}) OR (wm.role='DEVELOPER' AND w.owner_id<>${userId}))
      AND NOT EXISTS (SELECT 1 FROM project_members cm JOIN projects p ON p.id=cm.project_id WHERE p.workspace_id=w.id AND cm.user_id=${userId} AND cm.role='CLIENT')
      ORDER BY w.created_at,w.id LIMIT ${page.limit + 1} OFFSET ${page.offset}`)
    ).rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt as string),
    }));
  }
  async create(tx: DatabaseTransaction, name: string, ownerId: string) {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name, ownerId })
      .returning();
    await tx
      .insert(workspaceMembers)
      .values({ workspaceId: workspace.id, userId: ownerId, role: 'OWNER' });
    return {
      id: workspace.id,
      name,
      createdAt: workspace.createdAt,
      workspaceRole: 'OWNER' as const,
    };
  }
  async members(tx: DatabaseTransaction, workspaceId: string, page: PageDto) {
    return (
      await tx.execute(sql`SELECT wm.id,wm.user_id AS "userId",u.display_name AS "displayName",u.email,wm.role,wm.created_at AS "createdAt"
      FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=${workspaceId}
      ORDER BY wm.created_at,wm.id LIMIT ${page.limit + 1} OFFSET ${page.offset}`)
    ).rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt as string),
    }));
  }
  async registeredUser(tx: DatabaseTransaction, email: string) {
    return (
      await tx.execute<{ id: string; email: string; displayName: string }>(
        sql`SELECT id,email,display_name AS "displayName" FROM users WHERE lower(email)=${email}`,
      )
    ).rows[0];
  }
  async clientInWorkspace(
    tx: DatabaseTransaction,
    workspaceId: string,
    userId: string,
  ) {
    return (
      (
        await tx.execute(
          sql`SELECT 1 FROM project_members pm JOIN projects p ON p.id=pm.project_id WHERE p.workspace_id=${workspaceId} AND pm.user_id=${userId} AND pm.role='CLIENT' LIMIT 1`,
        )
      ).rows.length > 0
    );
  }
  async membership(
    tx: DatabaseTransaction,
    workspaceId: string,
    userId: string,
  ) {
    const row = (
      await tx.execute<{ id: string; role: string; createdAt: Date }>(
        sql`SELECT id,role,created_at AS "createdAt" FROM workspace_members WHERE workspace_id=${workspaceId} AND user_id=${userId}`,
      )
    ).rows[0];
    return row ? { ...row, createdAt: new Date(row.createdAt) } : undefined;
  }
  async add(tx: DatabaseTransaction, workspaceId: string, userId: string) {
    const [member] = await tx
      .insert(workspaceMembers)
      .values({ workspaceId, userId, role: 'DEVELOPER' })
      .returning();
    return member;
  }
}
