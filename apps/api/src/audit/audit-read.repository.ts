import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  auditEvents,
  users,
  requirements,
  requirementRevisions,
  clarifications,
  changeRequests,
  changeRequestVersions,
  deliveries,
} from '../database/schema/index.js';
import type { Connection } from '../authorization/authorization.repository.js';
import { DatabaseService } from '../database/database.service.js';
import type { AuditListDto } from './audit-read.dto.js';
import { auditEventTypes, auditPolicy } from './audit-read.policy.js';
export type AuditTarget =
  | { kind: 'project'; projectId: string }
  | {
      kind: 'requirement';
      projectId: string;
      requirementId: string;
      clarificationId?: string;
    }
  | {
      kind: 'revision';
      projectId: string;
      requirementId: string;
      revisionId: string;
    }
  | {
      kind: 'change';
      projectId: string;
      changeRequestId: string;
      versionId?: string;
    }
  | { kind: 'delivery'; projectId: string; deliveryId: string };
@Injectable()
export class AuditReadRepository {
  constructor(@Inject(DatabaseService) readonly database: DatabaseService) {}
  list(
    db: Connection,
    projectId: string,
    client: boolean,
    input: AuditListDto,
  ) {
    const events = auditEventTypes.filter((e) => !client || auditPolicy[e][0]);
    return db
      .select({
        event: auditEvents,
        actorId: users.id,
        displayName: users.displayName,
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorId))
      .where(
        and(
          eq(auditEvents.projectId, projectId),
          inArray(auditEvents.eventType, events),
          inArray(auditEvents.entityType, [
            'project',
            'requirement',
            'clarification',
            'requirement_revision',
            'change_request',
            'delivery',
          ]),
          input.entityType
            ? eq(auditEvents.entityType, input.entityType)
            : undefined,
          input.entityId
            ? eq(auditEvents.entityId, input.entityId.toLowerCase())
            : undefined,
          input.eventType
            ? eq(auditEvents.eventType, input.eventType)
            : undefined,
        ),
      )
      .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
      .limit(input.limit + 1)
      .offset(input.offset);
  }
  async target(
    db: Connection,
    projectId: string,
    event: typeof auditEvents.$inferSelect,
  ): Promise<AuditTarget | null> {
    const id = event.entityId;
    if (event.entityType === 'project')
      return id === projectId ? { kind: 'project', projectId } : null;
    if (event.entityType === 'requirement') {
      const [r] = await db
        .select({ id: requirements.id })
        .from(requirements)
        .where(
          and(eq(requirements.id, id), eq(requirements.projectId, projectId)),
        );
      return r ? { kind: 'requirement', projectId, requirementId: r.id } : null;
    }
    if (event.entityType === 'clarification') {
      const [r] = await db
        .select({ id: requirements.id })
        .from(clarifications)
        .innerJoin(
          requirements,
          eq(requirements.id, clarifications.requirementId),
        )
        .where(
          and(eq(clarifications.id, id), eq(requirements.projectId, projectId)),
        );
      return r
        ? {
            kind: 'requirement',
            projectId,
            requirementId: r.id,
            clarificationId: id,
          }
        : null;
    }
    if (event.entityType === 'requirement_revision') {
      const [r] = await db
        .select({ id: requirements.id })
        .from(requirementRevisions)
        .innerJoin(
          requirements,
          eq(requirements.id, requirementRevisions.requirementId),
        )
        .where(
          and(
            eq(requirementRevisions.id, id),
            eq(requirements.projectId, projectId),
          ),
        );
      return r
        ? { kind: 'revision', projectId, requirementId: r.id, revisionId: id }
        : null;
    }
    if (event.entityType === 'change_request') {
      const [r] = await db
        .select({ id: changeRequests.id, requirementId: requirements.id })
        .from(changeRequests)
        .innerJoin(
          requirements,
          eq(requirements.id, changeRequests.requirementId),
        )
        .where(
          and(eq(changeRequests.id, id), eq(requirements.projectId, projectId)),
        );
      if (!r) return null;
      // Metadata is only a candidate; actual Version and Revision ownership must agree.
      const candidate = event.metadata.changeRequestVersionId;
      if (
        typeof candidate === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          candidate,
        )
      ) {
        const [v] = await db
          .select({ id: changeRequestVersions.id })
          .from(changeRequestVersions)
          .innerJoin(
            requirementRevisions,
            eq(
              requirementRevisions.id,
              changeRequestVersions.requirementRevisionId,
            ),
          )
          .where(
            and(
              eq(changeRequestVersions.id, candidate),
              eq(changeRequestVersions.changeRequestId, id),
              eq(requirementRevisions.requirementId, r.requirementId),
            ),
          );
        if (v)
          return {
            kind: 'change',
            projectId,
            changeRequestId: id,
            versionId: v.id,
          };
      }
      return { kind: 'change', projectId, changeRequestId: id };
    }
    if (event.entityType === 'delivery') {
      const [r] = await db
        .select({ id: deliveries.id })
        .from(deliveries)
        .innerJoin(
          changeRequestVersions,
          eq(changeRequestVersions.id, deliveries.changeRequestVersionId),
        )
        .innerJoin(
          changeRequests,
          eq(changeRequests.id, changeRequestVersions.changeRequestId),
        )
        .innerJoin(
          requirements,
          eq(requirements.id, changeRequests.requirementId),
        )
        .innerJoin(
          requirementRevisions,
          and(
            eq(
              requirementRevisions.id,
              changeRequestVersions.requirementRevisionId,
            ),
            eq(requirementRevisions.requirementId, requirements.id),
          ),
        )
        .where(
          and(eq(deliveries.id, id), eq(requirements.projectId, projectId)),
        );
      return r ? { kind: 'delivery', projectId, deliveryId: id } : null;
    }
    return null;
  }
}
