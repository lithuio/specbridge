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
  Query,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.types.js';
import { dtoPipe, PageDto } from '../authorization/rbac.dto.js';
import { CreateDeliveryDto, ReviewDeliveryDto } from './deliveries.dto.js';
import { DeliveriesService } from './deliveries.service.js';
@Controller('api/v1')
export class DeliveriesController {
  constructor(
    @Inject(DeliveriesService) private readonly service: DeliveriesService,
  ) {}
  @Post('change-requests/:id/deliveries')
  @Header('Cache-Control', 'no-store')
  async create(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(CreateDeliveryDto)) input: CreateDeliveryDto,
  ) {
    return {
      data: await this.service.create(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
  @Get('change-requests/:id/deliveries')
  @Header('Cache-Control', 'no-store')
  async history(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(PageDto)) input: PageDto,
  ) {
    const result = await this.service.history(req.auth!.user.id, id, input);
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
  @Post('deliveries/:id/review')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async review(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(dtoPipe(ReviewDeliveryDto)) input: ReviewDeliveryDto,
  ) {
    return {
      data: await this.service.review(req.auth!.user.id, id, input),
      meta: { requestId: req.requestId },
    };
  }
}
