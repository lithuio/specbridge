import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.js';

const codes: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'BUSINESS_RULE_VIOLATION',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};
const domainCodes: Record<number, readonly string[]> = {
  409: [
    'REGISTRATION_UNAVAILABLE',
    'CLIENT_ASSIGNMENT_LOCKED',
    'STALE_VERSION',
    'INVALID_TRANSITION',
    'REVIEW_IN_PROGRESS',
  ],
  422: ['ROLE_CONFLICT', 'USER_NOT_REGISTERED', 'WORKSPACE_DEVELOPER_REQUIRED'],
};
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');
  catch(error: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<AuthRequest>();
    const res = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const payload =
      error instanceof HttpException ? error.getResponse() : undefined;
    const detail =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    const code =
      typeof detail.code === 'string' &&
      domainCodes[status]?.includes(detail.code)
        ? detail.code
        : (codes[status] ?? 'REQUEST_FAILED');
    // Never serialize raw exceptions, validation values, DB errors or SQL parameters.
    const message =
      status === 401
        ? 'Authentication required or credentials invalid'
        : status === 400
          ? 'Invalid request'
          : status >= 500
            ? 'Service could not complete the request'
            : code === 'REGISTRATION_UNAVAILABLE'
              ? 'Registration is unavailable'
              : status === 429
                ? 'Too many requests'
                : status === 403
                  ? 'Request forbidden'
                  : 'Request failed';
    if (status === 429 && typeof detail.retryAfter === 'number')
      res.setHeader('Retry-After', detail.retryAfter);
    if (status >= 500)
      this.logger.error(
        JSON.stringify({
          requestId: req.requestId,
          actorId: req.auth?.user.id,
          status,
          action: 'request.failed',
        }),
      );
    res.status(status).json({
      error: { code, message, requestId: req.requestId, details: [] },
    });
  }
}
