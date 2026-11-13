import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import {
  copilotProposals as proposals,
  requirementWorkingDrafts as drafts,
} from '../database/schema/index.js';
import { RequirementsService } from '../requirements/requirements.service.js';
import { RequirementsRepository } from '../requirements/requirements.repository.js';
import { workingDraftBody } from '../requirements/working-draft.contract.js';
import { ChangesService } from '../changes/changes.service.js';
import { ChangesRepository } from '../changes/changes.repository.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { AuditWriter } from '../audit/audit.module.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import { AiService } from '../ai/ai.service.js';
import { AiRepository } from '../ai/ai.repository.js';
import { DocumentsService } from '../documents/documents.service.js';
import {
  parseProposal,
  prepareProposal,
  editProposal,
  executeProposal,
  deleteProposal,
  proposalContent,
  proposalSources,
  type ProposalKind,
  type ProposalSource,
} from './proposals.contract.js';
type Proposal = typeof proposals.$inferSelect;
type Project = Awaited<ReturnType<AuthorizationRepository['project']>>;
const conflict = (code: string): never => {
  throw new ConflictException({ code });
};
@Injectable()
export class ProposalsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RequirementsService)
    private readonly requirements: RequirementsService,
    @Inject(RequirementsRepository)
    private readonly repository: RequirementsRepository,
    @Inject(ChangesService) private readonly changes: ChangesService,
    @Inject(ChangesRepository)
    private readonly changeRepository: ChangesRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
    @Inject(AiService) private readonly ai: AiService,
    @Inject(AiRepository) private readonly aiRepository: AiRepository,
    @Inject(DocumentsService) private readonly documents: DocumentsService,
  ) {}
  private allow(kind: ProposalKind, project: Project, write = false) {
    if (project.projectRole === 'CLIENT' && kind !== 'publish_questions')
      throw new ForbiddenException();
    if (write && project.status !== 'ACTIVE') conflict('INVALID_TRANSITION');
  }
  private own(actor: string, id: string, proposalId?: string) {
    return and(
      eq(proposals.userId, actor),
      eq(proposals.requirementId, id),
      proposalId ? eq(proposals.id, proposalId) : undefined,
    );
  }
  private async get(
    tx: DatabaseTransaction,
    actor: string,
    id: string,
    proposalId: string,
    lock = false,
  ) {
    const q = tx
      .select()
      .from(proposals)
      .where(this.own(actor, id, proposalId));
    const [row] = await (lock ? q.for('update') : q);
    if (!row) throw new NotFoundException();
    return row;
  }
  private public(row: Proposal) {
    const { requestHash: _hash, ...safe } = row;
    return safe;
  }
  private async event(
    tx: DatabaseTransaction,
    actor: string,
    project: Project,
    row: Proposal,
    action: 'prepared' | 'edited' | 'deleted' | 'executed',
  ) {
    await this.audit.write(tx, {
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorId: actor,
      eventType: `copilot_proposal.${action}`,
      entityType: 'copilot_proposal',
      entityId: row.id,
      entityVersion: row.version,
      metadata: { requirementId: row.requirementId, kind: row.kind },
    });
  }
  private async quota(tx: DatabaseTransaction, actor: string, id: string) {
    const [r] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(proposals)
      .where(and(this.own(actor, id), eq(proposals.status, 'DRAFT')));
    if (r.n >= 100)
      throw new UnprocessableEntityException({ code: 'PROPOSAL_LIMIT' });
  }
  private async currentDraft(
    tx: DatabaseTransaction,
    actor: string,
    id: string,
    draftId: string,
  ) {
    const [draft] = await tx
      .select()
      .from(drafts)
      .where(
        and(
          eq(drafts.id, draftId),
          eq(drafts.userId, actor),
          eq(drafts.requirementId, id),
        ),
      );
    if (!draft) throw new NotFoundException();
    return draft;
  }
  private async checkSources(
    tx: DatabaseTransaction,
    actor: string,
    id: string,
    project: Project,
    sources: ProposalSource[],
  ) {
    const req = await this.repository.get(tx, id);
    try {
      for (const source of sources) {
        if (
          source.type === 'requirement' &&
          (source.id !== id || source.version !== req.draftVersion)
        )
          conflict('PROPOSAL_SOURCE_STALE');
        if (source.type === 'revision' && source.id !== req.latestRevisionId)
          conflict('PROPOSAL_SOURCE_STALE');
        if (source.type === 'document') {
          await this.documents.checkSharedReference(
            tx,
            actor,
            project.id,
            source.documentId,
            source.versionId,
          );
        }
        if (source.type === 'working_draft') {
          const d = await this.currentDraft(tx, actor, id, source.id);
          if (d.version !== source.version) conflict('PROPOSAL_SOURCE_STALE');
        }
        if (source.type === 'change_request') {
          const c = await this.changeRepository.get(tx, source.id);
          if (c.requirementId !== id || c.lockVersion !== source.version)
            conflict('PROPOSAL_SOURCE_STALE');
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) conflict('PROPOSAL_SOURCE_STALE');
      throw error;
    }
  }
  async prepare(
    actor: string,
    sessionId: string,
    id: string,
    raw: unknown,
    requestId: string,
    signal?: AbortSignal,
  ) {
    const input = parseProposal(prepareProposal, raw);
    const initial = await this.database.transaction(async (tx) => {
      const { row, project } = await this.requirements.lockForWrite(
        tx,
        actor,
        id,
      );
      await this.aiRepository.assertSession(tx, actor, sessionId, true);
      this.allow(input.kind, project, true);
      this.requirements.assertVersion(row, input.expectedVersion);
      await this.quota(tx, actor, id);
      this.limits.consume(`proposal-user:${actor}`, 30, 3600000);
      this.limits.consume(`proposal-project:${project.id}`, 60, 3600000);
      const sources: ProposalSource[] = [
        { type: 'requirement', id, version: row.draftVersion },
      ];
      let payload: Record<string, unknown> = {};
      if (row.latestRevisionId)
        sources.push({ type: 'revision', id: row.latestRevisionId });
      if (input.source === 'working_draft') {
        const d = await this.currentDraft(tx, actor, id, input.draftId!);
        const kind =
          input.kind === 'publish_questions' ? 'clarify' : 'specification';
        if (d.kind !== kind) throw new BadRequestException();
        if (
          d.version !== input.expectedDraftVersion ||
          d.baseRequirementVersion !== row.draftVersion
        )
          conflict('PROPOSAL_SOURCE_STALE');
        const content = workingDraftBody.parse({ kind: d.kind, body: d.body });
        payload =
          content.kind === 'clarify'
            ? {
                ...content.body,
                questions: content.body.questions
                  .filter(
                    (q) =>
                      !d.publication.questions?.some((p) => p.itemId === q.id),
                  )
                  .map((q) => ({ ...q, selected: true })),
              }
            : content.body;
        if (
          content.kind === 'specification' &&
          d.publication.revision?.draftVersion === d.version
        )
          conflict('DRAFT_ALREADY_PUBLISHED');
        sources.push({ type: 'working_draft', id: d.id, version: d.version });
      }
      if (input.source === 'current') {
        const revision = await this.repository.latest(tx, id);
        if (
          row.status !== 'READY' ||
          !revision ||
          row.latestRevisionId !== revision.id
        )
          throw new UnprocessableEntityException();
        payload = {
          requirementRevisionId: revision.id,
          scopeSummary: revision.content,
          acceptanceCriteria: revision.acceptanceCriteria,
          estimateHours: null,
          costDeltaMinor: null,
          currency: null,
          scheduleDeltaDays: null,
        };
        if (input.kind === 'update_change_draft') {
          const c = await this.changeRepository.get(
            tx,
            input.changeRequestId!,
            true,
          );
          if (c.requirementId !== id) throw new NotFoundException();
          if (c.status !== 'DRAFT') conflict('INVALID_TRANSITION');
          if (c.lockVersion !== input.expectedChangeVersion)
            conflict('STALE_VERSION');
          if (c.draftRequirementRevisionId !== revision.id)
            conflict('PROPOSAL_SOURCE_STALE');
          const cost =
            c.draftCostDeltaMinor === null
              ? null
              : Number(c.draftCostDeltaMinor);
          if (cost !== null && !Number.isSafeInteger(cost))
            throw new UnprocessableEntityException();
          payload = {
            requirementRevisionId: c.draftRequirementRevisionId,
            scopeSummary: c.draftScopeSummary,
            acceptanceCriteria: c.draftAcceptanceCriteria,
            estimateHours: c.draftEstimateHours,
            costDeltaMinor: cost,
            currency: c.draftCurrency,
            scheduleDeltaDays: c.draftScheduleDeltaDays,
          };
          sources.push({
            type: 'change_request',
            id: c.id,
            version: c.lockVersion,
          });
        }
      }
      return { project, sources, payload };
    });
    if (input.source === 'generate') {
      // No Copilot chat/history/tool output enters this fresh, shared-only assistance context.
      const response = await this.ai.assist(
        actor,
        sessionId,
        id,
        {
          expectedVersion: input.expectedVersion,
          mode:
            input.kind === 'publish_questions' ? 'clarify' : 'specification',
          instruction: input.instruction ?? '',
        },
        requestId,
        signal,
      );
      const r = response.result;
      initial.payload =
        'questions' in r
          ? {
              ...r,
              questions: r.questions.map((q) => ({
                ...q,
                id: randomUUID(),
                selected: true,
              })),
            }
          : r;
      initial.sources.push(
        ...response.source.background.map((s) => ({
          type: 'document' as const,
          documentId: s.documentId,
          versionId: s.versionId,
          chunkId: s.chunkId,
        })),
      );
    }
    const content = parseProposal(proposalContent, {
      kind: input.kind,
      payload: initial.payload,
    });
    return this.database.transaction(async (tx) => {
      const { row, project } = await this.requirements.lockForWrite(
        tx,
        actor,
        id,
      );
      await this.aiRepository.assertSession(tx, actor, sessionId, true);
      this.allow(input.kind, project, true);
      this.requirements.assertVersion(row, input.expectedVersion);
      if (project.projectRole !== initial.project.projectRole)
        throw new ForbiddenException();
      await this.quota(tx, actor, id);
      await this.checkSources(tx, actor, id, project, initial.sources);
      signal?.throwIfAborted();
      const [saved] = await tx
        .insert(proposals)
        .values({
          requirementId: id,
          userId: actor,
          kind: input.kind,
          baseRequirementVersion: row.draftVersion,
          changeRequestId: input.changeRequestId ?? null,
          baseChangeVersion: input.expectedChangeVersion ?? null,
          payload: content.payload,
          sources: initial.sources,
          expiresAt: sql`now()+interval '24 hours'`,
        })
        .returning();
      await this.event(tx, actor, project, saved, 'prepared');
      return this.public(saved);
    });
  }
  async list(actor: string, id: string, page = { limit: 20, offset: 0 }) {
    return this.database.db.transaction(
      async (tx) => {
        const req = await this.repository.get(tx, id);
        const project = await this.authorization.project(
          actor,
          req.projectId,
          tx,
        );
        const rows = await tx
          .select()
          .from(proposals)
          .where(
            and(
              this.own(actor, id),
              project.projectRole === 'CLIENT'
                ? eq(proposals.kind, 'publish_questions')
                : undefined,
            ),
          )
          .orderBy(
            asc(proposals.status),
            desc(proposals.createdAt),
            desc(proposals.id),
          )
          .limit(page.limit + 1)
          .offset(page.offset);
        return {
          items: rows.slice(0, page.limit).map((r) => this.public(r)),
          hasMore: rows.length > page.limit,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  async read(actor: string, id: string, proposalId: string) {
    return this.database.db.transaction(
      async (tx) => {
        const req = await this.repository.get(tx, id);
        const project = await this.authorization.project(
          actor,
          req.projectId,
          tx,
        );
        const row = await this.get(tx, actor, id, proposalId);
        this.allow(row.kind, project);
        return this.public(row);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  private async editable(
    tx: DatabaseTransaction,
    row: Proposal,
    version: number,
  ) {
    if (row.status !== 'DRAFT') conflict('OPERATION_CONFLICT');
    if (row.version !== version || row.version === 2147483647)
      conflict('PROPOSAL_STALE');
    const time = await tx.execute<{ expired: boolean }>(
      sql`SELECT ${row.expiresAt}::timestamptz<=clock_timestamp() AS expired`,
    );
    if (time.rows[0].expired) conflict('PROPOSAL_EXPIRED');
  }
  async edit(
    actor: string,
    sessionId: string,
    id: string,
    proposalId: string,
    raw: unknown,
  ) {
    const input = parseProposal(editProposal, raw);
    return this.database.transaction(async (tx) => {
      const { project } = await this.requirements.lockForWrite(tx, actor, id);
      await this.aiRepository.assertSession(tx, actor, sessionId, true);
      const row = await this.get(tx, actor, id, proposalId, true);
      this.allow(row.kind, project, true);
      await this.editable(tx, row, input.expectedProposalVersion);
      if (input.content.kind !== row.kind) throw new BadRequestException();
      // A user may edit text and assessments, never the business target or immutable revision binding.
      if (
        'requirementRevisionId' in input.content.payload &&
        input.content.payload.requirementRevisionId !==
          row.payload.requirementRevisionId
      )
        throw new BadRequestException();
      const [saved] = await tx
        .update(proposals)
        .set({
          payload: input.content.payload,
          version: row.version + 1,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(proposals.id, row.id))
        .returning();
      await this.event(tx, actor, project, saved, 'edited');
      return this.public(saved);
    });
  }
  async remove(
    actor: string,
    sessionId: string,
    id: string,
    proposalId: string,
    raw: unknown,
  ) {
    const input = parseProposal(deleteProposal, raw);
    return this.database.transaction(async (tx) => {
      const { project } = await this.requirements.lockForWrite(tx, actor, id);
      await this.aiRepository.assertSession(tx, actor, sessionId, true);
      const row = await this.get(tx, actor, id, proposalId, true);
      this.allow(row.kind, project, true);
      if (row.status !== 'DRAFT') conflict('OPERATION_CONFLICT');
      if (row.version !== input.expectedProposalVersion)
        conflict('PROPOSAL_STALE');
      await tx.delete(proposals).where(eq(proposals.id, row.id));
      await this.event(tx, actor, project, row, 'deleted');
      return { deleted: true as const };
    });
  }
  async execute(
    actor: string,
    sessionId: string,
    id: string,
    proposalId: string,
    raw: unknown,
  ) {
    const input = parseProposal(executeProposal, raw);
    const hash = createHash('sha256')
      .update(JSON.stringify({ actor, id, proposalId, input }))
      .digest('hex');
    return this.database
      .transaction(async (tx) => {
        const { row: req, project } = await this.requirements.lockForWrite(
          tx,
          actor,
          id,
        );
        await this.aiRepository.assertSession(tx, actor, sessionId, true);
        const visible = await this.get(tx, actor, id, proposalId);
        this.allow(visible.kind, project, true);
        // Same global lock order as the existing R04/R05 commands.
        const change = visible.changeRequestId
          ? await this.changeRepository.get(tx, visible.changeRequestId, true)
          : null;
        const row = await this.get(tx, actor, id, proposalId, true);
        if (row.status === 'EXECUTED') {
          if (row.operationId !== input.operationId || row.requestHash !== hash)
            conflict('OPERATION_CONFLICT');
          return this.public(row);
        }
        await this.editable(tx, row, input.expectedProposalVersion);
        this.requirements.assertVersion(req, input.expectedVersion);
        if (row.baseRequirementVersion !== input.expectedVersion)
          conflict('PROPOSAL_SOURCE_STALE');
        if (
          (row.baseChangeVersion ?? undefined) !== input.expectedChangeVersion
        )
          conflict('STALE_VERSION');
        if (
          change &&
          (change.requirementId !== id ||
            change.lockVersion !== input.expectedChangeVersion)
        )
          conflict('STALE_VERSION');
        await this.checkSources(
          tx,
          actor,
          id,
          project,
          proposalSources.parse(row.sources),
        );
        const content = parseProposal(proposalContent, {
          kind: row.kind,
          payload: row.payload,
        });
        const result: Record<string, unknown> = {
          requirementVersion: req.draftVersion,
        };
        if (content.kind === 'publish_questions') {
          const selected = content.payload.questions.filter((q) => q.selected);
          if (!selected.length) throw new UnprocessableEntityException();
          if (req.draftVersion + selected.length > 2147483647)
            throw new UnprocessableEntityException();
          let aggregate = req;
          const ids: string[] = [];
          for (const question of selected) {
            const added = await this.requirements.clarifyInTransaction(
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
            aggregate = {
              ...aggregate,
              draftVersion: added.draftVersion,
              status: added.status,
            };
            ids.push(added.id);
          }
          result.requirementVersion = aggregate.draftVersion;
          result.clarificationIds = ids;
        } else if (content.kind === 'create_revision') {
          if (!content.payload.content.trim())
            throw new UnprocessableEntityException();
          const added = await this.requirements.revisionInTransaction(
            tx,
            req,
            project,
            actor,
            {
              content: content.payload.content,
              acceptanceCriteria: content.payload.acceptanceCriteria,
              expectedVersion: input.expectedVersion,
            },
          );
          result.requirementVersion = added.draftVersion;
          result.revisionId = added.id;
        } else {
          const created =
            content.kind === 'create_change_draft'
              ? await this.changes.createInTransaction(tx, req, project, actor)
              : null;
          const target = created
            ? await this.changeRepository.get(tx, created.id, true)
            : change;
          if (!target) throw new NotFoundException();
          const updated = await this.changes.patchInTransaction(
            tx,
            target,
            req,
            project,
            actor,
            { ...content.payload, expectedVersion: target.lockVersion },
          );
          result.changeRequestId = updated.id;
          result.changeVersion = updated.lockVersion;
        }
        const [saved] = await tx
          .update(proposals)
          .set({
            status: 'EXECUTED',
            version: row.version + 1,
            operationId: input.operationId,
            requestHash: hash,
            result,
            executedAt: sql`statement_timestamp()`,
            updatedAt: sql`statement_timestamp()`,
          })
          .where(eq(proposals.id, row.id))
          .returning();
        // A conflicting operationId rolls back all business writes and audit; never exposes the owner of that ID.
        await this.event(tx, actor, project, saved, 'executed');
        return this.public(saved);
      })
      .catch((error: unknown) => {
        let current: unknown = error;
        for (let i = 0; i < 3 && current && typeof current === 'object'; i++) {
          const e = current as {
            code?: string;
            constraint?: string;
            cause?: unknown;
          };
          if (
            e.code === '23505' &&
            e.constraint === 'copilot_proposals_operation_unique'
          )
            conflict('OPERATION_CONFLICT');
          if (
            e.code === '23514' &&
            e.constraint === 'copilot_proposals_time_valid'
          )
            conflict('PROPOSAL_EXPIRED');
          current = e.cause;
        }
        throw error;
      });
  }
}
