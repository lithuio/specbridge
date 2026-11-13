import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.types.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { PageDto, dtoPipe, page } from '../authorization/rbac.dto.js';
import { EmptyQueryDto } from '../http/read.dto.js';
import { ApiTokensService } from './api-tokens.service.js';
import { ApprovedSpecsService } from './approved-specs.service.js';
import { TokenAccessModule } from './token-access.module.js';
import { ProjectTokenRead } from './token.contract.js';

@Controller('api/v1')
export class ApiTokensController {
  constructor(
    @Inject(ApiTokensService) private readonly service: ApiTokensService,
  ) {}
  @Post('projects/:id/api-tokens')
  @Header('Cache-Control', 'no-store')
  async create(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.create(req.auth!.user.id, id, body),
      meta: { requestId: req.requestId },
    };
  }
  @Get('projects/:id/api-tokens')
  @Header('Cache-Control', 'no-store')
  async list(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(PageDto)) input: PageDto,
  ) {
    return page(
      await this.service.list(req.auth!.user.id, id, input),
      input,
      req.requestId,
    );
  }
  @Delete('api-tokens/:id')
  @Header('Cache-Control', 'no-store')
  @HttpCode(204)
  async revoke(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
    @Body() body: unknown,
  ) {
    // No client-controlled identity, dates or status changes are accepted.
    if (
      body !== undefined &&
      (body === null ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).length)
    )
      throw new BadRequestException();
    await this.service.revoke(req.auth!.user.id, id);
  }
}
@Controller('api/v1')
export class ApprovedSpecsController {
  constructor(
    @Inject(ApprovedSpecsService)
    private readonly service: ApprovedSpecsService,
  ) {}
  @Get('projects/:id/approved-specs')
  @ProjectTokenRead()
  @Header('Cache-Control', 'no-store')
  async list(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(PageDto)) input: PageDto,
  ) {
    return page(
      await this.service.read(
        req.projectToken ?? { kind: 'session', userId: req.auth!.user.id },
        id,
        input,
      ),
      input,
      req.requestId,
    );
  }
  @Get('projects/:id/approved-specs/:versionId')
  @ProjectTokenRead()
  @Header('Cache-Control', 'no-store')
  async detail(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    const [data] = await this.service.read(
      req.projectToken ?? { kind: 'session', userId: req.auth!.user.id },
      id,
      { limit: 1, offset: 0 },
      versionId,
    );
    return { data, meta: { requestId: req.requestId } };
  }
}
@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
    AuditModule,
    TokenAccessModule,
    AuthModule,
  ],
  controllers: [ApiTokensController, ApprovedSpecsController],
  providers: [ApiTokensService, ApprovedSpecsService],
  exports: [ApiTokensService],
})
export class ApiTokensModule {}
