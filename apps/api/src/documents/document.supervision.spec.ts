import { spawn } from 'node:child_process';
import { DocumentParser } from './document.parser.js';
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: vi.fn(actual.spawn) };
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it('kills a real hung child and reports only PARSE_TIMEOUT', async () => {
  const actual =
    await vi.importActual<typeof import('node:child_process')>(
      'node:child_process',
    );
  vi.mocked(spawn).mockImplementationOnce((_command, _args, options) =>
    actual.spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], options),
  );
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const pending = new DocumentParser().parse(
    Buffer.from('synthetic'),
    'text/plain',
  );
  const check = expect(pending).rejects.toMatchObject({
    code: 'PARSE_TIMEOUT',
  });
  // resolve realpath and child startup before advancing the parent deadline.
  await vi.waitFor(() => expect(spawn).toHaveBeenCalled(), { interval: 10 });
  await vi.advanceTimersByTimeAsync(15001);
  await check;
});
it('kills a real child exceeding the stdout budget without propagating its body', async () => {
  const actual =
    await vi.importActual<typeof import('node:child_process')>(
      'node:child_process',
    );
  vi.mocked(spawn).mockImplementationOnce((_command, _args, options) =>
    actual.spawn(
      process.execPath,
      [
        '-e',
        "process.stdin.resume();process.stdout.write('x'.repeat(4*1024*1024))",
      ],
      options,
    ),
  );
  await expect(
    new DocumentParser().parse(Buffer.from('synthetic'), 'text/plain'),
  ).rejects.toMatchObject({ code: 'PARSE_LIMIT' });
});
