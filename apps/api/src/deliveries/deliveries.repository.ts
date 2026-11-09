import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, max } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import type { Connection } from '../authorization/authorization.repository.js';
import type { PageDto } from '../authorization/rbac.dto.js';
import {
  deliveries,
  deliveryReviews,
  changeRequestVersions,
} from '../database/schema/index.js';
export type Delivery = typeof deliveries.$inferSelect;
@Injectable()
export class DeliveriesRepository {
  constructor(@Inject(DatabaseService) readonly database: DatabaseService) {}
  async get(db: Connection, id: string, lock = false) {
    const query = db.select().from(deliveries).where(eq(deliveries.id, id));
    const [row] = await (lock ? query.for('update') : query);
    if (!row) throw new NotFoundException();
    return row;
  }
  async version(db: Connection, id: string) {
    const [row] = await db
      .select()
      .from(changeRequestVersions)
      .where(eq(changeRequestVersions.id, id));
    if (!row) throw new NotFoundException();
    return row;
  }
  async review(db: Connection, id: string) {
    const [row] = await db
      .select()
      .from(deliveryReviews)
      .where(eq(deliveryReviews.deliveryId, id));
    return row;
  }
  async blocking(
    db: Connection,
    versionId: string,
    status: 'ACCEPTED' | 'SUBMITTED',
  ) {
    const [row] = await db
      .select({ id: deliveries.id })
      .from(deliveries)
      .where(
        and(
          eq(deliveries.changeRequestVersionId, versionId),
          eq(deliveries.status, status),
        ),
      )
      .limit(1);
    return row;
  }
  async nextNumber(db: Connection, versionId: string) {
    const [row] = await db
      .select({ number: max(deliveries.deliveryNo) })
      .from(deliveries)
      .where(eq(deliveries.changeRequestVersionId, versionId));
    return (row.number ?? 0) + 1;
  }
  async create(tx: DatabaseTransaction, input: typeof deliveries.$inferInsert) {
    const [row] = await tx.insert(deliveries).values(input).returning();
    return row;
  }
  async decide(
    tx: DatabaseTransaction,
    input: typeof deliveryReviews.$inferInsert,
  ) {
    const [row] = await tx.insert(deliveryReviews).values(input).returning();
    return row;
  }
  async advance(
    tx: DatabaseTransaction,
    current: Delivery,
    status: 'ACCEPTED' | 'CHANGES_REQUESTED',
  ) {
    const [row] = await tx
      .update(deliveries)
      .set({ status })
      .where(
        and(
          eq(deliveries.id, current.id),
          eq(deliveries.changeRequestVersionId, current.changeRequestVersionId),
          eq(deliveries.status, 'SUBMITTED'),
        ),
      )
      .returning();
    if (!row) throw new ConflictException({ code: 'ALREADY_REVIEWED' });
    return row;
  }
  history(db: Connection, changeId: string, page: PageDto) {
    return db
      .select({
        delivery: deliveries,
        versionNo: changeRequestVersions.versionNo,
        review: deliveryReviews,
      })
      .from(deliveries)
      .innerJoin(
        changeRequestVersions,
        eq(changeRequestVersions.id, deliveries.changeRequestVersionId),
      )
      .leftJoin(deliveryReviews, eq(deliveryReviews.deliveryId, deliveries.id))
      .where(eq(changeRequestVersions.changeRequestId, changeId))
      .orderBy(
        desc(changeRequestVersions.versionNo),
        desc(deliveries.deliveryNo),
        desc(deliveries.id),
      )
      .limit(page.limit + 1)
      .offset(page.offset);
  }
}
