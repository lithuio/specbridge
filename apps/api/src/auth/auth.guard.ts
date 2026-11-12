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
import {
  PROJECT_TOKEN_READ,
  TOKEN_SCOPE,
} from '../api-tokens/token.contract.js';
import { TokenAccess } from '../api-tokens/token-access.module.js';
import { RateLimitService } from './rate-limit.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(AuthConfig) private readonly config: AuthConfig,
    @Inject(CsrfGuard) private readonly csrf: CsrfGuard,
    @Inject(TokenAccess) private readonly tokens: TokenAccess,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
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
    if (request.headers.authorization !== undefined) {
      const headerCount = request.rawHeaders.filter(
        (v, i) => i % 2 === 0 && v.toLowerCase() === 'authorization',
      ).length;
      const scope = this.reflector.getAllAndOverride<string>(
        PROJECT_TOKEN_READ,
        [context.getHandler(), context.getClass()],
      );
      if (
        headerCount !== 1 ||
        request.headers.cookie !== undefined ||
        scope !== TOKEN_SCOPE ||
        !['GET', 'HEAD'].includes(request.method)
      )
        throw new UnauthorizedException();
      const match = /^Bearer (sbp_[A-Za-z0-9_-]{43})$/i.exec(
        request.headers.authorization,
      );
      if (!match) throw new UnauthorizedException();
      this.limits.consume(
        `project-token-ip:${request.socket.remoteAddress ?? 'unknown'}`,
        120,
        60_000,
      );
      const principal = await this.tokens.authenticate(match[1]);
      this.limits.consume(`project-token:${principal.id}`, 60, 60_000);
      request.projectToken = principal;
      return true;
    }
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
