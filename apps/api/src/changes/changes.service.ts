import { capability, type ReasonCode } from '../http/capability.js';
import { approvedDeliveryVersion } from '../deliveries/delivery-eligibility.js';
import { DeliveriesRepository } from '../deliveries/deliveries.repository.js';
import { validRevision } from '../requirements/requirements.eligibility.js';
import type { ChangeListDto } from '../http/read.dto.js';
import {
  HttpException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  AuthorizationRepository,
  type Access,
} from '../authorization/authorization.repository.js';
import type { PageDto } from '../authorization/rbac.dto.js';
import { AuditWriter } from '../audit/audit.module.js';
import type { DatabaseTransaction } from '../database/database.service.js';
import {
  ChangesRepository,
  type Change,
  type Frozen,
  type Requirement,
} from './changes.repository.js';
import {
  ChangeDecisionDto,
  ChangeVersionDto,
  PatchChangeDto,
} from './changes.dto.js';
const conflict = (
  code: 'STALE_VERSION' | 'INVALID_TRANSITION' | 'ALREADY_REVIEWED',
): never => {
  throw new ConflictException({ code });
};
const business = (code = 'BUSINESS_RULE_VIOLATION'): never => {
  throw new UnprocessableEntityException({ code });
};
const max = 2147483647;
type Project = Awaited<ReturnType<AuthorizationRepository['project']>>;
function validate<T extends object>(type: new () => T, value: T): T {
  const input = plainToInstance(type, value);
  if (
    validateSync(input, { whitelist: true, forbidNonWhitelisted: true }).length
  )
    throw new BadRequestException();
  return input;
}
function money(value: bigint | null) {
  if (value === null) return null;
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(-Number.MAX_SAFE_INTEGER)
  )
    throw new Error('Stored amount outside API range');
  return Number(value);
}
function draft(row: Change) {
  return {
    requirementRevisionId: row.draftRequirementRevisionId,
    scopeSummary: row.draftScopeSummary,
    estimateHours: row.draftEstimateHours,
    costDeltaMinor: money(row.draftCostDeltaMinor),
    currency: row.draftCurrency,
    scheduleDeltaDays: row.draftScheduleDeltaDays,
    acceptanceCriteria: row.draftAcceptanceCriteria,
  };
}
function checkedAssessment(row: Change) {
  const fields = draft(row);
  if (
    Object.values(fields).some((v) => v === null) ||
    !fields.acceptanceCriteria?.length
  )
    return undefined;
  const checked = plainToInstance(PatchChangeDto, {
    expectedVersion: row.lockVersion,
    ...fields,
  });
  return validateSync(checked).length ? undefined : checked;
}
function summary(row: Change, projectId: string) {
  return {
    id: row.id,
    requirementId: row.requirementId,
    projectId,
    status: row.status,
    lockVersion: row.lockVersion,
    activeVersionId: row.activeVersionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
@Injectable()
export class ChangesService {
  constructor(
    @Inject(ChangesRepository) private readonly repository: ChangesRepository,
    @Inject(DeliveriesRepository)
    private readonly deliveries: DeliveriesRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  private async ready(
    tx: DatabaseTransaction,
    row: Requirement,
    revisionId?: string,
  ) {
    const latest = await this.repository.latestRevision(tx, row.id);
    if (
      row.status !== 'READY' ||
      !validRevision(row.latestRevisionId, latest) ||
      (revisionId !== undefined && latest?.id !== revisionId)
    )
      business();
    return latest!;
  }
  private async event(
    tx: DatabaseTransaction,
    row: Change,
    project: Project,
    actor: string,
    eventType:
      | 'change_request.created'
      | 'change_request.draft_updated'
      | 'change_request.submitted'
      | 'change_request.vendor_decided'
      | 'change_request.client_decided'
      | 'change_request.reopened',
    metadata: Record<string, unknown> = {},
  ) {
    await this.audit.write(tx, {
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorId: actor,
      entityType: 'change_request',
      entityId: row.id,
      entityVersion: row.lockVersion,
      eventType,
      metadata,
    });
  }
  create(actor: string, requirementId: string) {
    actor = actor.toLowerCase();
    return this.repository.database.transaction(async (tx) => {
      const located = await this.repository.requirement(
        tx,
        requirementId.toLowerCase(),
      );
      const project = await this.authorization.projectWrite(
        actor,
        located.projectId,
        tx,
      );
      const requirement = await this.repository.requirement(
        tx,
        located.id,
        true,
      );
      if (requirement.projectId !== project.id) throw new NotFoundException();
      if (project.projectRole === 'CLIENT') throw new ForbiddenException();
      const revision = await this.ready(tx, requirement);
      const row = await this.repository.create(
        tx,
        requirement.id,
        revision.id,
        actor,
      );
      await this.event(tx, row, project, actor, 'change_request.created', {
        requirementId: requirement.id,
        revisionId: revision.id,
      });
      return { ...summary(row, project.id), draft: draft(row) };
    });
  }
  private write<T>(
    actor: string,
    id: string,
    expectedVersion: number,
    allowed: readonly Access[],
    work: (
      tx: DatabaseTransaction,
      row: Change,
      requirement: Requirement,
      project: Project,
      actor: string,
    ) => Promise<T>,
  ) {
    actor = actor.toLowerCase();
    return this.repository.database.transaction(async (tx) => {
      const located = await this.repository.get(tx, id.toLowerCase());
      const parent = await this.repository.requirement(
        tx,
        located.requirementId,
      );
      const project = await this.authorization.projectWrite(
        actor,
        parent.projectId,
        tx,
      );
      const requirement = await this.repository.requirement(
        tx,
        parent.id,
        true,
      );
      const row = await this.repository.get(tx, located.id, true);
      if (
        requirement.projectId !== project.id ||
        row.requirementId !== requirement.id
      )
        throw new NotFoundException();
      if (!allowed.includes(project.projectRole))
        throw new ForbiddenException();
      validate(ChangeVersionDto, { expectedVersion });
      if (expectedVersion !== row.lockVersion) conflict('STALE_VERSION');
      if (row.lockVersion === max) business();
      return work(tx, row, requirement, project, actor);
    });
  }
  patch(actor: string, id: string, input: PatchChangeDto) {
    input = validate(PatchChangeDto, input);
    const fields = Object.keys(input).filter(
      (k) =>
        k !== 'expectedVersion' &&
        input[k as keyof PatchChangeDto] !== undefined,
    );
    if (!fields.length) throw new BadRequestException();
    return this.write(
      actor,
      id,
      input.expectedVersion,
      ['OWNER', 'DEVELOPER'],
      async (tx, row, requirement, project, actor) => {
        if (row.status !== 'DRAFT') conflict('INVALID_TRANSITION');
        if (input.requirementRevisionId !== undefined)
          await this.ready(
            tx,
            requirement,
            input.requirementRevisionId.toLowerCase(),
          );
        const hours = input.estimateHours;
        const updated = await this.repository.advance(tx, row, {
          ...(input.requirementRevisionId !== undefined
            ? {
                draftRequirementRevisionId:
                  input.requirementRevisionId.toLowerCase(),
              }
            : {}),
          ...(input.scopeSummary !== undefined
            ? { draftScopeSummary: input.scopeSummary }
            : {}),
          ...(hours !== undefined
            ? {
                draftEstimateHours:
                  hours === null
                    ? null
                    : `${hours.split('.')[0]}.${(hours.split('.')[1] ?? '').padEnd(2, '0')}`,
              }
            : {}),
          ...(input.costDeltaMinor !== undefined
            ? {
                draftCostDeltaMinor:
                  input.costDeltaMinor === null
                    ? null
                    : BigInt(input.costDeltaMinor),
              }
            : {}),
          ...(input.currency !== undefined
            ? { draftCurrency: input.currency }
            : {}),
          ...(input.scheduleDeltaDays !== undefined
            ? { draftScheduleDeltaDays: input.scheduleDeltaDays }
            : {}),
          ...(input.acceptanceCriteria !== undefined
            ? { draftAcceptanceCriteria: input.acceptanceCriteria }
            : {}),
        });
        await this.event(
          tx,
          updated,
          project,
          actor,
          'change_request.draft_updated',
          { fields },
        );
        return { ...summary(updated, project.id), draft: draft(updated) };
      },
    );
  }
  submit(actor: string, id: string, input: ChangeVersionDto) {
    return this.write(
      actor,
      id,
      input.expectedVersion,
      ['OWNER', 'DEVELOPER'],
      async (tx, row, requirement, project, actor) => {
        if (row.status !== 'DRAFT') conflict('INVALID_TRANSITION');
        const client = await this.repository.client(
          tx,
          project.id,
          project.workspaceId,
        );
        if (!client) business('CLIENT_REQUIRED');
        if (client!.conflict) business('ROLE_CONFLICT');
        await this.ready(tx, requirement, row.draftRequirementRevisionId);
        const checked = checkedAssessment(row);
        if (!checked) business();
        const previous = await this.repository.latestVersion(tx, row.id);
        if (previous?.versionNo === max) business();
        const version = await this.repository.freeze(tx, {
          changeRequestId: row.id,
          versionNo: (previous?.versionNo ?? 0) + 1,
          requirementRevisionId: row.draftRequirementRevisionId,
          scopeSnapshot: checked!.scopeSummary!,
          estimateHours: row.draftEstimateHours!,
          costDeltaMinor: row.draftCostDeltaMinor!,
          currency: row.draftCurrency!,
          scheduleDeltaDays: row.draftScheduleDeltaDays!,
          acceptanceCriteria: checked!.acceptanceCriteria!,
          submittedBy: actor,
        });
        const updated = await this.repository.advance(tx, row, {
          status: 'SUBMITTED',
          activeVersionId: version.id,
        });
        await this.event(
          tx,
          updated,
          project,
          actor,
          'change_request.submitted',
          {
            fromStatus: row.status,
            toStatus: updated.status,
            changeRequestVersionId: version.id,
            versionNo: version.versionNo,
            revisionId: version.requirementRevisionId,
            clientId: client!.userId,
          },
        );
        return {
          changeRequestId: row.id,
          changeRequestVersionId: version.id,
          versionNo: version.versionNo,
          status: updated.status,
          lockVersion: updated.lockVersion,
        };
      },
    );
  }
  decision(
    actor: string,
    id: string,
    step: 'VENDOR' | 'CLIENT',
    input: ChangeDecisionDto,
  ) {
    input = validate(ChangeDecisionDto, input);
    return this.write(
      actor,
      id,
      input.expectedVersion,
      step === 'VENDOR' ? ['OWNER'] : ['CLIENT'],
      async (tx, row, requirement, project, actor) => {
        const version = await this.decisionVersion(
          tx,
          row,
          requirement,
          project,
          step,
        );
        const approval = await this.repository.decide(tx, {
          changeRequestVersionId: version!.id,
          step,
          decision: input.decision,
          actorId: actor,
          comment: input.comment ?? null,
        });
        const status =
          input.decision === 'REJECTED'
            ? 'REJECTED'
            : step === 'VENDOR'
              ? 'VENDOR_APPROVED'
              : 'APPROVED';
        const updated = await this.repository.advance(tx, row, { status });
        await this.event(
          tx,
          updated,
          project,
          actor,
          step === 'VENDOR'
            ? 'change_request.vendor_decided'
            : 'change_request.client_decided',
          {
            fromStatus: row.status,
            toStatus: status,
            changeRequestVersionId: version!.id,
            versionNo: version!.versionNo,
            approvalId: approval.id,
            step,
            decision: input.decision,
          },
        );
        return {
          changeRequestId: row.id,
          changeRequestVersionId: version!.id,
          status,
          lockVersion: updated.lockVersion,
          approval,
          ...(input.decision === 'APPROVED'
            ? { approvedVersionId: version!.id }
            : {}),
        };
      },
    );
  }
  private async decisionVersion(
    tx: DatabaseTransaction,
    row: Change,
    requirement: Requirement,
    project: Project,
    step: 'VENDOR' | 'CLIENT',
  ) {
    if (row.status === 'DRAFT' || !row.activeVersionId)
      conflict('INVALID_TRANSITION');
    const version = await this.repository.version(
      tx,
      row.id,
      row.activeVersionId!,
    );
    const latest = await this.repository.latestVersion(tx, row.id);
    if (
      !version ||
      version.id !== latest?.id ||
      !(await this.repository.revision(
        tx,
        requirement.id,
        version.requirementRevisionId,
      ))
    )
      business();
    const decisions = await this.repository.decisions(tx, version!.id);
    if (decisions.some((d) => d.step === step)) conflict('ALREADY_REVIEWED');
    if (row.status !== (step === 'VENDOR' ? 'SUBMITTED' : 'VENDOR_APPROVED'))
      conflict('INVALID_TRANSITION');
    if (step === 'CLIENT') {
      const vendor = decisions.find((d) => d.step === 'VENDOR');
      const owner = await this.repositoryOwner(tx, project, vendor?.actorId);
      if (vendor?.decision !== 'APPROVED' || !owner) business();
    }
    return version!;
  }
  private async repositoryOwner(
    tx: DatabaseTransaction,
    project: Project,
    actor?: string,
  ) {
    if (!actor) return false;
    const owner = await this.authorization.workspace(
      actor,
      project.workspaceId,
      tx,
    );
    return owner.workspaceRole === 'OWNER';
  }
  reopen(actor: string, id: string, input: ChangeVersionDto) {
    return this.write(
      actor,
      id,
      input.expectedVersion,
      ['OWNER', 'DEVELOPER'],
      async (tx, row, _requirement, project, actor) => {
        if (row.status !== 'REJECTED') conflict('INVALID_TRANSITION');
        const updated = await this.repository.advance(tx, row, {
          status: 'DRAFT',
        });
        await this.event(
          tx,
          updated,
          project,
          actor,
          'change_request.reopened',
          {
            fromStatus: row.status,
            toStatus: updated.status,
            previousVersionId: row.activeVersionId,
          },
        );
        return { ...summary(updated, project.id), draft: draft(updated) };
      },
    );
  }
  private async frozen(tx: DatabaseTransaction, row: Change, version: Frozen) {
    const revision = await this.repository.revision(
      tx,
      row.requirementId,
      version.requirementRevisionId,
    );
    if (!revision) throw new Error('Invalid frozen revision ownership');
    return {
      ...version,
      costDeltaMinor: money(version.costDeltaMinor),
      requirementRevision: revision,
      approvals: await this.repository.decisions(tx, version.id),
    };
  }
  list(actor: string, projectId: string, input: ChangeListDto) {
    return this.repository.database.db.transaction(
      async (tx) => {
        const project = await this.authorization.project(
          actor.toLowerCase(),
          projectId.toLowerCase(),
          tx,
        );
        return this.repository.list(tx, project.id, input);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  versionDetail(actor: string, id: string, versionId: string) {
    return this.repository.database.db.transaction(
      async (tx) => {
        const row = await this.repository.get(tx, id.toLowerCase());
        const requirement = await this.repository.requirement(
          tx,
          row.requirementId,
        );
        const project = await this.authorization.project(
          actor.toLowerCase(),
          requirement.projectId,
          tx,
        );
        const version = await this.repository.version(
          tx,
          row.id,
          versionId.toLowerCase(),
        );
        if (!version) throw new NotFoundException();
        return {
          ...(await this.frozen(tx, row, version)),
          projectId: project.id,
          requirementId: requirement.id,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  private async capabilities(
    tx: DatabaseTransaction,
    row: Change,
    requirement: Requirement,
    project: Project,
  ) {
    const role = project.projectRole;
    const supplier: ReasonCode | undefined =
      role === 'CLIENT' ? 'ROLE_FORBIDDEN' : undefined;
    const exhausted: ReasonCode | undefined =
      row.lockVersion === max ? 'VERSION_EXHAUSTED' : undefined;
    const draftReason =
      supplier ??
      exhausted ??
      (row.status !== 'DRAFT' ? 'INVALID_TRANSITION' : undefined);
    let submitReason: ReasonCode | undefined = draftReason;
    if (!submitReason) {
      const client = await this.repository.client(
        tx,
        project.id,
        project.workspaceId,
      );
      const latest = await this.repository.latestRevision(tx, requirement.id);
      submitReason = !client
        ? 'CLIENT_REQUIRED'
        : client.conflict
          ? 'ROLE_CONFLICT'
          : requirement.status !== 'READY' ||
              latest?.id !== row.draftRequirementRevisionId ||
              !validRevision(requirement.latestRevisionId, latest)
            ? 'REVISION_NOT_READY'
            : !checkedAssessment(row)
              ? 'ASSESSMENT_INCOMPLETE'
              : (await this.repository.latestVersion(tx, row.id))?.versionNo ===
                  max
                ? 'VERSION_EXHAUSTED'
                : undefined;
    }
    const decision = async (step: 'VENDOR' | 'CLIENT') => {
      if (role !== (step === 'VENDOR' ? 'OWNER' : 'CLIENT'))
        return capability('ROLE_FORBIDDEN');
      if (exhausted) return capability(exhausted);
      try {
        await this.decisionVersion(tx, row, requirement, project, step);
        return capability();
      } catch (error) {
        if (error instanceof NotFoundException)
          return capability('BUSINESS_RULE_VIOLATION');
        if (
          !(error instanceof HttpException) ||
          ![409, 422].includes(error.getStatus())
        )
          throw error;
        const response = error.getResponse();
        const code =
          typeof response === 'object' &&
          response !== null &&
          'code' in response
            ? response.code
            : undefined;
        return capability(
          code === 'INVALID_TRANSITION' || code === 'ALREADY_REVIEWED'
            ? code
            : 'BUSINESS_RULE_VIOLATION',
        );
      }
    };
    let deliveryReason: ReasonCode | undefined = supplier;
    if (!deliveryReason) {
      try {
        const version = await approvedDeliveryVersion(
          this.repository,
          this.authorization,
          tx,
          row,
          requirement,
          project,
        );
        deliveryReason = (await this.deliveries.blocking(
          tx,
          version.id,
          'ACCEPTED',
        ))
          ? 'DELIVERY_COMPLETED'
          : (await this.deliveries.blocking(tx, version.id, 'SUBMITTED'))
            ? 'DELIVERY_PENDING'
            : (await this.deliveries.nextNumber(tx, version.id)) > max
              ? 'VERSION_EXHAUSTED'
              : undefined;
      } catch (error) {
        if (
          !(error instanceof HttpException) ||
          ![409, 422].includes(error.getStatus())
        )
          throw error;
        deliveryReason =
          error.getStatus() === 409
            ? 'INVALID_TRANSITION'
            : 'BUSINESS_RULE_VIOLATION';
      }
    }
    return {
      editDraft: capability(draftReason),
      submit: capability(submitReason),
      reopen: capability(
        supplier ??
          exhausted ??
          (row.status !== 'REJECTED' ? 'INVALID_TRANSITION' : undefined),
      ),
      vendorDecision: await decision('VENDOR'),
      clientDecision: await decision('CLIENT'),
      createDelivery: capability(deliveryReason),
    };
  }
  detail(actor: string, id: string, page: PageDto) {
    return this.repository.database.db.transaction(
      async (tx) => {
        const row = await this.repository.get(tx, id.toLowerCase());
        const requirement = await this.repository.requirement(
          tx,
          row.requirementId,
        );
        const project = await this.authorization.project(
          actor.toLowerCase(),
          requirement.projectId,
          tx,
        );
        const versions = await this.repository.versions(tx, row.id, page);
        const active = row.activeVersionId
          ? await this.repository.version(tx, row.id, row.activeVersionId)
          : undefined;
        return {
          data: {
            ...summary(row, project.id),
            capabilities: await this.capabilities(
              tx,
              row,
              requirement,
              project,
            ),
            ...(project.projectRole !== 'CLIENT' ? { draft: draft(row) } : {}),
            activeVersion: active ? await this.frozen(tx, row, active) : null,
            versions: await Promise.all(
              versions.slice(0, page.limit).map((v) => this.frozen(tx, row, v)),
            ),
          },
          hasMore: versions.length > page.limit,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
