import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { AuditWriter } from '../audit/audit.module.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import { apiTokens } from '../database/schema/index.js';
import type { PageDto } from '../authorization/rbac.dto.js';
import {
  newProjectToken,
  parseCreateToken,
  projectTokenHash,
  TOKEN_SCOPE,
} from './token.contract.js';

const fields = {
  id: apiTokens.id,
  projectId: apiTokens.projectId,
  name: apiTokens.name,
  scopes: apiTokens.scopes,
  createdAt: apiTokens.createdAt,
  expiresAt: apiTokens.expiresAt,
  revokedAt: apiTokens.revokedAt,
};
@Injectable()
export class ApiTokensService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}
  async create(actor: string, projectId: string, body: unknown) {
    projectId = projectId.toLowerCase();
    const input = parseCreateToken(body);
    return this.database.transaction(async (tx) => {
      const project = await this.authorization.projectOwner(
        actor,
        projectId,
        tx,
      );
      if (project.status !== 'ACTIVE') throw new UnprocessableEntityException();
      this.limits.consume(`token-create:${actor}`, 30, 60_000);
      const token = newProjectToken();
      const [row] = await tx
        .insert(apiTokens)
        .values({
          projectId,
          userId: actor,
          name: input.name,
          tokenHash: projectTokenHash(token)!,
          scopes: [TOKEN_SCOPE],
          expiresAt: sql`now() + ${input.expiresInDays} * interval '24 hours'`,
        })
        .returning(fields);
      await this.audit.write(tx, {
        workspaceId: project.workspaceId,
        projectId,
        actorId: actor,
        eventType: 'api_token.created',
        entityType: 'api_token',
        entityId: row.id,
        metadata: { scope: TOKEN_SCOPE, expiresInDays: input.expiresInDays },
      });
      // Transaction must commit before this one-time result can be sent to the caller.
      return { ...row, status: 'ACTIVE' as const, token };
    });
  }
  list(actor: string, projectId: string, page: PageDto) {
    return this.database.db.transaction(
      async (tx) => {
        const project = await this.authorization.project(
          actor,
          projectId.toLowerCase(),
          tx,
        );
        if (project.projectRole !== 'OWNER') throw new ForbiddenException();
        return tx
          .select({
            ...fields,
            status: sql<
              'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'UNAVAILABLE'
            >`CASE WHEN ${apiTokens.revokedAt} IS NOT NULL THEN 'REVOKED' WHEN ${apiTokens.expiresAt} <= clock_timestamp() THEN 'EXPIRED' WHEN ${apiTokens.userId} <> ${actor} OR ${project.status} <> 'ACTIVE' THEN 'UNAVAILABLE' ELSE 'ACTIVE' END`,
          })
          .from(apiTokens)
          .where(eq(apiTokens.projectId, project.id))
          .orderBy(desc(apiTokens.createdAt), desc(apiTokens.id))
          .limit(page.limit + 1)
          .offset(page.offset);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  revoke(actor: string, id: string) {
    return this.database.transaction(async (tx) => {
      const [found] = await tx
        .select({ projectId: apiTokens.projectId })
        .from(apiTokens)
        .where(eq(apiTokens.id, id.toLowerCase()));
      if (!found) throw new NotFoundException();
      const project = await this.authorization.projectOwner(
        actor,
        found.projectId,
        tx,
      );
      const [changed] = await tx
        .update(apiTokens)
        .set({ revokedAt: sql`clock_timestamp()` })
        .where(
          and(
            eq(apiTokens.id, id.toLowerCase()),
            eq(apiTokens.projectId, project.id),
            isNull(apiTokens.revokedAt),
          ),
        )
        .returning({ id: apiTokens.id });
      if (changed)
        await this.audit.write(tx, {
          workspaceId: project.workspaceId,
          projectId: project.id,
          actorId: actor,
          eventType: 'api_token.revoked',
          entityType: 'api_token',
          entityId: changed.id,
        });
    });
  }
}
