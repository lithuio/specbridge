import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import {
  agentConnectionGrants as grants,
  sessions,
} from '../database/schema/index.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { ApiTokensService } from '../api-tokens/api-tokens.service.js';
import { AuditWriter } from '../audit/audit.module.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import {
  approveConnection,
  exchangeConnection,
  parseConnection,
  connectionHash,
  connectionCallback,
  matchesConnectionProof,
  newConnectionCode,
} from './connection.contract.js';
import type { PageDto } from '../authorization/rbac.dto.js';
type Grant = typeof grants.$inferSelect;
const fields = {
  id: grants.id,
  projectId: grants.projectId,
  name: grants.tokenName,
  expiresInDays: grants.tokenExpiresInDays,
  createdAt: grants.createdAt,
  expiresAt: grants.expiresAt,
  completedAt: grants.completedAt,
  apiTokenId: grants.apiTokenId,
  status: sql<string>`CASE WHEN ${grants.status}='AUTHORIZED' AND ${grants.expiresAt}<=clock_timestamp() THEN 'EXPIRED' ELSE ${grants.status} END`,
};
const conflict = () => {
  throw new ConflictException({ code: 'CONNECTION_CONFLICT' });
};
@Injectable()
export class ConnectionsService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(AuthorizationRepository)
    private readonly auth: AuthorizationRepository,
    @Inject(ApiTokensService) private readonly tokens: ApiTokensService,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}
  private async session(
    tx: DatabaseTransaction,
    actor: string,
    sessionId: string,
  ) {
    const [row] = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, actor),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`statement_timestamp()`),
          gt(
            sessions.lastActivityAt,
            sql`statement_timestamp()-interval '24 hours'`,
          ),
        ),
      )
      .for('share');
    if (!row) throw new UnauthorizedException();
  }
  private async event(
    tx: DatabaseTransaction,
    project: { id: string; workspaceId: string },
    actor: string,
    id: string,
    action: 'authorized' | 'exchanged' | 'cancelled',
    tokenId?: string,
  ) {
    await this.audit.write(tx, {
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorId: actor,
      eventType: `agent_connection.${action}`,
      entityType: 'agent_connection',
      entityId: id,
      metadata: tokenId ? { tokenId } : {},
    });
  }
  private async record(
    tx: DatabaseTransaction,
    actor: string,
    projectId: string,
    id: string,
  ) {
    const [row] = await tx
      .select(fields)
      .from(grants)
      .where(
        and(
          eq(grants.id, id),
          eq(grants.userId, actor),
          eq(grants.projectId, projectId),
        ),
      );
    if (!row) throw new NotFoundException();
    return row;
  }
  async approve(
    actor: string,
    sessionId: string,
    projectId: string,
    raw: unknown,
  ) {
    const input = parseConnection(approveConnection, raw);
    const code = newConnectionCode();
    return this.db
      .transaction(async (tx) => {
        const project = await this.auth.projectOwner(actor, projectId, tx);
        await this.session(tx, actor, sessionId);
        if (project.status !== 'ACTIVE')
          throw new UnprocessableEntityException();
        this.limits.consume(`connection-owner:${actor}`, 20, 3_600_000);
        this.limits.consume(`connection-project:${projectId}`, 40, 3_600_000);
        await tx.execute(
          sql`DELETE FROM ${grants} WHERE id IN (SELECT id FROM ${grants} WHERE project_id=${projectId} AND status<>'EXCHANGED' AND expires_at<=clock_timestamp()-interval '24 hours' ORDER BY expires_at LIMIT 100)`,
        );
        const [count] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(grants)
          .where(
            and(
              eq(grants.projectId, projectId),
              eq(grants.userId, actor),
              eq(grants.status, 'AUTHORIZED'),
              gt(grants.expiresAt, sql`clock_timestamp()`),
            ),
          );
        if (count.count >= 5)
          throw new UnprocessableEntityException({ code: 'CONNECTION_LIMIT' });
        await tx.insert(grants).values({
          id: input.grantId,
          projectId,
          userId: actor,
          sessionId,
          codeHash: connectionHash(code),
          challenge: input.challenge,
          stateHash: connectionHash(input.state),
          callbackPort: input.callbackPort,
          tokenName: input.name,
          tokenExpiresInDays: input.expiresInDays,
          expiresAt: sql`now()+interval '5 minutes'`,
        });
        await this.event(tx, project, actor, input.grantId, 'authorized');
        return {
          grant: await this.record(tx, actor, projectId, input.grantId),
          code,
          callbackUrl: connectionCallback(input.callbackPort),
        };
      })
      .catch((error: unknown) => this.databaseError(error));
  }
  private databaseError(error: unknown): never {
    let current: unknown = error;
    for (let i = 0; i < 3 && current && typeof current === 'object'; i++) {
      const e = current as { code?: string; cause?: unknown };
      if (e.code === '23505' || e.code === '23514') conflict();
      current = e.cause;
    }
    throw error;
  }
  async list(actor: string, projectId: string, page: PageDto, id?: string) {
    return this.db.db.transaction(
      async (tx) => {
        const project = await this.auth.project(actor, projectId, tx);
        if (project.projectRole !== 'OWNER') throw new ForbiddenException();
        if (id) return [await this.record(tx, actor, projectId, id)];
        return tx
          .select(fields)
          .from(grants)
          .where(and(eq(grants.projectId, projectId), eq(grants.userId, actor)))
          .orderBy(desc(grants.createdAt), desc(grants.id))
          .limit(page.limit + 1)
          .offset(page.offset);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  async cancel(
    actor: string,
    sessionId: string,
    projectId: string,
    id: string,
    body: unknown,
  ) {
    if (
      body !== undefined &&
      (body === null ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).length)
    )
      throw new BadRequestException();
    return this.db.transaction(async (tx) => {
      const project = await this.auth.projectOwner(actor, projectId, tx);
      await this.session(tx, actor, sessionId);
      const [row] = await tx
        .select()
        .from(grants)
        .where(
          and(
            eq(grants.id, id),
            eq(grants.projectId, projectId),
            eq(grants.userId, actor),
          ),
        )
        .for('update');
      if (!row) throw new NotFoundException();
      if (row.status === 'EXCHANGED') conflict();
      if (row.status === 'AUTHORIZED') {
        await tx
          .update(grants)
          .set({ status: 'CANCELLED', completedAt: sql`clock_timestamp()` })
          .where(eq(grants.id, id));
        await this.event(tx, project, actor, id, 'cancelled');
      }
      return this.record(tx, actor, projectId, id);
    });
  }
  private proof(
    row: Grant | undefined,
    input: ReturnType<typeof exchangeConnection.parse>,
  ) {
    if (
      !row ||
      row.projectId !== input.projectId ||
      row.callbackPort !== input.callbackPort ||
      !timingSafeEqual(
        Buffer.from(row.codeHash, 'hex'),
        Buffer.from(connectionHash(input.code), 'hex'),
      ) ||
      !timingSafeEqual(
        Buffer.from(row.stateHash, 'hex'),
        Buffer.from(connectionHash(input.state), 'hex'),
      ) ||
      !matchesConnectionProof(input.verifier, row.challenge)
    )
      throw new UnauthorizedException();
    return row;
  }
  async exchange(raw: unknown) {
    const input = parseConnection(exchangeConnection, raw);
    const [found] = await this.db.db
      .select()
      .from(grants)
      .where(eq(grants.id, input.grantId));
    const original = this.proof(found, input);
    return this.db
      .transaction(async (tx) => {
        let project: Awaited<
          ReturnType<AuthorizationRepository['projectOwner']>
        >;
        try {
          project = await this.auth.projectOwner(
            original.userId,
            original.projectId,
            tx,
          );
          await this.session(tx, original.userId, original.sessionId);
        } catch (error) {
          if (
            error instanceof ForbiddenException ||
            error instanceof NotFoundException
          )
            throw new UnauthorizedException();
          throw error;
        }
        if (project.status !== 'ACTIVE') throw new UnauthorizedException();
        const [locked] = await tx
          .select()
          .from(grants)
          .where(eq(grants.id, original.id))
          .for('update');
        const row = this.proof(locked, input);
        if (row.status !== 'AUTHORIZED') conflict();
        const time = await tx.execute<{ expired: boolean }>(
          sql`SELECT ${row.expiresAt}::timestamptz<=clock_timestamp() AS expired`,
        );
        if (time.rows[0].expired) throw new UnauthorizedException();
        const token = await this.tokens.createInTransaction(
          tx,
          row.userId,
          project,
          { name: row.tokenName, expiresInDays: row.tokenExpiresInDays },
        );
        await tx
          .update(grants)
          .set({
            status: 'EXCHANGED',
            apiTokenId: token.id,
            completedAt: sql`clock_timestamp()`,
          })
          .where(eq(grants.id, row.id));
        await this.event(
          tx,
          project,
          row.userId,
          row.id,
          'exchanged',
          token.id,
        );
        return token;
      })
      .catch((error: unknown) => this.databaseError(error));
  }
}
