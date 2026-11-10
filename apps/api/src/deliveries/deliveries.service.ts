import { approvedDeliveryVersion } from './delivery-eligibility.js';
import type { DeliveryListDto } from '../http/read.dto.js';
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
import {
  ChangesRepository,
  type Change,
  type Requirement,
} from '../changes/changes.repository.js';
import { AuditWriter } from '../audit/audit.module.js';
import type { DatabaseTransaction } from '../database/database.service.js';
import {
  DeliveriesRepository,
  type Delivery,
} from './deliveries.repository.js';
import { CreateDeliveryDto, ReviewDeliveryDto } from './deliveries.dto.js';
type Project = Awaited<ReturnType<AuthorizationRepository['project']>>;
const conflict = (code: string): never => {
  throw new ConflictException({ code });
};
const business = (): never => {
  throw new UnprocessableEntityException();
};
function validate<T extends object>(type: new () => T, input: T) {
  const value = plainToInstance(type, input);
  if (
    validateSync(value, { whitelist: true, forbidNonWhitelisted: true }).length
  )
    throw new BadRequestException();
  return value;
}
// Called only after transaction rejection: never continue querying an aborted tx.
export function deliveryConflict(error: unknown): never {
  let current = error;
  const visited = new Set<unknown>();
  while (
    typeof current === 'object' &&
    current !== null &&
    !visited.has(current)
  ) {
    visited.add(current);
    const e = current as {
      code?: string;
      constraint?: string;
      cause?: unknown;
    };
    if (e.code === '23505') {
      if (e.constraint === 'delivery_reviews_delivery_unique')
        conflict('ALREADY_REVIEWED');
      if (e.constraint === 'deliveries_one_submitted')
        conflict('DELIVERY_PENDING');
      if (e.constraint === 'deliveries_version_number_unique')
        conflict('CONFLICT');
    }
    current = e.cause;
  }
  throw error;
}
@Injectable()
export class DeliveriesService {
  constructor(
    @Inject(DeliveriesRepository)
    private readonly repository: DeliveriesRepository,
    @Inject(ChangesRepository) private readonly changes: ChangesRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  private async parents(
    tx: DatabaseTransaction,
    actor: string,
    id: string,
    allowed: readonly Access[],
  ) {
    const located = await this.changes.get(tx, id);
    const parent = await this.changes.requirement(tx, located.requirementId);
    const project = await this.authorization.projectWrite(
      actor,
      parent.projectId,
      tx,
    );
    const requirement = await this.changes.requirement(tx, parent.id, true);
    const change = await this.changes.get(tx, located.id, true);
    if (
      requirement.projectId !== project.id ||
      change.requirementId !== requirement.id
    )
      throw new NotFoundException();
    if (!allowed.includes(project.projectRole)) throw new ForbiddenException();
    return { project, requirement, change };
  }
  private approved(
    tx: DatabaseTransaction,
    change: Change,
    requirement: Requirement,
    project: Project,
  ) {
    return approvedDeliveryVersion(
      this.changes,
      this.authorization,
      tx,
      change,
      requirement,
      project,
    );
  }
  private async event(
    tx: DatabaseTransaction,
    row: Delivery,
    project: Project,
    actor: string,
    changeId: string,
    versionNo: number,
    reviewId?: string,
  ) {
    await this.audit.write(tx, {
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorId: actor,
      eventType: reviewId ? 'delivery.reviewed' : 'delivery.submitted',
      entityType: 'delivery',
      entityId: row.id,
      entityVersion: row.deliveryNo,
      metadata: {
        changeRequestId: changeId,
        changeRequestVersionId: row.changeRequestVersionId,
        versionNo,
        toStatus: row.status,
        ...(reviewId
          ? { fromStatus: 'SUBMITTED', reviewId, decision: row.status }
          : {}),
      },
    });
  }
  create(actor: string, id: string, input: CreateDeliveryDto) {
    input = validate(CreateDeliveryDto, input);
    actor = actor.toLowerCase();
    return this.repository.database
      .transaction(async (tx) => {
        const { project, requirement, change } = await this.parents(
          tx,
          actor,
          id.toLowerCase(),
          ['OWNER', 'DEVELOPER'],
        );
        const version = await this.approved(tx, change, requirement, project);
        if (await this.repository.blocking(tx, version.id, 'ACCEPTED'))
          conflict('DELIVERY_COMPLETED');
        if (await this.repository.blocking(tx, version.id, 'SUBMITTED'))
          conflict('DELIVERY_PENDING');
        const deliveryNo = await this.repository.nextNumber(tx, version.id);
        if (deliveryNo > 2147483647) business();
        const row = await this.repository.create(tx, {
          changeRequestVersionId: version.id,
          deliveryNo,
          artifactUrl: input.artifactUrl,
          summary: input.summary,
          evidenceLinks: input.evidenceLinks ?? [],
          createdBy: actor,
        });
        await this.event(tx, row, project, actor, change.id, version.versionNo);
        return {
          ...row,
          changeRequestId: change.id,
          versionNo: version.versionNo,
          review: null,
        };
      })
      .catch(deliveryConflict);
  }
  review(actor: string, id: string, input: ReviewDeliveryDto) {
    input = validate(ReviewDeliveryDto, input);
    actor = actor.toLowerCase();
    return this.repository.database
      .transaction(async (tx) => {
        const located = await this.repository.get(tx, id.toLowerCase());
        const locatedVersion = await this.repository.version(
          tx,
          located.changeRequestVersionId,
        );
        const { project, requirement, change } = await this.parents(
          tx,
          actor,
          locatedVersion.changeRequestId,
          ['CLIENT'],
        );
        const row = await this.repository.get(tx, located.id, true);
        if (row.changeRequestVersionId !== locatedVersion.id)
          throw new NotFoundException();
        const currentProject = await this.authorization.project(
          actor,
          project.id,
          tx,
        );
        if (currentProject.projectRole !== 'CLIENT')
          throw new ForbiddenException();
        const version = await this.approved(
          tx,
          change,
          requirement,
          currentProject,
        );
        if (row.changeRequestVersionId !== version.id) business();
        if (
          row.status !== 'SUBMITTED' ||
          (await this.repository.review(tx, row.id))
        )
          conflict('ALREADY_REVIEWED');
        const review = await this.repository.decide(tx, {
          deliveryId: row.id,
          reviewerId: actor,
          decision: input.decision,
          comment: input.comment ?? null,
        });
        const updated = await this.repository.advance(tx, row, input.decision);
        await this.event(
          tx,
          updated,
          project,
          actor,
          change.id,
          version.versionNo,
          review.id,
        );
        return {
          ...updated,
          changeRequestId: change.id,
          versionNo: version.versionNo,
          review,
        };
      })
      .catch(deliveryConflict);
  }
  detail(actor: string, id: string) {
    return this.repository.database.db.transaction(
      async (tx) => {
        const row = await this.repository.get(tx, id.toLowerCase());
        const version = await this.repository.version(
          tx,
          row.changeRequestVersionId,
        );
        const change = await this.changes.get(tx, version.changeRequestId);
        const requirement = await this.changes.requirement(
          tx,
          change.requirementId,
        );
        const project = await this.authorization.project(
          actor.toLowerCase(),
          requirement.projectId,
          tx,
        );
        if (
          !(await this.changes.revision(
            tx,
            requirement.id,
            version.requirementRevisionId,
          ))
        )
          throw new Error('Invalid delivery revision ownership');
        const review = (await this.repository.review(tx, row.id)) ?? null;
        let capability:
          { allowed: true } | { allowed: false; reasonCode: string };
        if (project.projectRole !== 'CLIENT')
          capability = { allowed: false, reasonCode: 'ROLE_FORBIDDEN' };
        else {
          try {
            const approved = await this.approved(
              tx,
              change,
              requirement,
              project,
            );
            if (approved.id !== version.id) business();
            if (row.status !== 'SUBMITTED' || review)
              conflict('ALREADY_REVIEWED');
            capability = { allowed: true };
          } catch (error) {
            // Only expected domain denials become hints. Infrastructure errors still fail the read.
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
            capability = {
              allowed: false,
              reasonCode:
                typeof code === 'string' ? code : 'BUSINESS_RULE_VIOLATION',
            };
          }
        }
        return {
          ...row,
          changeRequestId: change.id,
          versionNo: version.versionNo,
          review,
          projectId: project.id,
          requirementId: requirement.id,
          requirementTitle: requirement.title,
          capabilities: { review: capability },
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  list(actor: string, projectId: string, input: DeliveryListDto) {
    return this.repository.database.db.transaction(
      async (tx) => {
        const project = await this.authorization.project(
          actor.toLowerCase(),
          projectId.toLowerCase(),
          tx,
        );
        const rows = await this.repository.list(tx, project.id, input);
        return rows.map(({ delivery, ...context }) => ({
          ...delivery,
          ...context,
        }));
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  history(actor: string, id: string, page: PageDto) {
    return this.repository.database.db.transaction(
      async (tx) => {
        const change = await this.changes.get(tx, id.toLowerCase());
        const requirement = await this.changes.requirement(
          tx,
          change.requirementId,
        );
        await this.authorization.project(
          actor.toLowerCase(),
          requirement.projectId,
          tx,
        );
        const rows = await this.repository.history(tx, change.id, page);
        return {
          data: rows.slice(0, page.limit).map((row) => ({
            ...row.delivery,
            changeRequestId: change.id,
            versionNo: row.versionNo,
            review: row.review,
          })),
          hasMore: rows.length > page.limit,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
