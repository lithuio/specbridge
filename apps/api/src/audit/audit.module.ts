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
        | 'project.client_replaced'
        | 'requirement.created'
        | 'requirement.draft_updated'
        | 'clarification.question_added'
        | 'clarification.answer_added'
        | 'requirement.revision_created'
        | 'requirement.marked_ready'
        | 'change_request.created'
        | 'change_request.draft_updated'
        | 'change_request.submitted'
        | 'change_request.vendor_decided'
        | 'change_request.client_decided'
        | 'change_request.reopened';
      entityType:
        | 'workspace'
        | 'project'
        | 'requirement'
        | 'clarification'
        | 'requirement_revision'
        | 'change_request';
      entityVersion?: number;
      entityId: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await tx.insert(auditEvents).values(event);
  }
}
@Module({ providers: [AuditWriter], exports: [AuditWriter] })
export class AuditModule {}
