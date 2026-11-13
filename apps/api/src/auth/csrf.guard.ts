import {
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthConfig } from './auth.config.js';
import { Reflector } from '@nestjs/core';
import {
  CONNECTION_EXCHANGE,
  checkExchangeTransport,
} from '../agent-connections/connection-access.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Inject(AuthConfig) private readonly config: AuthConfig,
    @Inject(Reflector) private readonly reflector: Reflector = new Reflector(),
  ) {}
  check(request: Request): void {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    const origin = request.get('origin');
    const site = request.get('sec-fetch-site');
    const hasBody =
      request.headers['transfer-encoding'] !== undefined ||
      Number(request.headers['content-length'] ?? 0) > 0;
    const documentUpload =
      request.method === 'POST' &&
      /^\/api\/v1\/projects\/[\da-f-]{36}\/documents\/*$/i.test(request.path) &&
      request.is('multipart/form-data');
    if (
      !origin ||
      !this.config.trustedOrigins.has(origin) ||
      request.get('x-csrf-protection') !== '1' ||
      (site !== undefined && site !== 'same-origin') ||
      (hasBody && !request.is('application/json') && !documentUpload)
    ) {
      throw new ForbiddenException(
        'Request origin or CSRF protection is invalid',
      );
    }
  }
  canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(CONNECTION_EXCHANGE, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      checkExchangeTransport(context.switchToHttp().getRequest<Request>());
      return true;
    }
    this.check(context.switchToHttp().getRequest<Request>());
    return true;
  }
}
