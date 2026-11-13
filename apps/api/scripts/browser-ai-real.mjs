// Explicit paid smoke only. Keys are loaded here, never in Next/Playwright.
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { testDatabaseUrl } from '../dist/database/database.config.js';

if (
  process.env.CI ||
  process.env.R08_REAL_PROVIDER !== '1' ||
  process.env.NODE_ENV !== 'test'
) {
  console.error(
    'Real browser provider requires local opt-in and an isolated test environment.',
  );
  process.exit(1);
}
const database = testDatabaseUrl(process.env.DATABASE_URL);
const evidenceDirectory = process.env.R08_REAL_EVIDENCE_DIR
  ? resolve(process.env.R08_REAL_EVIDENCE_DIR)
  : fileURLToPath(new URL('../../../test-results/r08-f', import.meta.url));
const evidence = join(evidenceDirectory, 'real-provider.json');
const stats = {
  status: 'STARTING',
  model: '',
  modelCalls: 0,
  reservedOutputTokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  usageMissing: 0,
  upstreamStatuses: [],
  upstreamMetadata: [],
  results: [],
};
const save = async () => {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(evidence, JSON.stringify(stats, null, 2) + '\n');
};
let app;
try {
  loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: database,
    DEEPSEEK_ENABLED: 'true',
    DEEPSEEK_MAX_TOKENS: '4096',
    DEEPSEEK_TIMEOUT_MS: '30000',
    OBSERVE_APP_KEY: '',
    OBSERVE_APP_SECRET: '',
  });
  const [
    { Test },
    { AppModule },
    { configureApp },
    { AI_FETCH, DeepseekProvider },
    { AiConfig },
  ] = await Promise.all([
    import('@nestjs/testing'),
    import('../dist/app.module.js'),
    import('../dist/configure-app.js'),
    import('../dist/ai/deepseek.provider.js'),
    import('../dist/ai/ai.config.js'),
  ]);
  const config = new AiConfig();
  config.credentials();
  stats.model = config.model;
  const transport = async (url, options) => {
    const body = JSON.parse(options.body);
    const maxTokens = body.max_tokens;
    if (
      !Number.isInteger(maxTokens) ||
      stats.modelCalls >= 4 ||
      stats.reservedOutputTokens + maxTokens > 8192
    )
      throw new Error('Smoke budget exhausted');
    stats.modelCalls++;
    stats.reservedOutputTokens += maxTokens;
    const response = await fetch(url, options);
    stats.upstreamStatuses.push(response.status);
    // Bounded smoke diagnostics only: never retain message/tool bodies or raw errors.
    const reader = response.clone().body?.getReader();
    if (reader) {
      const chunks = [];
      let bytes = 0;
      try {
        while (bytes <= 256 * 1024) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes <= 256 * 1024) chunks.push(chunk.value);
        }
        const envelope =
          bytes <= 256 * 1024
            ? JSON.parse(Buffer.concat(chunks).toString('utf8'))
            : null;
        const choice = envelope?.choices?.[0];
        const count = (value) =>
          Number.isSafeInteger(value) && value >= 0 ? value : null;
        stats.upstreamMetadata.push({
          status: response.status,
          bytes,
          requestedOutputTokens: maxTokens,
          toolsEnabled: Array.isArray(body.tools),
          finishReason: [
            'stop',
            'length',
            'tool_calls',
            'content_filter',
          ].includes(choice?.finish_reason)
            ? choice.finish_reason
            : 'unknown',
          toolCalls: Array.isArray(choice?.message?.tool_calls)
            ? choice.message.tool_calls.length
            : 0,
          promptTokens: count(envelope?.usage?.prompt_tokens),
          completionTokens: count(envelope?.usage?.completion_tokens),
        });
      } catch {
        stats.upstreamMetadata.push({
          status: response.status,
          envelope: 'unreadable',
        });
      } finally {
        // Do not await cancellation of a tee while the original awaits its consumer.
        void reader.cancel().catch(() => undefined);
      }
    }
    return response;
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .useMocker((token) => (token === AI_FETCH ? transport : undefined))
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  const provider = app.get(DeepseekProvider);
  const complete = provider.complete.bind(provider);
  // Record only bounded counters after the real provider validation; no body/log capture.
  provider.complete = async (...args) => {
    const start = performance.now();
    try {
      const response = await complete(...args);
      if (response.usage) {
        stats.promptTokens += response.usage.prompt_tokens;
        stats.completionTokens += response.usage.completion_tokens;
      } else stats.usageMissing++;
      stats.results.push({
        status: 'PASS',
        durationMs: Math.round(performance.now() - start),
      });
      stats.status = 'CALLS_COMPLETED';
      return response;
    } catch (error) {
      const response = error?.getResponse?.();
      const code = [
        'AI_INVALID_RESPONSE',
        'AI_UNAVAILABLE',
        'RATE_LIMITED',
      ].includes(response?.code)
        ? response.code
        : 'OTHER';
      stats.results.push({
        status: 'FAIL',
        code,
        durationMs: Math.round(performance.now() - start),
      });
      stats.status = 'CALL_FAILED';
      throw error;
    } finally {
      await save();
    }
  };
  // AiConfig already captured it privately. Do not pass it to further children.
  delete process.env.DEEPSEEK_API_KEY;
  await app.listen(4000, '127.0.0.1');
  stats.status = 'READY';
  await save();
  let closing = false;
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, async () => {
      if (closing) return;
      closing = true;
      await app.close();
      await save();
      process.exit(0);
    });
} catch {
  stats.status = 'BLOCKED_CONFIGURATION_OR_STARTUP';
  await save();
  console.error(
    'Real provider smoke startup failed; configuration and private details withheld.',
  );
  await app?.close();
  process.exitCode = 1;
}
