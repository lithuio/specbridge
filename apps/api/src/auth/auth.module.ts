import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module.js';
import { AuthConfig } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { AuthGuard } from './auth.guard.js';
import { CsrfGuard } from './csrf.guard.js';
import { TokenAccessModule } from '../api-tokens/token-access.module.js';
import { ConnectionExchangeGuard } from '../agent-connections/connection-access.js';

@Module({
  imports: [DatabaseModule, TokenAccessModule],
  controllers: [AuthController],
  providers: [
    ConnectionExchangeGuard,
    AuthConfig,
    AuthService,
    AuthRepository,
    PasswordService,
    SessionService,
    RateLimitService,
    CsrfGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useExisting: CsrfGuard },
  ],
  exports: [AuthConfig, RateLimitService],
})
export class AuthModule {}
