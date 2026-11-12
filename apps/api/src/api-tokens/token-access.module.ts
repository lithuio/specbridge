import {
  Inject,
  Injectable,
  Module,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DatabaseModule } from '../database/database.module.js';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { apiTokens } from '../database/schema/index.js';
import {
  projectTokenHash,
  TOKEN_SCOPE,
  type ProjectTokenPrincipal,
} from './token.contract.js';

@Injectable()
export class TokenAccess {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
  ) {}
  private valid() {
    return and(
      isNull(apiTokens.revokedAt),
      sql`${apiTokens.expiresAt} > clock_timestamp()`,
      sql`${apiTokens.scopes} = ARRAY[${TOKEN_SCOPE}]::text[]`,
    );
  }
  async authenticate(raw: unknown): Promise<ProjectTokenPrincipal> {
    const hash = projectTokenHash(raw);
    if (!hash) throw new UnauthorizedException();
    return this.database.db.transaction(
      async (tx) => {
        const [row] = await tx
          .select({
            id: apiTokens.id,
            projectId: apiTokens.projectId,
            userId: apiTokens.userId,
          })
          .from(apiTokens)
          .where(and(eq(apiTokens.tokenHash, hash), this.valid()));
        if (!row) throw new UnauthorizedException();
        const principal: ProjectTokenPrincipal = {
          kind: 'project_token',
          ...row,
        };
        await this.authorize(tx, principal);
        return principal;
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  async authorize(
    tx: DatabaseTransaction,
    principal: ProjectTokenPrincipal,
    lock = false,
  ) {
    let project;
    try {
      project = lock
        ? await this.authorization.projectOwner(
            principal.userId,
            principal.projectId,
            tx,
          )
        : await this.authorization.project(
            principal.userId,
            principal.projectId,
            tx,
          );
    } catch (error) {
      if (
        error instanceof HttpException &&
        [403, 404].includes(error.getStatus())
      )
        throw new UnauthorizedException();
      throw error;
    }
    if (project.projectRole !== 'OWNER' || project.status !== 'ACTIVE')
      throw new UnauthorizedException();
    // Lock order is Workspace -> Project -> Token, shared with revoke/owner changes.
    let query = tx
      .select({ id: apiTokens.id })
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.id, principal.id),
          eq(apiTokens.userId, principal.userId),
          eq(apiTokens.projectId, principal.projectId),
          this.valid(),
        ),
      )
      .$dynamic();
    if (lock) query = query.for('update');
    if (!(await query).length) throw new UnauthorizedException();
    return project;
  }
}
@Module({
  imports: [DatabaseModule, AuthorizationModule],
  providers: [TokenAccess],
  exports: [TokenAccess],
})
export class TokenAccessModule {}
