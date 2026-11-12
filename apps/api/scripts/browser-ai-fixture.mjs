// Test-only entrypoint, never imported by the production server. The real API,
// SDK parsing, policies, limits and database run with a synthetic HTTP transport.
import { Test } from '@nestjs/testing';
import { AppModule } from '../dist/app.module.js';
import { configureApp } from '../dist/configure-app.js';
import { AI_FETCH } from '../dist/ai/deepseek.provider.js';
import { testDatabaseUrl } from '../dist/database/database.config.js';

if (process.env.NODE_ENV !== 'test')
  throw new Error('Test environment required');
testDatabaseUrl(process.env.DATABASE_URL);
Object.assign(process.env, {
  DEEPSEEK_ENABLED: 'true',
  DEEPSEEK_API_KEY: 'synthetic-browser-test-key',
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
  DEEPSEEK_MODEL: 'deepseek-flash',
});
const transport = async () =>
  Response.json({
    choices: [
      {
        finish_reason: 'stop',
        message: {
          content: JSON.stringify({
            summary:
              '支持项目成员按月份导出需求清单，保留标题、状态和验收标准。',
            assumptions: ['推测需要 CSV 格式，尚待客户确认。'],
            openQuestions: ['导出应包含哪些字段？', '是否需要按状态筛选？'],
            acceptanceCriteria: [
              '选择月份后仅导出该月需求。',
              '无数据时显示明确的空状态。',
            ],
            risks: ['权限范围需要核实，避免导出其他项目内容。'],
          }),
        },
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 100 },
  });
const module = await Test.createTestingModule({ imports: [AppModule] })
  .useMocker((token) => (token === AI_FETCH ? transport : undefined))
  .compile();
const app = module.createNestApplication({ logger: false });
configureApp(app);
app.enableShutdownHooks();
await app.listen(4000, '127.0.0.1');
