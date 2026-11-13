import { capability, type ReasonCode } from '../http/capability.js';
import { validRevision, unanswered } from './requirements.eligibility.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AuthorizationRepository,
  type Access,
} from '../authorization/authorization.repository.js';
import type { PageDto } from '../authorization/rbac.dto.js';
import { AuditWriter } from '../audit/audit.module.js';
import type { DatabaseTransaction } from '../database/database.service.js';
import {
  RequirementsRepository,
  type Requirement,
} from './requirements.repository.js';
import type {
  ClarificationDto,
  CreateRequirementDto,
  PatchRequirementDto,
  RevisionDto,
  VersionDto,
} from './requirements.dto.js';
const conflict = (
  code: 'STALE_VERSION' | 'INVALID_TRANSITION' | 'REVIEW_IN_PROGRESS',
): never => {
  throw new ConflictException({ code });
};
const business = (): never => {
  throw new UnprocessableEntityException();
};
type Project = Awaited<ReturnType<AuthorizationRepository['project']>>;
@Injectable()
export class RequirementsService {
  constructor(
    @Inject(RequirementsRepository)
    private readonly repository: RequirementsRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  private read<T>(work: (tx: DatabaseTransaction) => Promise<T>) {
    return this.repository.database.db.transaction(work, {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    });
  }
  list(userId: string, projectId: string, page: PageDto) {
    return this.read(async (tx) => {
      const project = await this.authorization.project(
        userId.toLowerCase(),
        projectId.toLowerCase(),
        tx,
      );
      return this.repository.list(tx, project.id, page);
    });
  }
  detail(userId: string, id: string) {
    return this.read(async (tx) => {
      const row = await this.repository.get(tx, id.toLowerCase());
      const project = await this.authorization.project(
        userId.toLowerCase(),
        row.projectId,
        tx,
      );
      const latest = await this.repository.latest(tx, row.id);
      const questions = await this.repository.questions(tx, row.id);
      const pending = await this.repository.pending(tx, row.id);
      const exhausted: ReasonCode | undefined =
        row.draftVersion === 2147483647 ? 'VERSION_EXHAUSTED' : undefined;
      const supplier: ReasonCode | undefined =
        project.projectRole === 'CLIENT' ? 'ROLE_FORBIDDEN' : undefined;
      const nonReady: ReasonCode | undefined =
        row.status === 'READY' ? 'INVALID_TRANSITION' : undefined;
      const valid = validRevision(row.latestRevisionId, latest);
      return {
        ...row,
        capabilities: {
          editDraft: capability(
            (project.projectRole !== 'OWNER' &&
            row.createdBy !== userId.toLowerCase()
              ? 'ROLE_FORBIDDEN'
              : undefined) ??
              exhausted ??
              (row.status !== 'DRAFT' ? 'INVALID_TRANSITION' : undefined),
          ),
          askQuestion: capability(exhausted ?? nonReady),
          answerQuestion: capability(
            exhausted ??
              (row.status !== 'CLARIFYING'
                ? 'INVALID_TRANSITION'
                : undefined) ??
              (!questions.some((q) => q.kind === 'QUESTION')
                ? 'BUSINESS_RULE_VIOLATION'
                : undefined),
          ),
          createRevision: capability(
            supplier ??
              exhausted ??
              (pending ? 'REVIEW_IN_PROGRESS' : undefined) ??
              (latest?.revisionNo === 2147483647
                ? 'VERSION_EXHAUSTED'
                : undefined),
          ),
          markReady: capability(
            supplier ??
              exhausted ??
              nonReady ??
              (!valid ? 'REVISION_NOT_READY' : undefined) ??
              (unanswered(questions) ? 'UNANSWERED_QUESTIONS' : undefined),
          ),
          createChangeRequest: capability(
            supplier ??
              (row.status !== 'READY' || !valid
                ? 'REVISION_NOT_READY'
                : undefined),
          ),
        },
        clarifications: questions,
        latestRevision: latest?.id === row.latestRevisionId ? latest : null,
      };
    });
  }
  history(userId: string, id: string, page: PageDto) {
    return this.read(async (tx) => {
      const row = await this.repository.get(tx, id.toLowerCase());
      await this.authorization.project(userId.toLowerCase(), row.projectId, tx);
      return this.repository.revisions(tx, row.id, page);
    });
  }
  revisionDetail(userId: string, id: string, revisionId: string) {
    return this.read(async (tx) => {
      const row = await this.repository.get(tx, id.toLowerCase());
      await this.authorization.project(userId.toLowerCase(), row.projectId, tx);
      const revision = await this.repository.revision(
        tx,
        row.id,
        revisionId.toLowerCase(),
      );
      return { ...revision, projectId: row.projectId };
    });
  }
  create(userId: string, projectId: string, input: CreateRequirementDto) {
    userId = userId.toLowerCase();
    return this.repository.database.transaction(async (tx) => {
      const project = await this.authorization.projectWrite(
        userId,
        projectId.toLowerCase(),
        tx,
      );
      const row = await this.repository.create(tx, project.id, userId, input);
      await this.audit.write(tx, {
        workspaceId: project.workspaceId,
        projectId: project.id,
        actorId: userId,
        eventType: 'requirement.created',
        entityType: 'requirement',
        entityId: row.id,
        entityVersion: row.draftVersion,
      });
      return row;
    });
  }
  // Every aggregate mutation shares both authorization locks and the Requirement lock.
  private write<T>(
    userId: string,
    id: string,
    expectedVersion: number,
    allow: (row: Requirement, role: Access, actor: string) => boolean,
    work: (
      tx: DatabaseTransaction,
      row: Requirement,
      project: Project,
      actor: string,
    ) => Promise<T>,
  ) {
    userId = userId.toLowerCase();
    return this.repository.database.transaction(async (tx) => {
      const { row, project } = await this.lockForWrite(tx, userId, id);
      if (!allow(row, project.projectRole, userId))
        throw new ForbiddenException();
      this.assertVersion(row, expectedVersion);
      return work(tx, row, project, userId);
    });
  }
  // Internal transaction commands: callers retain the authorization/aggregate locks.
  async lockForWrite(tx: DatabaseTransaction, userId: string, id: string) {
    const visible = await this.repository.get(tx, id.toLowerCase());
    const project = await this.authorization.projectWrite(
      userId,
      visible.projectId,
      tx,
    );
    const row = await this.repository.get(tx, visible.id, true);
    if (row.projectId !== project.id) throw new NotFoundException();
    return { row, project };
  }
  assertVersion(row: Requirement, expectedVersion: number) {
    if (
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1 ||
      expectedVersion > 2147483647
    )
      throw new BadRequestException();
    if (expectedVersion !== row.draftVersion) conflict('STALE_VERSION');
    if (row.draftVersion === 2147483647) business();
  }
  patch(userId: string, id: string, input: PatchRequirementDto) {
    if (input.title === undefined && input.originalText === undefined)
      throw new BadRequestException();
    return this.write(
      userId,
      id,
      input.expectedVersion,
      (row, role, actor) => role === 'OWNER' || row.createdBy === actor,
      async (tx, row, project, actor) => {
        if (row.status !== 'DRAFT') conflict('INVALID_TRANSITION');
        const changes = {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.originalText !== undefined
            ? { originalText: input.originalText }
            : {}),
        };
        const updated = await this.repository.advance(tx, row, changes);
        await this.audit.write(tx, {
          workspaceId: project.workspaceId,
          projectId: project.id,
          actorId: actor,
          eventType: 'requirement.draft_updated',
          entityType: 'requirement',
          entityId: row.id,
          entityVersion: updated.draftVersion,
          metadata: { fields: Object.keys(changes) },
        });
        return updated;
      },
    );
  }
  clarify(userId: string, id: string, input: ClarificationDto) {
    return this.write(
      userId,
      id,
      input.expectedVersion,
      () => true,
      (tx, row, project, actor) =>
        this.clarifyInTransaction(tx, row, project, actor, input),
    );
  }
  async clarifyInTransaction(
    tx: DatabaseTransaction,
    row: Requirement,
    project: Project,
    actor: string,
    input: ClarificationDto,
  ) {
    this.assertVersion(row, input.expectedVersion);
    if (
      row.status === 'READY' ||
      (input.kind === 'ANSWER' && row.status !== 'CLARIFYING')
    )
      conflict('INVALID_TRANSITION');
    if (input.kind === 'QUESTION') {
      if (input.parentId != null) business();
    } else if (
      !input.parentId ||
      !(await this.repository.question(
        tx,
        row.id,
        input.parentId.toLowerCase(),
      ))
    )
      business();
    const clarification = await this.repository.addClarification(
      tx,
      row.id,
      actor,
      input,
    );
    const updated = await this.repository.advance(tx, row, {
      status: 'CLARIFYING',
    });
    await this.audit.write(tx, {
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorId: actor,
      eventType:
        input.kind === 'QUESTION'
          ? 'clarification.question_added'
          : 'clarification.answer_added',
      entityType: 'clarification',
      entityId: clarification.id,
      entityVersion: updated.draftVersion,
      metadata: {
        requirementId: row.id,
        parentId: clarification.parentId,
        fromStatus: row.status,
        toStatus: updated.status,
      },
    });
    return { ...clarification, ...this.aggregate(updated) };
  }
  revision(userId: string, id: string, input: RevisionDto) {
    return this.write(
      userId,
      id,
      input.expectedVersion,
      (_row, role) => role !== 'CLIENT',
      (tx, row, project, actor) =>
        this.revisionInTransaction(tx, row, project, actor, input),
    );
  }
  async revisionInTransaction(
    tx: DatabaseTransaction,
    row: Requirement,
    project: Project,
    actor: string,
    input: RevisionDto,
  ) {
    this.assertVersion(row, input.expectedVersion);
    if (project.projectRole === 'CLIENT') throw new ForbiddenException();
    if (await this.repository.pending(tx, row.id))
      conflict('REVIEW_IN_PROGRESS');
    const last = await this.repository.latest(tx, row.id);
    if (last?.revisionNo === 2147483647) business();
    const revision = await this.repository.addRevision(
      tx,
      row.id,
      actor,
      (last?.revisionNo ?? 0) + 1,
      input,
    );
    const updated = await this.repository.advance(tx, row, {
      status: 'CLARIFYING',
      latestRevisionId: revision.id,
    });
    await this.audit.write(tx, {
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorId: actor,
      eventType: 'requirement.revision_created',
      entityType: 'requirement_revision',
      entityId: revision.id,
      entityVersion: revision.revisionNo,
      metadata: {
        requirementId: row.id,
        draftVersion: updated.draftVersion,
        fromStatus: row.status,
        toStatus: updated.status,
      },
    });
    return { ...revision, ...this.aggregate(updated) };
  }
  ready(userId: string, id: string, input: VersionDto) {
    return this.write(
      userId,
      id,
      input.expectedVersion,
      (_row, role) => role !== 'CLIENT',
      async (tx, row, project, actor) => {
        if (row.status === 'READY') conflict('INVALID_TRANSITION');
        const revision = await this.repository.latest(tx, row.id);
        if (!validRevision(row.latestRevisionId, revision)) business();
        const questions = await this.repository.questions(tx, row.id);
        if (unanswered(questions)) business();
        const updated = await this.repository.advance(tx, row, {
          status: 'READY',
        });
        await this.audit.write(tx, {
          workspaceId: project.workspaceId,
          projectId: project.id,
          actorId: actor,
          eventType: 'requirement.marked_ready',
          entityType: 'requirement',
          entityId: row.id,
          entityVersion: updated.draftVersion,
          metadata: {
            revisionId: row.latestRevisionId,
            fromStatus: row.status,
            toStatus: updated.status,
          },
        });
        return updated;
      },
    );
  }
  private aggregate(row: Requirement) {
    return {
      requirementId: row.id,
      draftVersion: row.draftVersion,
      status: row.status,
      latestRevisionId: row.latestRevisionId,
    };
  }
}
