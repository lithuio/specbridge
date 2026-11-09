import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter.js';

it('never exposes driver parameters, credential values, or stacks in errors/logs', () => {
  const messages: unknown[] = [];
  const spy = vi
    .spyOn(Logger.prototype, 'error')
    .mockImplementation((message: unknown) => {
      messages.push(message);
    });
  const json = vi.fn();
  const response = {
    status: vi.fn().mockReturnThis(),
    json,
    setHeader: vi.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ requestId: 'safe-request' }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  try {
    const filter = new ApiExceptionFilter();
    filter.catch(
      new Error(
        'SQL parameters: password=secret-sentinel token=token-sentinel',
      ),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify([...messages, json.mock.calls])).not.toContain(
      'sentinel',
    );
    filter.catch(
      new BadRequestException({
        message: ['password secret-sentinel rejected'],
        target: { password: 'secret-sentinel' },
      }),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(JSON.stringify(json.mock.calls)).not.toContain('sentinel');
  } finally {
    spy.mockRestore();
  }
});

it('preserves only allowlisted domain codes with the matching HTTP status', async () => {
  const { HttpException } = await import('@nestjs/common');
  const json = vi.fn();
  const response = {
    status: vi.fn().mockReturnThis(),
    json,
    setHeader: vi.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ requestId: 'safe' }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  for (const [status, code, expected] of [
    [409, 'CLIENT_ASSIGNMENT_LOCKED', 'CLIENT_ASSIGNMENT_LOCKED'],
    [409, 'STALE_VERSION', 'STALE_VERSION'],
    [409, 'ALREADY_REVIEWED', 'ALREADY_REVIEWED'],
    [409, 'DELIVERY_PENDING', 'DELIVERY_PENDING'],
    [409, 'DELIVERY_COMPLETED', 'DELIVERY_COMPLETED'],
    [422, 'CLIENT_REQUIRED', 'CLIENT_REQUIRED'],
    [409, 'INVALID_TRANSITION', 'INVALID_TRANSITION'],
    [409, 'REVIEW_IN_PROGRESS', 'REVIEW_IN_PROGRESS'],
    [422, 'STALE_VERSION', 'BUSINESS_RULE_VIOLATION'],
    [422, 'ROLE_CONFLICT', 'ROLE_CONFLICT'],
    [422, 'USER_NOT_REGISTERED', 'USER_NOT_REGISTERED'],
    [422, 'WORKSPACE_DEVELOPER_REQUIRED', 'WORKSPACE_DEVELOPER_REQUIRED'],
    [409, 'ROLE_CONFLICT', 'CONFLICT'],
    [422, 'SQL private-sentinel', 'BUSINESS_RULE_VIOLATION'],
  ] as const) {
    new ApiExceptionFilter().catch(
      new HttpException(
        { code, message: 'private-sentinel', details: ['private-sentinel'] },
        status,
      ),
      host,
    );
    expect(json.mock.lastCall?.[0]).toEqual({
      error: {
        code: expected,
        message: 'Request failed',
        requestId: 'safe',
        details: [],
      },
    });
  }
});
