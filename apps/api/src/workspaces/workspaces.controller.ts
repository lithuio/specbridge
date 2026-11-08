import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
import {
  dtoPipe,
  EmailDto,
  NameDto,
  PageDto,
  page,
} from '../authorization/rbac.dto.js';
import { WorkspacesService } from './workspaces.service.js';
@Controller('api/v1/workspaces')
export class WorkspacesController {
  constructor(
    @Inject(WorkspacesService) private readonly service: WorkspacesService,
  ) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() req: AuthRequest, @Query(dtoPipe(PageDto)) input: PageDto) {
    return page(
      await this.service.list(req.auth!.user.id, input),
      input,
      req.requestId,
    );
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(
    @Req() req: AuthRequest,
    @Body(dtoPipe(NameDto)) input: NameDto,
  ) {
    return {
      data: await this.service.create(req.auth!.user.id, input.name),
      meta: { requestId: req.requestId },
    };
  }
  @Get(':id/members')
  @Header('Cache-Control', 'no-store')
  async members(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(PageDto)) input: PageDto,
  ) {
    return page(
      await this.service.members(req.auth!.user.id, id, input),
      input,
      req.requestId,
    );
  }
  @Post(':id/members')
  @Header('Cache-Control', 'no-store')
  async add(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(EmailDto)) input: EmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.add(req.auth!.user.id, id, input.email);
    res.status(result.created ? 201 : 200);
    return { data: result.data, meta: { requestId: req.requestId } };
  }
}
