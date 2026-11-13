import { capability } from '../http/capability.js';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { AuditWriter } from '../audit/audit.module.js';
import {
  business,
  type CreateProjectDto,
  type ProjectListDto,
} from '../authorization/rbac.dto.js';
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(ProjectsRepository) private readonly repository: ProjectsRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  list(userId: string, page: ProjectListDto) {
    return this.repository.list(userId, page);
  }
  create(userId: string, input: CreateProjectDto) {
    return this.repository.database.transaction(async (tx) => {
      await this.authorization.owner(userId, input.workspaceId, tx);
      const project = await this.repository.create(tx, input);
      await this.audit.write(tx, {
        workspaceId: input.workspaceId,
        projectId: project.id,
        actorId: userId,
        eventType: 'project.created',
        entityType: 'project',
        entityId: project.id,
      });
      return project;
    });
  }
  detail(userId: string, projectId: string) {
    // One stable snapshot prevents a Client replacement between authorization and projection.
    return this.repository.database.db.transaction(
      async (tx) => {
        const project = await this.authorization.project(userId, projectId, tx);
        const people = await this.repository.people(tx, projectId);
        const locked = await this.repository.submitted(tx, projectId);
        const ownerReason =
          project.projectRole === 'OWNER' ? undefined : 'ROLE_FORBIDDEN';
        return {
          ...project,
          createdAt: new Date(project.createdAt),
          capabilities: {
            createRequirement: capability(),
            assignDeveloper: capability(ownerReason),
            bindClient: capability(
              ownerReason ?? (locked ? 'CLIENT_ASSIGNMENT_LOCKED' : undefined),
            ),
            manageApiTokens: capability(ownerReason),
          },
          owner: people.find((p) => p.role === 'OWNER'),
          members: people.filter((p) => p.role !== 'OWNER'),
          clientAssignmentLocked: locked,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  add(userId: string, projectId: string, targetId: string) {
    // PostgreSQL returns lowercase UUIDs; use the same identity for writes and response lookup.
    targetId = targetId.toLowerCase();
    return this.repository.database.transaction(async (tx) => {
      const project = await this.authorization.projectOwner(
        userId,
        projectId,
        tx,
      );
      const supplier = await this.repository.supplier(
        tx,
        project.workspaceId,
        targetId,
      );
      if (
        supplier.some((s) => s.role === 'OWNER') ||
        (await this.repository.clientInWorkspace(
          tx,
          project.workspaceId,
          targetId,
        ))
      )
        business('ROLE_CONFLICT');
      if (supplier.length !== 1 || supplier[0].role !== 'DEVELOPER')
        business('WORKSPACE_DEVELOPER_REQUIRED');
      const existing = await this.repository.member(tx, projectId, targetId);
      if (existing && existing.role !== 'DEVELOPER') business('ROLE_CONFLICT');
      if (!existing) {
        await this.repository.addDeveloper(tx, projectId, targetId);
        await this.audit.write(tx, {
          workspaceId: project.workspaceId,
          projectId,
          actorId: userId,
          eventType: 'project.developer_added',
          entityType: 'project',
          entityId: projectId,
          metadata: { userId: targetId, role: 'DEVELOPER' },
        });
      }
      const person = (await this.repository.people(tx, projectId)).find(
        (p) => p.userId === targetId,
      )!;
      return { created: !existing, data: person };
    });
  }
  bindClient(userId: string, projectId: string, email: string) {
    return this.repository.database.transaction(async (tx) => {
      const project = await this.authorization.projectOwner(
        userId,
        projectId,
        tx,
      );
      const target = await this.repository.userByEmail(tx, email);
      if (!target) business('USER_NOT_REGISTERED');
      if (
        (await this.repository.supplier(tx, project.workspaceId, target.id))
          .length
      )
        business('ROLE_CONFLICT');
      const membership = await this.repository.member(tx, projectId, target.id);
      if (membership && membership.role !== 'CLIENT') business('ROLE_CONFLICT');
      const existing = await this.repository.client(tx, projectId);
      if (existing?.userId === target.id)
        return {
          userId: target.id,
          displayName: target.displayName,
          role: 'CLIENT' as const,
        };
      if (await this.repository.submitted(tx, projectId))
        throw new ConflictException({ code: 'CLIENT_ASSIGNMENT_LOCKED' });
      await this.repository.replaceClient(tx, projectId, target.id);
      await this.audit.write(tx, {
        workspaceId: project.workspaceId,
        projectId,
        actorId: userId,
        eventType: existing
          ? 'project.client_replaced'
          : 'project.client_bound',
        entityType: 'project',
        entityId: projectId,
        metadata: {
          previousClientId: existing?.userId ?? null,
          clientId: target.id,
        },
      });
      return {
        userId: target.id,
        displayName: target.displayName,
        role: 'CLIENT' as const,
      };
    });
  }
}
