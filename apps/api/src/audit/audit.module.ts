import { Injectable, Module } from '@nestjs/common';
import type { DatabaseTransaction } from '../database/database.service.js';
import { auditEvents } from '../database/schema/index.js';
@Injectable()
export class AuditWriter {
  async write(
    tx: DatabaseTransaction,
    event: {
      workspaceId: string;
      projectId?: string;
      actorId: string;
      eventType:
        | 'workspace.created'
        | 'workspace.developer_added'
        | 'project.created'
        | 'project.developer_added'
        | 'project.client_bound'
        | 'project.client_replaced';
      entityType: 'workspace' | 'project';
      entityId: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await tx.insert(auditEvents).values(event);
  }
}
@Module({ providers: [AuditWriter], exports: [AuditWriter] })
export class AuditModule {}
