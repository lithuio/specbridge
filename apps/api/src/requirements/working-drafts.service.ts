import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import {
  requirementWorkingDrafts as drafts,
  requirementPublishReceipts as receipts,
} from '../database/schema/index.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { AuditWriter } from '../audit/audit.module.js';
import { RequirementsRepository } from './requirements.repository.js';
import { RequirementsService } from './requirements.service.js';
import {
  parseSaveWorkingDraft,
  parsePublishWorkingDraft,
  parseDeleteWorkingDraft,
  workingDraftKind,
  workingDraftBody,
  type WorkingDraftKind,
} from './working-draft.contract.js';

type Draft = typeof drafts.$inferSelect;
const stale = (): never => {
  throw new ConflictException({ code: 'STALE_WORKING_DRAFT' });
};

@Injectable()
export class WorkingDraftsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RequirementsRepository)
    private readonly repository: RequirementsRepository,
    @Inject(RequirementsService)
    private readonly requirements: RequirementsService,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  private kind(value: string) {
    const parsed = workingDraftKind.safeParse(value);
    if (!parsed.success) throw new BadRequestException();
    return parsed.data;
  }
  private allow(kind: WorkingDraftKind, role: string) {
    if (kind === 'specification' && role === 'CLIENT')
      throw new ForbiddenException();
  }
  private own(actor: string, id: string, kind: WorkingDraftKind) {
    return and(
      eq(drafts.userId, actor),
      eq(drafts.requirementId, id),
      eq(drafts.kind, kind),
    );
  }
  private cas(row: Draft | undefined, id: string, version: number): Draft {
    if (!row || row.id !== id || row.version !== version) return stale();
    if (row.version === 2147483647) throw new UnprocessableEntityException();
    return row;
  }
  list(actor: string, id: string) {
    actor = actor.toLowerCase();
    id = id.toLowerCase();
    return this.database.db.transaction(
      async (tx) => {
        const row = await this.repository.get(tx, id);
        const project = await this.authorization.project(
          actor,
          row.projectId,
          tx,
        );
        return tx
          .select()
          .from(drafts)
          .where(
            and(
              eq(drafts.userId, actor),
              eq(drafts.requirementId, id),
              project.projectRole === 'CLIENT'
                ? eq(drafts.kind, 'clarify')
                : undefined,
            ),
          );
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  save(actor: string, id: string, kind: string, body: unknown) {
    actor = actor.toLowerCase();
    id = id.toLowerCase();
    const input = parseSaveWorkingDraft(body);
    if (
      input.kind !== this.kind(kind) ||
      (input.expectedDraftVersion === 0) !== (input.draftId === null)
    )
      throw new BadRequestException();
    return this.database.transaction(async (tx) => {
      const { row, project } = await this.requirements.lockForWrite(
        tx,
        actor,
        id,
      );
      this.allow(input.kind, project.projectRole);
      if (project.status !== 'ACTIVE')
        throw new ConflictException({ code: 'INVALID_TRANSITION' });
      if (input.baseRequirementVersion > row.draftVersion)
        throw new BadRequestException();
      const [current] = await tx
        .select()
        .from(drafts)
        .where(this.own(actor, id, input.kind))
        .for('update');
      let saved: Draft;
      if (input.expectedDraftVersion === 0) {
        if (current) return stale();
        [saved] = await tx
          .insert(drafts)
          .values({
            requirementId: id,
            userId: actor,
            kind: input.kind,
            body: input.body,
            baseRequirementVersion: input.baseRequirementVersion,
          })
          .returning();
      } else {
        const existing = this.cas(
          current,
          input.draftId!,
          input.expectedDraftVersion,
        );
        const publication = { ...existing.publication };
        if (input.kind === 'clarify') {
          const previous = workingDraftBody.parse({
            kind: existing.kind,
            body: existing.body,
          });
          if (previous.kind !== 'clarify') throw new BadRequestException();
          for (const published of publication.questions ?? []) {
            const next = input.body.questions.find(
              (q) => q.id === published.itemId,
            );
            const old = previous.body.questions.find(
              (q) => q.id === published.itemId,
            );
            if (next && next.body !== old?.body)
              throw new ConflictException({
                code: 'QUESTION_ALREADY_PUBLISHED',
              });
          }
          publication.questions = publication.questions?.filter((p) =>
            input.body.questions.some((q) => q.id === p.itemId),
          );
        }
        [saved] = await tx
          .update(drafts)
          .set({
            body: input.body,
            baseRequirementVersion: input.baseRequirementVersion,
            version: existing.version + 1,
            publication,
            updatedAt: new Date(),
          })
          .where(eq(drafts.id, existing.id))
          .returning();
      }
      await this.audit.write(tx, {
        workspaceId: project.workspaceId,
        projectId: project.id,
        actorId: actor,
        eventType: 'requirement.working_draft_saved',
        entityType: 'requirement_working_draft',
        entityId: saved.id,
        entityVersion: saved.version,
      });
      return saved;
    });
  }
  remove(actor: string, id: string, kind: string, body: unknown) {
    actor = actor.toLowerCase();
    id = id.toLowerCase();
    const parsedKind = this.kind(kind),
      input = parseDeleteWorkingDraft(body);
    return this.database.transaction(async (tx) => {
      const { project } = await this.requirements.lockForWrite(tx, actor, id);
      this.allow(parsedKind, project.projectRole);
      const [current] = await tx
        .select()
        .from(drafts)
        .where(this.own(actor, id, parsedKind))
        .for('update');
      const row = this.cas(current, input.draftId, input.expectedDraftVersion);
      await tx.delete(drafts).where(eq(drafts.id, row.id));
      await this.audit.write(tx, {
        workspaceId: project.workspaceId,
        projectId: project.id,
        actorId: actor,
        eventType: 'requirement.working_draft_deleted',
        entityType: 'requirement_working_draft',
        entityId: row.id,
        entityVersion: row.version,
      });
      return { deleted: true as const };
    });
  }
  private async findReceipt(
    tx: DatabaseTransaction,
    actor: string,
    id: string,
    operationId: string,
  ) {
    const [receipt] = await tx
      .select()
      .from(receipts)
      .where(
        and(
          eq(receipts.id, operationId),
          eq(receipts.userId, actor),
          eq(receipts.requirementId, id),
        ),
      );
    return receipt;
  }
  receipt(actor: string, id: string, operationId: string) {
    actor = actor.toLowerCase();
    id = id.toLowerCase();
    return this.database.db.transaction(
      async (tx) => {
        const row = await this.repository.get(tx, id);
        const project = await this.authorization.project(
          actor,
          row.projectId,
          tx,
        );
        const receipt = await this.findReceipt(
          tx,
          actor,
          id,
          operationId.toLowerCase(),
        );
        if (!receipt) throw new NotFoundException();
        this.allow(receipt.kind, project.projectRole);
        return this.publicReceipt(receipt);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  private publicReceipt(receipt: typeof receipts.$inferSelect) {
    return {
      operationId: receipt.id,
      draftId: receipt.draftId,
      kind: receipt.kind,
      ...receipt.result,
    };
  }
  publish(actor: string, id: string, kind: string, body: unknown) {
    actor = actor.toLowerCase();
    id = id.toLowerCase();
    const input = parsePublishWorkingDraft(body);
    if (input.kind !== this.kind(kind)) throw new BadRequestException();
    // Strict schemas fix property order; question order is meaningful and bound to the receipt.
    const hash = createHash('sha256')
      .update(JSON.stringify({ actor, id, input }))
      .digest('hex');
    return this.database.transaction(async (tx) => {
      const { row, project } = await this.requirements.lockForWrite(
        tx,
        actor,
        id,
      );
      this.allow(input.kind, project.projectRole);
      const previous = await this.findReceipt(tx, actor, id, input.operationId);
      if (previous) {
        if (previous.requestHash !== hash)
          throw new ConflictException({ code: 'OPERATION_CONFLICT' });
        return this.publicReceipt(previous);
      }
      if (project.status !== 'ACTIVE')
        throw new ConflictException({ code: 'INVALID_TRANSITION' });
      const [current] = await tx
        .select()
        .from(drafts)
        .where(this.own(actor, id, input.kind))
        .for('update');
      const draft = this.cas(
        current,
        input.draftId,
        input.expectedDraftVersion,
      );
      this.requirements.assertVersion(row, input.expectedVersion);
      if (draft.baseRequirementVersion !== input.expectedVersion)
        throw new ConflictException({ code: 'STALE_VERSION' });
      const content = workingDraftBody.parse({
        kind: draft.kind,
        body: draft.body,
      });
      const publication = { ...draft.publication };
      let requirementVersion = row.draftVersion;
      const result: (typeof receipts.$inferInsert)['result'] = {
        requirementVersion,
        workingDraftVersion: draft.version + 1,
      };
      if (input.kind === 'clarify' && content.kind === 'clarify') {
        if (row.draftVersion + input.questionIds.length > 2147483647)
          throw new UnprocessableEntityException();
        const selected = input.questionIds.map((itemId) => {
          const q = content.body.questions.find((q) => q.id === itemId);
          if (!q) throw new BadRequestException();
          if (publication.questions?.some((p) => p.itemId === itemId))
            throw new ConflictException({ code: 'QUESTION_ALREADY_PUBLISHED' });
          return q;
        });
        result.clarificationIds = [];
        let aggregate = row;
        for (const question of selected) {
          const published = await this.requirements.clarifyInTransaction(
            tx,
            aggregate,
            project,
            actor,
            {
              kind: 'QUESTION',
              body: question.body,
              expectedVersion: aggregate.draftVersion,
            },
          );
          result.clarificationIds.push(published.id);
          publication.questions = [
            ...(publication.questions ?? []),
            { itemId: question.id, clarificationId: published.id },
          ];
          aggregate = {
            ...aggregate,
            draftVersion: published.draftVersion,
            status: published.status,
          };
        }
        requirementVersion = aggregate.draftVersion;
      } else if (
        input.kind === 'specification' &&
        content.kind === 'specification'
      ) {
        if (!content.body.content.trim())
          throw new UnprocessableEntityException();
        if (publication.revision?.draftVersion === draft.version)
          throw new ConflictException({ code: 'DRAFT_ALREADY_PUBLISHED' });
        const revision = await this.requirements.revisionInTransaction(
          tx,
          row,
          project,
          actor,
          {
            expectedVersion: input.expectedVersion,
            content: content.body.content,
            acceptanceCriteria: content.body.acceptanceCriteria,
          },
        );
        result.revisionId = revision.id;
        requirementVersion = revision.draftVersion;
        publication.revision = {
          revisionId: revision.id,
          draftVersion: draft.version + 1,
        };
      } else throw new BadRequestException();
      result.requirementVersion = requirementVersion;
      await tx
        .update(drafts)
        .set({
          publication,
          version: draft.version + 1,
          baseRequirementVersion: requirementVersion,
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, draft.id));
      const [receipt] = await tx
        .insert(receipts)
        .values({
          id: input.operationId,
          requirementId: id,
          userId: actor,
          draftId: draft.id,
          draftVersion: draft.version,
          kind: input.kind,
          requestHash: hash,
          result,
        })
        .onConflictDoNothing()
        .returning();
      if (!receipt) throw new ConflictException({ code: 'OPERATION_CONFLICT' });
      return this.publicReceipt(receipt);
    });
  }
}
