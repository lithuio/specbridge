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
