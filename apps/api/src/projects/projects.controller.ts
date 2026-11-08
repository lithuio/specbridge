import {
  Body,
  Controller,
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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
import {
  CreateProjectDto,
  dtoPipe,
  EmailDto,
  page,
  ProjectListDto,
  ProjectMemberDto,
} from '../authorization/rbac.dto.js';
import { ProjectsService } from './projects.service.js';
@Controller('api/v1/projects')
export class ProjectsController {
  constructor(
    @Inject(ProjectsService) private readonly service: ProjectsService,
  ) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @Req() req: AuthRequest,
    @Query(dtoPipe(ProjectListDto)) input: ProjectListDto,
  ) {
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
    @Body(dtoPipe(CreateProjectDto)) input: CreateProjectDto,
  ) {
    return {
      data: await this.service.create(req.auth!.user.id, input),
      meta: { requestId: req.requestId },
    };
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async detail(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return {
      data: await this.service.detail(req.auth!.user.id, id),
      meta: { requestId: req.requestId },
    };
  }
  @Post(':id/members')
  @Header('Cache-Control', 'no-store')
  async add(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(ProjectMemberDto)) input: ProjectMemberDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.add(req.auth!.user.id, id, input.userId);
    res.status(result.created ? 201 : 200);
    return { data: result.data, meta: { requestId: req.requestId } };
  }
  @Put(':id/client')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async client(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(EmailDto)) input: EmailDto,
  ) {
    return {
      data: await this.service.bindClient(req.auth!.user.id, id, input.email),
      meta: { requestId: req.requestId },
    };
  }
}
