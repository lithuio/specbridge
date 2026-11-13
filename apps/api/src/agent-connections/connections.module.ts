import {
  Body,
  Controller,
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
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { EmptyQueryDto } from '../http/read.dto.js';
import { dtoPipe, page } from '../authorization/rbac.dto.js';
import { ConnectionsService } from './connections.service.js';
import { ConnectionExchange } from './connection-access.js';
import { connectionPage, parseConnection } from './connection.contract.js';
@Controller('api/v1/projects/:id/agent-connections')
export class ConnectionsController {
  constructor(
    @Inject(ConnectionsService) private readonly service: ConnectionsService,
  ) {}
  @Post()
  @Header('Cache-Control', 'no-store')
  async approve(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.approve(
        req.auth!.user.id,
        req.auth!.sessionId,
        id.toLowerCase(),
        body,
      ),
      meta: { requestId: req.requestId },
    };
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() raw: unknown,
  ) {
    const input = parseConnection(connectionPage, raw);
    return page(
      await this.service.list(req.auth!.user.id, id.toLowerCase(), input),
      input,
      req.requestId,
    );
  }
  @Get(':grantId')
  @Header('Cache-Control', 'no-store')
  async read(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('grantId', new ParseUUIDPipe()) grantId: string,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    const [data] = await this.service.list(
      req.auth!.user.id,
      id.toLowerCase(),
      { limit: 1, offset: 0 },
      grantId.toLowerCase(),
    );
    return { data, meta: { requestId: req.requestId } };
  }
  @Post(':grantId/cancel')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('grantId', new ParseUUIDPipe()) grantId: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.cancel(
        req.auth!.user.id,
        req.auth!.sessionId,
        id.toLowerCase(),
        grantId.toLowerCase(),
        body,
      ),
      meta: { requestId: req.requestId },
    };
  }
}
@Controller('api/v1/agent-connections')
export class ConnectionExchangeController {
  constructor(
    @Inject(ConnectionsService) private readonly service: ConnectionsService,
  ) {}
  @Post('exchange')
  @ConnectionExchange()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async exchange(
    @Req() req: AuthRequest,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.exchange(body),
      meta: { requestId: req.requestId },
    };
  }
}
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AuthorizationModule,
    AuditModule,
    ApiTokensModule,
  ],
  controllers: [ConnectionsController, ConnectionExchangeController],
  providers: [ConnectionsService],
})
export class ConnectionsModule {}
