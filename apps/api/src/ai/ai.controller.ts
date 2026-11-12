import {
  Body,
  Controller,
  Header,
  HttpCode,
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
import { dtoPipe } from '../authorization/rbac.dto.js';
import { EmptyQueryDto } from '../http/read.dto.js';
import { AiService } from './ai.service.js';

@Controller('api/v1')
export class AiController {
  constructor(@Inject(AiService) private readonly service: AiService) {}
  @Post('requirements/:id/ai-analysis')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async analyze(
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
      return {
        data: await this.service.analyze(
          req.auth!.user.id,
          req.auth!.sessionId,
          id,
          body,
          req.requestId,
          controller.signal,
        ),
        meta: { requestId: req.requestId },
      };
    } finally {
      res.off('close', abort);
    }
  }
}
