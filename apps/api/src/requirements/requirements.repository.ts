import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import {
  requirements,
  clarifications,
  requirementRevisions,
  changeRequests,
} from '../database/schema/index.js';
import type { Connection } from '../authorization/authorization.repository.js';
import type { PageDto } from '../authorization/rbac.dto.js';
import type {
  CreateRequirementDto,
  ClarificationDto,
  RevisionDto,
} from './requirements.dto.js';
export type Requirement = typeof requirements.$inferSelect;
@Injectable()
export class RequirementsRepository {
  constructor(@Inject(DatabaseService) readonly database: DatabaseService) {}
  async get(db: Connection, id: string, lock = false) {
    const query = db.select().from(requirements).where(eq(requirements.id, id));
    const [row] = await (lock ? query.for('update') : query);
    if (!row) throw new NotFoundException();
    return row;
  }
  list(db: Connection, projectId: string, page: PageDto) {
    return db
      .select({
        id: requirements.id,
        projectId: requirements.projectId,
        createdBy: requirements.createdBy,
        title: requirements.title,
        status: requirements.status,
        draftVersion: requirements.draftVersion,
        latestRevisionId: requirements.latestRevisionId,
        latestRevisionNo: requirementRevisions.revisionNo,
        createdAt: requirements.createdAt,
        updatedAt: requirements.updatedAt,
      })
      .from(requirements)
      .leftJoin(
        requirementRevisions,
        eq(requirements.latestRevisionId, requirementRevisions.id),
      )
      .where(eq(requirements.projectId, projectId))
      .orderBy(asc(requirements.createdAt), asc(requirements.id))
      .limit(page.limit + 1)
      .offset(page.offset);
  }
  async create(
    tx: DatabaseTransaction,
    projectId: string,
    userId: string,
    input: CreateRequirementDto,
  ) {
    const [row] = await tx
      .insert(requirements)
      .values({
        projectId,
        createdBy: userId,
        title: input.title,
        originalText: input.originalText,
      })
      .returning();
    return row;
  }
  questions(db: Connection, id: string) {
    return db
      .select()
      .from(clarifications)
      .where(eq(clarifications.requirementId, id))
      .orderBy(asc(clarifications.createdAt), asc(clarifications.id));
  }
  async question(db: Connection, id: string, parentId: string) {
    const [row] = await db
      .select()
      .from(clarifications)
      .where(
        and(
          eq(clarifications.requirementId, id),
          eq(clarifications.id, parentId),
          eq(clarifications.kind, 'QUESTION'),
        ),
      );
    return row;
  }
  async addClarification(
    tx: DatabaseTransaction,
    id: string,
    userId: string,
    input: ClarificationDto,
  ) {
    const [row] = await tx
      .insert(clarifications)
      .values({
        requirementId: id,
        authorId: userId,
        kind: input.kind,
        body: input.body,
        parentId: input.parentId?.toLowerCase() ?? null,
      })
      .returning();
    return row;
  }
  revisions(db: Connection, id: string, page: PageDto) {
    return db
      .select()
      .from(requirementRevisions)
      .where(eq(requirementRevisions.requirementId, id))
      .orderBy(desc(requirementRevisions.revisionNo))
      .limit(page.limit + 1)
      .offset(page.offset);
  }
  async revision(db: Connection, requirementId: string, id: string) {
    const [row] = await db
      .select()
      .from(requirementRevisions)
      .where(
        and(
          eq(requirementRevisions.requirementId, requirementId),
          eq(requirementRevisions.id, id),
        ),
      );
    if (!row) throw new NotFoundException();
    return row;
  }
  async latest(db: Connection, id: string) {
    const [row] = await db
      .select()
      .from(requirementRevisions)
      .where(eq(requirementRevisions.requirementId, id))
      .orderBy(desc(requirementRevisions.revisionNo))
      .limit(1);
    return row;
  }
  async pending(db: Connection, id: string) {
    const rows = await db
      .select({ id: changeRequests.id })
      .from(changeRequests)
      .where(
        and(
          eq(changeRequests.requirementId, id),
          sql`${changeRequests.status} IN ('SUBMITTED', 'VENDOR_APPROVED')`,
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
  async addRevision(
    tx: DatabaseTransaction,
    id: string,
    userId: string,
    revisionNo: number,
    input: RevisionDto,
  ) {
    const [row] = await tx
      .insert(requirementRevisions)
      .values({
        requirementId: id,
        createdBy: userId,
        revisionNo,
        content: input.content,
        acceptanceCriteria: input.acceptanceCriteria,
      })
      .returning();
    return row;
  }
  async advance(
    tx: DatabaseTransaction,
    current: Requirement,
    changes: Partial<
      Pick<
        Requirement,
        'title' | 'originalText' | 'status' | 'latestRevisionId'
      >
    >,
  ) {
    const [row] = await tx
      .update(requirements)
      .set({
        ...changes,
        draftVersion: current.draftVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(requirements.id, current.id),
          eq(requirements.draftVersion, current.draftVersion),
        ),
      )
      .returning();
    if (!row) throw new ConflictException({ code: 'STALE_VERSION' });
    return row;
  }
}
