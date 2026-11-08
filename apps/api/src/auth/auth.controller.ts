import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { AuthConfig } from './auth.config.js';
import { SessionService } from './session.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { Public } from './public.decorator.js';
import type { AuthRequest } from './auth.types.js';
import { ValidationPipe } from '@nestjs/common';

// Explicit DTO type also works with Vite's decorator transform (no emitted design:paramtypes).
const dtoPipe = (expectedType: new () => object) =>
  new ValidationPipe({
    expectedType,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
@Controller('api/v1')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthConfig) private readonly config: AuthConfig,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}
  @Public()
  @Post('auth/register')
  async register(
    @Body(dtoPipe(RegisterDto)) input: RegisterDto,
    @Req() req: AuthRequest,
  ) {
    return {
      data: await this.auth.register(input),
      meta: { requestId: req.requestId },
    };
  }
  @Public()
  @Post('auth/login')
  @HttpCode(200)
  async login(
    @Body(dtoPipe(LoginDto)) input: LoginDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(
      input,
      // Match the IP bucket: forwarding headers are not verified identities.
      req.socket.remoteAddress ?? 'unknown',
      req.cookies?.[this.config.cookieName],
    );
    res.cookie(this.config.cookieName, result.session.token, {
      ...this.config.cookieOptions,
      expires: result.session.expiresAt,
    });
    return { data: { user: result.user }, meta: { requestId: req.requestId } };
  }
  @Post('auth/logout')
  @HttpCode(204)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.sessions.revoke(req.auth!.sessionId);
    res.clearCookie(this.config.cookieName, this.config.cookieOptions);
  }
  @Get('me')
  me(@Req() req: AuthRequest) {
    return {
      data: { user: req.auth!.user },
      meta: { requestId: req.requestId },
    };
  }
}
