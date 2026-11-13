import {
  Injectable,
  Inject,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitService } from '../auth/rate-limit.service.js';
export const CONNECTION_EXCHANGE = 'specbridge:connection-exchange';
export const ConnectionExchange = () => SetMetadata(CONNECTION_EXCHANGE, true);
export function checkExchangeTransport(req: Request) {
  if (
    req.method !== 'POST' ||
    !/^\/api\/v1\/agent-connections\/exchange\/*$/i.test(req.path) ||
    req.headers.cookie !== undefined ||
    req.headers.authorization !== undefined ||
    req.headers.origin !== undefined ||
    Object.keys(req.headers).some((k) => k.startsWith('sec-fetch-')) ||
    !req.is('application/json')
  )
    throw new UnauthorizedException();
}
@Injectable()
export class ConnectionExchangeGuard {
  constructor(
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}
  check(req: Request) {
    checkExchangeTransport(req);
    this.limits.consume(
      `connection-exchange-ip:${req.socket.remoteAddress ?? 'unknown'}`,
      60,
      60_000,
    );
  }
}
