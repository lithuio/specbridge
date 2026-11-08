import { Inject, Injectable } from '@nestjs/common';
import { WorkspacesRepository } from './workspaces.repository.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { AuditWriter } from '../audit/audit.module.js';
import { business, type PageDto } from '../authorization/rbac.dto.js';
@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(WorkspacesRepository)
    private readonly repository: WorkspacesRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  list(userId: string, page: PageDto) {
    return this.repository.list(userId, page);
  }
  create(userId: string, name: string) {
    return this.repository.database.transaction(async (tx) => {
      const workspace = await this.repository.create(tx, name, userId);
      await this.audit.write(tx, {
        workspaceId: workspace.id,
        actorId: userId,
        eventType: 'workspace.created',
        entityType: 'workspace',
        entityId: workspace.id,
      });
      return workspace;
    });
  }
  members(userId: string, workspaceId: string, page: PageDto) {
    return this.repository.database.transaction(async (tx) => {
      await this.authorization.owner(userId, workspaceId, tx, false);
      return this.repository.members(tx, workspaceId, page);
    });
  }
  add(userId: string, workspaceId: string, email: string) {
    return this.repository.database.transaction(async (tx) => {
      const workspace = await this.authorization.owner(userId, workspaceId, tx);
      const target = await this.repository.registeredUser(tx, email);
      if (!target) business('USER_NOT_REGISTERED');
      if (
        workspace.ownerId === target.id ||
        (await this.repository.clientInWorkspace(tx, workspaceId, target.id))
      )
        business('ROLE_CONFLICT');
      const existing = await this.repository.membership(
        tx,
        workspaceId,
        target.id,
      );
      if (existing && existing.role !== 'DEVELOPER') business('ROLE_CONFLICT');
      const member =
        existing ?? (await this.repository.add(tx, workspaceId, target.id));
      if (!existing)
        await this.audit.write(tx, {
          workspaceId,
          actorId: userId,
          eventType: 'workspace.developer_added',
          entityType: 'workspace',
          entityId: workspaceId,
          metadata: { userId: target.id, role: 'DEVELOPER' },
        });
      return {
        created: !existing,
        data: {
          id: member.id,
          userId: target.id,
          displayName: target.displayName,
          email: target.email,
          role: member.role,
          createdAt: member.createdAt,
        },
      };
    });
  }
}
