import type { ChangeListDto } from '../http/read.dto.js';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import type { Connection } from '../authorization/authorization.repository.js';
import {
  approvals,
  changeRequests,
  changeRequestVersions,
  requirementRevisions,
  requirements,
  projectMembers,
  workspaceMembers,
  workspaces,
} from '../database/schema/index.js';
import type { PageDto } from '../authorization/rbac.dto.js';
export type Change = typeof changeRequests.$inferSelect;
export type Requirement = typeof requirements.$inferSelect;
export type Frozen = typeof changeRequestVersions.$inferSelect;
@Injectable()
export class ChangesRepository {
  constructor(@Inject(DatabaseService) readonly database: DatabaseService) {}
  list(db: Connection, projectId: string, input: ChangeListDto) {
    return db
      .select({
        id: changeRequests.id,
        requirementId: changeRequests.requirementId,
        projectId: requirements.projectId,
        status: changeRequests.status,
        lockVersion: changeRequests.lockVersion,
        activeVersionId: changeRequests.activeVersionId,
        createdAt: changeRequests.createdAt,
        updatedAt: changeRequests.updatedAt,
        requirementTitle: requirements.title,
        activeVersionNo: changeRequestVersions.versionNo,
      })
      .from(changeRequests)
      .innerJoin(
        requirements,
        eq(requirements.id, changeRequests.requirementId),
      )
      .leftJoin(
        changeRequestVersions,
        and(
          eq(changeRequestVersions.id, changeRequests.activeVersionId),
          eq(changeRequestVersions.changeRequestId, changeRequests.id),
        ),
      )
      .where(
        and(
          eq(requirements.projectId, projectId),
          input.requirementId
            ? eq(requirements.id, input.requirementId.toLowerCase())
            : undefined,
          input.status ? eq(changeRequests.status, input.status) : undefined,
        ),
      )
      .orderBy(desc(changeRequests.createdAt), desc(changeRequests.id))
      .limit(input.limit + 1)
      .offset(input.offset);
  }
  async get(db: Connection, id: string, lock = false) {
    const q = db.select().from(changeRequests).where(eq(changeRequests.id, id));
    const [row] = await (lock ? q.for('update') : q);
    if (!row) throw new NotFoundException();
    return row;
  }
  async requirement(db: Connection, id: string, lock = false) {
    const q = db.select().from(requirements).where(eq(requirements.id, id));
    const [row] = await (lock ? q.for('update') : q);
    if (!row) throw new NotFoundException();
    return row;
  }
  async latestRevision(db: Connection, id: string) {
    const [row] = await db
      .select()
      .from(requirementRevisions)
      .where(eq(requirementRevisions.requirementId, id))
      .orderBy(desc(requirementRevisions.revisionNo))
      .limit(1);
    return row;
  }
  async revision(db: Connection, requirementId: string, id: string) {
    const [row] = await db
      .select()
      .from(requirementRevisions)
      .where(
        and(
          eq(requirementRevisions.id, id),
          eq(requirementRevisions.requirementId, requirementId),
        ),
      );
    return row;
  }
  async client(db: Connection, projectId: string, workspaceId: string) {
    const clients = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, 'CLIENT'),
        ),
      );
    const client = clients.length === 1 ? clients[0] : undefined;
    if (!client) return undefined;
    const members = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, client.userId),
        ),
      );
    const owners = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.ownerId, client.userId),
        ),
      );
    return {
      userId: client.userId,
      conflict: members.length > 0 || owners.length > 0,
    };
  }
  async create(
    tx: DatabaseTransaction,
    requirementId: string,
    revisionId: string,
    actor: string,
  ) {
    const [row] = await tx
      .insert(changeRequests)
      .values({
        requirementId,
        draftRequirementRevisionId: revisionId,
        createdBy: actor,
      })
      .returning();
    return row;
  }
  async advance(
    tx: DatabaseTransaction,
    current: Change,
    values: Partial<
      Pick<
        Change,
        | 'status'
        | 'activeVersionId'
        | 'draftRequirementRevisionId'
        | 'draftScopeSummary'
        | 'draftEstimateHours'
        | 'draftCostDeltaMinor'
        | 'draftCurrency'
        | 'draftScheduleDeltaDays'
        | 'draftAcceptanceCriteria'
      >
    >,
  ) {
    const [row] = await tx
      .update(changeRequests)
      .set({
        ...values,
        lockVersion: current.lockVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changeRequests.id, current.id),
          eq(changeRequests.requirementId, current.requirementId),
          eq(changeRequests.status, current.status),
          eq(changeRequests.lockVersion, current.lockVersion),
          current.activeVersionId === null
            ? isNull(changeRequests.activeVersionId)
            : eq(changeRequests.activeVersionId, current.activeVersionId),
        ),
      )
      .returning();
    if (!row) throw new ConflictException({ code: 'STALE_VERSION' });
    return row;
  }
  async latestVersion(db: Connection, id: string) {
    const [row] = await db
      .select()
      .from(changeRequestVersions)
      .where(eq(changeRequestVersions.changeRequestId, id))
      .orderBy(desc(changeRequestVersions.versionNo))
      .limit(1);
    return row;
  }
  async version(db: Connection, changeId: string, id: string) {
    const [row] = await db
      .select()
      .from(changeRequestVersions)
      .where(
        and(
          eq(changeRequestVersions.id, id),
          eq(changeRequestVersions.changeRequestId, changeId),
        ),
      );
    return row;
  }
  versions(db: Connection, id: string, page: PageDto) {
    return db
      .select()
      .from(changeRequestVersions)
      .where(eq(changeRequestVersions.changeRequestId, id))
      .orderBy(desc(changeRequestVersions.versionNo))
      .limit(page.limit + 1)
      .offset(page.offset);
  }
  decisions(db: Connection, id: string) {
    return db
      .select()
      .from(approvals)
      .where(eq(approvals.changeRequestVersionId, id))
      .orderBy(asc(approvals.createdAt), asc(approvals.id));
  }
  async freeze(
    tx: DatabaseTransaction,
    values: typeof changeRequestVersions.$inferInsert,
  ) {
    const [row] = await tx
      .insert(changeRequestVersions)
      .values(values)
      .returning();
    return row;
  }
  async decide(tx: DatabaseTransaction, values: typeof approvals.$inferInsert) {
    const [row] = await tx.insert(approvals).values(values).returning();
    return row;
  }
}
