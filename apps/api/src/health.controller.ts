import { Public } from './auth/public.decorator.js';
import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/health')
export class HealthController {
  @Public()
  @Get()
  getHealth(): { data: { status: 'ok' } } {
    return { data: { status: 'ok' } };
  }
}
