import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import {
  requirements,
  requirementRevisions,
  clarifications,
  sessions,
} from '../database/schema/index.js';
import type { AnalysisInput } from './ai.contract.js';

@Injectable()
export class AiRepository {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
  ) {}
  private read<T>(work: (tx: DatabaseTransaction) => Promise<T>) {
    return this.database.db.transaction(work, {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    });
  }
  async assertSession(
    tx: DatabaseTransaction,
    actor: string,
    sessionId: string,
    lock = false,
  ) {
    const query = tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, actor),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`statement_timestamp()`),
          gt(
            sessions.lastActivityAt,
            sql`statement_timestamp() - interval '24 hours'`,
          ),
        ),
      );
    const [valid] = await (lock ? query.for('share') : query);
    if (!valid) throw new UnauthorizedException();
  }
  reauthorize(actor: string, sessionId: string, projectId: string) {
    return this.read(async (tx) => {
      await this.assertSession(tx, actor, sessionId);
      return (await this.authorization.project(actor, projectId, tx))
        .projectRole;
    });
  }
  context(actor: string, sessionId: string, id: string, input: AnalysisInput) {
    return this.read(async (tx) => {
      await this.assertSession(tx, actor, sessionId);
      const [row] = await tx
        .select()
        .from(requirements)
        .where(eq(requirements.id, id));
      if (!row) throw new NotFoundException();
      const project = await this.authorization.project(
        actor,
        row.projectId,
        tx,
      );
      if (row.draftVersion !== input.expectedVersion)
        throw new ConflictException({ code: 'STALE_VERSION' });
      const revisionId = input.revisionId ?? row.latestRevisionId;
      const [revision] = revisionId
        ? await tx
            .select({
              id: requirementRevisions.id,
              content: requirementRevisions.content,
              acceptanceCriteria: requirementRevisions.acceptanceCriteria,
            })
            .from(requirementRevisions)
            .where(
              and(
                eq(requirementRevisions.id, revisionId),
                eq(requirementRevisions.requirementId, row.id),
              ),
            )
        : [];
      if (revisionId && !revision) throw new NotFoundException();
      const questions = input.includeClarifications
        ? await tx
            .select({
              id: clarifications.id,
              kind: clarifications.kind,
              parentId: clarifications.parentId,
              body: clarifications.body,
            })
            .from(clarifications)
            .where(eq(clarifications.requirementId, row.id))
            .orderBy(asc(clarifications.createdAt), asc(clarifications.id))
            .limit(501)
        : [];
      if (questions.length > 500) throw new PayloadTooLargeException();
      return {
        projectId: row.projectId,
        projectRole: project.projectRole,
        projectReference: {
          name: project.name,
          baselineScope: project.baselineScope,
        },
        source: {
          requirementId: row.id,
          draftVersion: row.draftVersion,
          revisionId: revision?.id ?? null,
          clarificationIds: questions.map((q) => q.id),
          includesUnsavedDraft: !!input.draft,
          readAt: new Date().toISOString(),
        },
        material: {
          originalText: row.originalText,
          revision: revision ?? null,
          clarifications: questions,
          unsavedDraft: input.draft ?? null,
        },
      };
    });
  }
}
