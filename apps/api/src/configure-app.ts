import { Logger, ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { ExpressAdapter } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import { AuthConfig } from './auth/auth.config.js';
import { RateLimitService } from './auth/rate-limit.service.js';
import type { AuthRequest } from './auth/auth.types.js';
import { ApiExceptionFilter } from './http/api-exception.filter.js';

export function configureApp(app: INestApplication): void {
  const config = app.get(AuthConfig);
  const limits = app.get(RateLimitService);
  const logger = new Logger('AuthHttp');
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      config.trustedProxies.length ? config.trustedProxies : false,
    );
  app.use((req: AuthRequest, res: Response, next: NextFunction) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    // Case/trailing slash variants resolve to the same Express routes: never bypass limits by spelling.
    const path = req.path.toLowerCase().replace(/\/+$/, '');
    if (path.startsWith('/api/v1/auth/') || path === '/api/v1/me') {
      res.setHeader('Cache-Control', 'no-store');
      const start = performance.now();
      const action =
        path === '/api/v1/auth/login'
          ? 'auth.login'
          : path === '/api/v1/auth/register'
            ? 'auth.register'
            : path === '/api/v1/auth/logout'
              ? 'auth.logout'
              : 'auth.read';
      res.once('finish', () =>
        logger.log(
          JSON.stringify({
            requestId: req.requestId,
            actorId: req.auth?.user.id,
            action,
            status: res.statusCode,
            durationMs: Math.round(performance.now() - start),
          }),
        ),
      );
    }
    try {
      if (req.method === 'POST') {
        // Next rewrites preserve client-supplied XFF. Rate limits must use the
        // socket peer even when Express trusts proxy metadata elsewhere.
        const ip = req.socket.remoteAddress ?? 'unknown';
        if (path === '/api/v1/auth/login')
          limits.consume(`login-ip:${ip}`, 30, 15 * 60_000);
        if (path === '/api/v1/auth/register')
          limits.consume(`register-ip:${ip}`, 5, 60 * 60_000);
      }
      next();
    } catch (error) {
      next(error);
    }
  });
  app.use(cookieParser());
  // Only AI endpoints have a larger body budget. Existing routes keep Nest's default limit.
  app.use((req: AuthRequest, res: Response, next: NextFunction) => {
    if (
      /^\/api\/v1\/(?:requirements\/[^/]+\/(?:copilot-proposals(?:\/[^/]+(?:\/execute)?)?|working-drafts(?:\/[^/]+(?:\/publish)?)?|working-draft-publications\/[^/]+)|api-tokens\/[^/]+|projects\/[^/]+\/(?:documents(?:\/[^/]+(?:\/versions\/[^/]+)?)?|api-tokens|approved-specs(?:\/[^/]+)?)|requirements\/[^/]+\/ai-(?:analysis|assistance)|projects\/[^/]+\/copilot\/messages)\/*$/i.test(
        req.path,
      )
    ) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
  const adapter = app.getHttpAdapter() as ExpressAdapter;
  adapter.useBodyParser('json', false, {
    limit: '256kb',
    type: (req) =>
      /^\/api\/v1\/(?:requirements\/[^/]+\/ai-(?:analysis|assistance)|projects\/[^/]+\/copilot\/messages)\/*$/i.test(
        (req.url ?? '').split('?')[0],
      ) && /^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? ''),
  });
  adapter.useBodyParser('json', false, { limit: '100kb' });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}
