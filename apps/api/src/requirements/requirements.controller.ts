import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.types.js';
import { dtoPipe, page, PageDto } from '../authorization/rbac.dto.js';
import {
  ClarificationDto,
  CreateRequirementDto,
  PatchRequirementDto,
  RevisionDto,
  VersionDto,
} from './requirements.dto.js';
import { RequirementsService } from './requirements.service.js';
@Controller('api/v1')
export class RequirementsController {
  constructor(
    @Inject(RequirementsService) private readonly service: RequirementsService,
  ) {}
  @Get('projects/:id/requirements')
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
  @Post('projects/:id/requirements')
  @Header('Cache-Control', 'no-store')
  async create(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(CreateRequirementDto)) input: CreateRequirementDto,
  ) {
    return {
      data: await this.service.create(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
  @Get('requirements/:id')
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
  @Patch('requirements/:id')
  @Header('Cache-Control', 'no-store')
  async patch(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(PatchRequirementDto)) input: PatchRequirementDto,
  ) {
    return {
      data: await this.service.patch(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
  @Post('requirements/:id/clarifications')
  @Header('Cache-Control', 'no-store')
  async clarify(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(ClarificationDto)) input: ClarificationDto,
  ) {
    return {
      data: await this.service.clarify(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
  @Post('requirements/:id/revisions')
  @Header('Cache-Control', 'no-store')
  async revision(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(RevisionDto)) input: RevisionDto,
  ) {
    return {
      data: await this.service.revision(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
  @Get('requirements/:id/revisions')
  @Header('Cache-Control', 'no-store')
  async history(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(PageDto)) input: PageDto,
  ) {
    return page(
      await this.service.history(req.auth!.user.id, id, input),
      input,
      req.requestId,
    );
  }
  @Post('requirements/:id/mark-ready')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async ready(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(VersionDto)) input: VersionDto,
  ) {
    return {
      data: await this.service.ready(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
}
