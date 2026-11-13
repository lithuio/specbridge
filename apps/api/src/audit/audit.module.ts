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
      actorId: string | null;
      eventType:
        | 'agent_connection.authorized'
        | 'agent_connection.exchanged'
        | 'agent_connection.cancelled'
        | 'copilot_proposal.prepared'
        | 'copilot_proposal.edited'
        | 'copilot_proposal.deleted'
        | 'copilot_proposal.executed'
        | 'project_document.uploaded'
        | 'project_document.parsed'
        | 'project_document.failed'
        | 'project_document.updated'
        | 'api_token.created'
        | 'api_token.revoked'
        | 'api_token.used'
        | 'workspace.created'
        | 'workspace.developer_added'
        | 'project.created'
        | 'project.developer_added'
        | 'project.client_bound'
        | 'project.client_replaced'
        | 'requirement.created'
        | 'requirement.draft_updated'
        | 'requirement.working_draft_saved'
        | 'requirement.working_draft_deleted'
        | 'clarification.question_added'
        | 'clarification.answer_added'
        | 'requirement.revision_created'
        | 'requirement.marked_ready'
        | 'change_request.created'
        | 'change_request.draft_updated'
        | 'change_request.submitted'
        | 'change_request.vendor_decided'
        | 'change_request.client_decided'
        | 'change_request.reopened'
        | 'delivery.submitted'
        | 'delivery.reviewed';
      entityType:
        | 'agent_connection'
        | 'copilot_proposal'
        | 'project_document'
        | 'api_token'
        | 'workspace'
        | 'project'
        | 'requirement'
        | 'clarification'
        | 'requirement_revision'
        | 'requirement_working_draft'
        | 'change_request'
        | 'delivery';
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
