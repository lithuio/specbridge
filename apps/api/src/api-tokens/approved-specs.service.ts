import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { AuditWriter } from '../audit/audit.module.js';
import {
  changeRequestVersions as v,
  changeRequests as c,
  requirements as r,
  requirementRevisions as revision,
} from '../database/schema/index.js';
import { TokenAccess } from './token-access.module.js';
import type { ProjectTokenPrincipal } from './token.contract.js';
import type { PageDto } from '../authorization/rbac.dto.js';
type Reader = { kind: 'session'; userId: string } | ProjectTokenPrincipal;
@Injectable()
export class ApprovedSpecsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(TokenAccess) private readonly access: TokenAccess,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  private query(
    tx: DatabaseTransaction,
    projectId: string,
    page: PageDto,
    versionId?: string,
  ) {
    // Project, exact immutable version and its requirement are joined before projection.
    // Do not select current titles/original text, commercial fields or approval comments.
    return tx
      .select({
        projectId: r.projectId,
        requirementId: r.id,
        changeRequestId: c.id,
        versionId: v.id,
        versionNo: v.versionNo,
        submittedAt: v.submittedAt,
        approvedAt:
          sql<Date>`(SELECT a.created_at FROM approvals a WHERE a.change_request_version_id=${v.id} AND a.step='CLIENT' AND a.decision='APPROVED')`.mapWith(
            v.submittedAt,
          ),
        approvedScope: {
          summary: v.scopeSnapshot,
          acceptanceCriteria: v.acceptanceCriteria,
        },
        referencedRequirement: {
          revisionId: revision.id,
          revisionNo: revision.revisionNo,
          content: revision.content,
          acceptanceCriteria: revision.acceptanceCriteria,
          createdAt: revision.createdAt,
        },
      })
      .from(v)
      .innerJoin(c, eq(c.id, v.changeRequestId))
      .innerJoin(r, eq(r.id, c.requirementId))
      .innerJoin(
        revision,
        and(
          eq(revision.id, v.requirementRevisionId),
          eq(revision.requirementId, r.id),
        ),
      )
      .where(
        and(
          eq(r.projectId, projectId),
          versionId ? eq(v.id, versionId) : undefined,
          sql`EXISTS (SELECT 1 FROM approvals vendor JOIN approvals client ON client.change_request_version_id=vendor.change_request_version_id WHERE vendor.change_request_version_id=${v.id} AND vendor.step='VENDOR' AND vendor.decision='APPROVED' AND client.step='CLIENT' AND client.decision='APPROVED' AND vendor.actor_id<>client.actor_id AND client.created_at>=vendor.created_at)`,
        ),
      )
      .orderBy(desc(v.submittedAt), asc(v.id))
      .limit(versionId ? 1 : page.limit + 1)
      .offset(versionId ? 0 : page.offset);
  }
  read(reader: Reader, projectId: string, page: PageDto, versionId?: string) {
    projectId = projectId.toLowerCase();
    versionId = versionId?.toLowerCase();
    if (reader.kind === 'project_token' && reader.projectId !== projectId)
      throw new NotFoundException();
    return this.database.db.transaction(
      async (tx) => {
        const project =
          reader.kind === 'project_token'
            ? await this.access.authorize(tx, reader, true)
            : await this.authorization.project(reader.userId, projectId, tx);
        const rows = await this.query(tx, projectId, page, versionId);
        if (versionId && !rows.length) throw new NotFoundException();
        if (reader.kind === 'project_token') {
          await this.access.authorize(tx, reader);
          await this.audit.write(tx, {
            workspaceId: project.workspaceId,
            projectId,
            actorId: null,
            eventType: 'api_token.used',
            entityType: 'api_token',
            entityId: reader.id,
            metadata: {
              principalType: 'project_token',
              operation: versionId
                ? 'approved_spec.detail'
                : 'approved_spec.list',
              ...(versionId ? { versionId } : {}),
              resultCount: Math.min(page.limit, rows.length),
            },
          });
        }
        return rows;
      },
      reader.kind === 'session'
        ? { isolationLevel: 'repeatable read', accessMode: 'read only' }
        : undefined,
    );
  }
}
