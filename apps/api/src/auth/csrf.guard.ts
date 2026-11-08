import {
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthConfig } from './auth.config.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(AuthConfig) private readonly config: AuthConfig) {}
  check(request: Request): void {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    const origin = request.get('origin');
    const site = request.get('sec-fetch-site');
    const hasBody =
      request.headers['transfer-encoding'] !== undefined ||
      Number(request.headers['content-length'] ?? 0) > 0;
    if (
      !origin ||
      !this.config.trustedOrigins.has(origin) ||
      request.get('x-csrf-protection') !== '1' ||
      (site !== undefined && site !== 'same-origin') ||
      (hasBody && !request.is('application/json'))
    ) {
      throw new ForbiddenException(
        'Request origin or CSRF protection is invalid',
      );
    }
  }
  canActivate(context: ExecutionContext): boolean {
    this.check(context.switchToHttp().getRequest<Request>());
    return true;
  }
}
