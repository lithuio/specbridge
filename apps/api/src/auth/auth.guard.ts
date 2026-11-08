import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { AuthConfig } from './auth.config.js';
import { SessionService } from './session.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { PUBLIC_ROUTE } from './public.decorator.js';
import type { AuthRequest } from './auth.types.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(AuthConfig) private readonly config: AuthConfig,
    @Inject(CsrfGuard) private readonly csrf: CsrfGuard,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    // Reject forged writes before touching session activity. Public writes are checked by CsrfGuard.
    this.csrf.check(request);
    const cookie: unknown = request.cookies?.[this.config.cookieName];
    const auth = await this.sessions.authenticate(cookie);
    if (!auth) {
      response.clearCookie(this.config.cookieName, this.config.cookieOptions);
      throw new UnauthorizedException('Authentication required');
    }
    request.auth = auth;
    return true;
  }
}
