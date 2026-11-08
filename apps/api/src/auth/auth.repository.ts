import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { sessions, users } from '../database/schema/index.js';

export const safeUserColumns = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  createdAt: users.createdAt,
};
const validSession = (tokenHash: string) =>
  and(
    eq(sessions.tokenHash, tokenHash),
    isNull(sessions.revokedAt),
    gt(sessions.expiresAt, sql`statement_timestamp()`),
    gt(
      sessions.lastActivityAt,
      sql`statement_timestamp() - interval '24 hours'`,
    ),
  );

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: Pick<DatabaseService, 'db' | 'transaction'>,
  ) {}

  async findCredentials(email: string) {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    return user;
  }

  async register(email: string, displayName: string, passwordHash: string) {
    try {
      const [user] = await this.database.db
        .insert(users)
        .values({ email, displayName, passwordHash })
        .returning({ id: users.id });
      return user;
    } catch (error) {
      const cause = error instanceof Error && error.cause ? error.cause : error;
      if (
        typeof cause === 'object' &&
        cause !== null &&
        'code' in cause &&
        cause.code === '23505' &&
        'constraint' in cause &&
        cause.constraint === 'users_email_lower_unique'
      )
        return undefined;
      throw error;
    }
  }

  async rotateSession(
    userId: string,
    tokenHash: string,
    oldTokenHash?: string,
  ) {
    return this.database.transaction(async (tx) => {
      if (oldTokenHash) {
        await tx
          .update(sessions)
          .set({ revokedAt: sql`statement_timestamp()` })
          .where(
            and(
              eq(sessions.tokenHash, oldTokenHash),
              isNull(sessions.revokedAt),
            ),
          );
      }
      const [session] = await tx
        .insert(sessions)
        .values({
          userId,
          tokenHash,
          expiresAt: sql`statement_timestamp() + interval '7 days'`,
          createdAt: sql`statement_timestamp()`,
          lastActivityAt: sql`statement_timestamp()`,
        })
        .returning({ expiresAt: sessions.expiresAt });
      return session;
    });
  }

  async authenticate(tokenHash: string) {
    // Check validity and touch in one conditional write; a concurrent revoke cannot be undone.
    const touched = this.database.db.$with('touched_session').as(
      this.database.db
        .update(sessions)
        .set({
          lastActivityAt: sql`greatest(${sessions.lastActivityAt}, statement_timestamp())`,
        })
        .where(validSession(tokenHash))
        .returning({ sessionId: sessions.id, userId: sessions.userId }),
    );
    const [result] = await this.database.db
      .with(touched)
      .select({ sessionId: touched.sessionId, user: safeUserColumns })
      .from(touched)
      .innerJoin(users, eq(users.id, touched.userId));
    return result;
  }

  async revoke(sessionId: string) {
    await this.database.db
      .update(sessions)
      .set({ revokedAt: sql`statement_timestamp()` })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  }
}
