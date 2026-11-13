import { parseProposal, proposalPage } from './proposals.contract.js';
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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';
import { dtoPipe } from '../authorization/rbac.dto.js';
import { EmptyQueryDto } from '../http/read.dto.js';
import { ProposalsService } from './proposals.service.js';
@Controller('api/v1/requirements/:id/copilot-proposals')
export class ProposalsController {
  constructor(
    @Inject(ProposalsService) private readonly service: ProposalsService,
  ) {}
  private envelope(req: AuthRequest, data: unknown) {
    return { data, meta: { requestId: req.requestId } };
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: unknown,
  ) {
    return this.envelope(
      req,
      await this.service.list(
        req.auth!.user.id,
        id.toLowerCase(),
        parseProposal(proposalPage, query),
      ),
    );
  }
  @Get(':proposalId')
  @Header('Cache-Control', 'no-store')
  async read(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('proposalId', new ParseUUIDPipe()) proposalId: string,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return this.envelope(
      req,
      await this.service.read(
        req.auth!.user.id,
        id.toLowerCase(),
        proposalId.toLowerCase(),
      ),
    );
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  async prepare(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    const controller = new AbortController();
    const abort = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.once('close', abort);
    try {
      return this.envelope(
        req,
        await this.service.prepare(
          req.auth!.user.id,
          req.auth!.sessionId,
          id.toLowerCase(),
          body,
          req.requestId,
          controller.signal,
        ),
      );
    } finally {
      res.off('close', abort);
    }
  }
  @Put(':proposalId')
  @Header('Cache-Control', 'no-store')
  async edit(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('proposalId', new ParseUUIDPipe()) proposalId: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return this.envelope(
      req,
      await this.service.edit(
        req.auth!.user.id,
        req.auth!.sessionId,
        id.toLowerCase(),
        proposalId.toLowerCase(),
        body,
      ),
    );
  }
  @Delete(':proposalId')
  @Header('Cache-Control', 'no-store')
  async remove(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('proposalId', new ParseUUIDPipe()) proposalId: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return this.envelope(
      req,
      await this.service.remove(
        req.auth!.user.id,
        req.auth!.sessionId,
        id.toLowerCase(),
        proposalId.toLowerCase(),
        body,
      ),
    );
  }
  @Post(':proposalId/execute')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async execute(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('proposalId', new ParseUUIDPipe()) proposalId: string,
    @Body() body: unknown,
    @Query(dtoPipe(EmptyQueryDto)) _query: EmptyQueryDto,
  ) {
    return this.envelope(
      req,
      await this.service.execute(
        req.auth!.user.id,
        req.auth!.sessionId,
        id.toLowerCase(),
        proposalId.toLowerCase(),
        body,
      ),
    );
  }
}
