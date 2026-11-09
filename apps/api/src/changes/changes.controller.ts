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
import { dtoPipe, PageDto } from '../authorization/rbac.dto.js';
import {
  ChangeDecisionDto,
  ChangeVersionDto,
  CreateChangeDto,
  PatchChangeDto,
} from './changes.dto.js';
import { ChangesService } from './changes.service.js';
@Controller('api/v1')
export class ChangesController {
  constructor(
    @Inject(ChangesService) private readonly service: ChangesService,
  ) {}
  @Post('requirements/:id/change-requests')
  @Header('Cache-Control', 'no-store')
  async create(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(CreateChangeDto)) _input: CreateChangeDto,
  ) {
    return {
      data: await this.service.create(req.auth!.user.id, id),
      meta: { requestId: req.requestId },
    };
  }
  @Get('change-requests/:id')
  @Header('Cache-Control', 'no-store')
  async detail(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(PageDto)) input: PageDto,
  ) {
    const result = await this.service.detail(req.auth!.user.id, id, input);
    return {
      data: result.data,
      meta: {
        requestId: req.requestId,
        limit: input.limit,
        offset: input.offset,
        hasMore: result.hasMore,
      },
    };
  }
  @Patch('change-requests/:id')
  @Header('Cache-Control', 'no-store')
  async patch(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(PatchChangeDto)) input: PatchChangeDto,
  ) {
    return {
      data: await this.service.patch(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
  @Post('change-requests/:id/submit')
  @Header('Cache-Control', 'no-store')
  async submit(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(ChangeVersionDto)) input: ChangeVersionDto,
  ) {
    return {
      data: await this.service.submit(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
  @Post('change-requests/:id/vendor-decision')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async vendor(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(ChangeDecisionDto)) input: ChangeDecisionDto,
  ) {
    return {
      data: await this.service.decision(req.auth!.user.id, id, 'VENDOR', input),
      meta: { requestId: req.requestId },
    };
  }
  @Post('change-requests/:id/client-decision')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async client(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(ChangeDecisionDto)) input: ChangeDecisionDto,
  ) {
    return {
      data: await this.service.decision(req.auth!.user.id, id, 'CLIENT', input),
      meta: { requestId: req.requestId },
    };
  }
  @Post('change-requests/:id/resubmit')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async reopen(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(ChangeVersionDto)) input: ChangeVersionDto,
  ) {
    return {
      data: await this.service.reopen(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
}
