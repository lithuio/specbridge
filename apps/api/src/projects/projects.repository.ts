import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import { projectMembers, projects } from '../database/schema/index.js';
import {
  AuthorizationRepository,
  type Connection,
} from '../authorization/authorization.repository.js';
import type {
  CreateProjectDto,
  ProjectListDto,
} from '../authorization/rbac.dto.js';
@Injectable()
export class ProjectsRepository {
  constructor(
    @Inject(DatabaseService) readonly database: DatabaseService,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
  ) {}
  async list(userId: string, page: ProjectListDto) {
    return (
      await this.database.db
        .execute(sql`SELECT p.id,p.workspace_id AS "workspaceId",p.name,p.status,p.created_at AS "createdAt",
      CASE WHEN w.owner_id=${userId} THEN 'OWNER' ELSE (SELECT pm.role::text FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=${userId}) END AS "projectRole"
      FROM projects p JOIN workspaces w ON w.id=p.workspace_id WHERE ${this.authorization.visibleProjects(userId)}
      ${page.workspaceId ? sql`AND p.workspace_id=${page.workspaceId}` : sql``}
      ORDER BY p.created_at,p.id LIMIT ${page.limit + 1} OFFSET ${page.offset}`)
    ).rows;
  }
  async create(tx: DatabaseTransaction, input: CreateProjectDto) {
    const [project] = await tx.insert(projects).values(input).returning();
    return { ...project, projectRole: 'OWNER' as const };
  }
  async people(db: Connection, projectId: string) {
    return (
      await db.execute<{
        userId: string;
        displayName: string;
        role: string;
      }>(sql`
      SELECT u.id AS "userId",u.display_name AS "displayName",'OWNER' AS role FROM projects p JOIN workspaces w ON w.id=p.workspace_id JOIN users u ON u.id=w.owner_id WHERE p.id=${projectId}
      UNION ALL SELECT u.id AS "userId",u.display_name AS "displayName",pm.role::text AS role FROM project_members pm JOIN users u ON u.id=pm.user_id WHERE pm.project_id=${projectId}
      ORDER BY role,"userId"`)
    ).rows;
  }
  async submitted(db: Connection, projectId: string) {
    return (
      (
        await db.execute(
          sql`SELECT 1 FROM change_request_versions v JOIN change_requests c ON c.id=v.change_request_id JOIN requirements r ON r.id=c.requirement_id WHERE r.project_id=${projectId} LIMIT 1`,
        )
      ).rows.length > 0
    );
  }
  async userByEmail(tx: DatabaseTransaction, email: string) {
    return (
      await tx.execute<{ id: string; displayName: string }>(
        sql`SELECT id,display_name AS "displayName" FROM users WHERE lower(email)=${email}`,
      )
    ).rows[0];
  }
  async supplier(tx: DatabaseTransaction, workspaceId: string, userId: string) {
    return (
      await tx.execute<{
        role: string;
      }>(sql`SELECT role::text FROM workspace_members WHERE workspace_id=${workspaceId} AND user_id=${userId}
      UNION ALL SELECT 'OWNER' FROM workspaces WHERE id=${workspaceId} AND owner_id=${userId}`)
    ).rows;
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
  async member(tx: DatabaseTransaction, projectId: string, userId: string) {
    return (
      await tx.execute<{ id: string; role: string }>(
        sql`SELECT id,role FROM project_members WHERE project_id=${projectId} AND user_id=${userId}`,
      )
    ).rows[0];
  }
  async client(tx: DatabaseTransaction, projectId: string) {
    return (
      await tx.execute<{ id: string; userId: string }>(
        sql`SELECT id,user_id AS "userId" FROM project_members WHERE project_id=${projectId} AND role='CLIENT'`,
      )
    ).rows[0];
  }
  async addDeveloper(
    tx: DatabaseTransaction,
    projectId: string,
    userId: string,
  ) {
    await tx
      .insert(projectMembers)
      .values({ projectId, userId, role: 'DEVELOPER' });
  }
  async replaceClient(
    tx: DatabaseTransaction,
    projectId: string,
    userId: string,
  ) {
    await tx
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, 'CLIENT'),
        ),
      );
    await tx
      .insert(projectMembers)
      .values({ projectId, userId, role: 'CLIENT' });
  }
}
