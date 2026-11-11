import {
  Controller,
  Get,
  Header,
  Inject,
  Module,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.types.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { dtoPipe } from '../authorization/rbac.dto.js';
import { DatabaseModule } from '../database/database.module.js';
import { DashboardDto } from './dashboard.dto.js';
import { DashboardRepository } from './dashboard.repository.js';
@Controller('api/v1')
export class DashboardController {
  constructor(
    @Inject(DashboardRepository)
    private readonly repository: DashboardRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
  ) {}
  @Get('dashboard')
  @Header('Cache-Control', 'no-store')
  read(
    @Req() req: AuthRequest,
    @Query(dtoPipe(DashboardDto)) input: DashboardDto,
  ) {
    return this.repository.database.db.transaction(
      async (tx) => {
        const actor = req.auth!.user.id.toLowerCase();
        if (input.projectId)
          await this.authorization.project(
            actor,
            input.projectId.toLowerCase(),
            tx,
          );
        const result = await this.repository.read(tx, actor, input);
        return {
          data: {
            scope: {
              workspaceId: input.workspaceId?.toLowerCase() ?? null,
              projectId: input.projectId?.toLowerCase() ?? null,
            },
            summary: result.summary,
            items: result.items.slice(0, input.limit),
          },
          meta: {
            requestId: req.requestId,
            limit: input.limit,
            offset: input.offset,
            hasMore: result.items.length > input.limit,
            asOf: result.asOf,
          },
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [DashboardController],
  providers: [DashboardRepository],
})
export class DashboardModule {}
