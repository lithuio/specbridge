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
import { DashboardService } from './dashboard.service.js';
import { dtoPipe } from '../authorization/rbac.dto.js';
import { DatabaseModule } from '../database/database.module.js';
import { DashboardDto } from './dashboard.dto.js';
import { DashboardRepository } from './dashboard.repository.js';
@Controller('api/v1')
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly service: DashboardService,
  ) {}
  @Get('dashboard')
  @Header('Cache-Control', 'no-store')
  async read(
    @Req() req: AuthRequest,
    @Query(dtoPipe(DashboardDto)) input: DashboardDto,
  ) {
    const result = await this.service.read(req.auth!.user.id, input);
    return { ...result, meta: { ...result.meta, requestId: req.requestId } };
  }
}
@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
