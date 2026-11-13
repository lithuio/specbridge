import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.types.js';
import { dtoPipe } from '../authorization/rbac.dto.js';
import { EmptyQueryDto } from '../http/read.dto.js';
import { WorkingDraftsService } from './working-drafts.service.js';

@Controller('api/v1/requirements/:id')
export class WorkingDraftsController {
  constructor(
    @Inject(WorkingDraftsService)
    private readonly service: WorkingDraftsService,
  ) {}
  @Get('working-drafts')
  @Header('Cache-Control', 'no-store')
  async list(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.list(req.auth!.user.id, id),
      meta: { requestId: req.requestId },
    };
  }
  @Put('working-drafts/:kind')
  @Header('Cache-Control', 'no-store')
  async save(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('kind') kind: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.save(req.auth!.user.id, id, kind, body),
      meta: { requestId: req.requestId },
    };
  }
  @Delete('working-drafts/:kind')
  @Header('Cache-Control', 'no-store')
  async remove(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('kind') kind: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.remove(req.auth!.user.id, id, kind, body),
      meta: { requestId: req.requestId },
    };
  }
  @Post('working-drafts/:kind/publish')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async publish(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('kind') kind: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.publish(req.auth!.user.id, id, kind, body),
      meta: { requestId: req.requestId },
    };
  }
  @Get('working-draft-publications/:operationId')
  @Header('Cache-Control', 'no-store')
  async receipt(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('operationId', new ParseUUIDPipe()) operationId: string,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return {
      data: await this.service.receipt(req.auth!.user.id, id, operationId),
      meta: { requestId: req.requestId },
    };
  }
}
