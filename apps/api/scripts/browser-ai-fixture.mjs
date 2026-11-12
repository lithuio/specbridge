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
const completion = (message, finish_reason = 'stop') =>
  Response.json({
    choices: [{ message, finish_reason }],
    usage: { prompt_tokens: 100, completion_tokens: 100 },
  });
const transport = async (_url, init) => {
  const body = JSON.parse(init.body);
  const copilot = body.messages[0].content.includes(
    'project-scoped READ-ONLY copilot',
  );
  if (copilot) {
    const context = JSON.parse(body.messages[1].content);
    const results = body.messages
      .filter((m) => m.role === 'tool')
      .map((m) => JSON.parse(m.content));
    if (body.tools) {
      if (results.length) return completion({ content: 'Ready' });
      const { kind, ...args } = context.page;
      const name = {
        requirement: 'get_requirement',
        change: 'get_change_request',
        delivery: 'get_delivery',
      }[kind];
      const calls = name
        ? [{ name, args }]
        : [
            { name: 'get_project_overview', args: {} },
            { name: 'list_project_requirements', args: {} },
          ];
      return completion(
        {
          content: null,
          tool_calls: calls.map((c, i) => ({
            id: `fixture_${i}`,
            type: 'function',
            function: { name: c.name, arguments: JSON.stringify(c.args) },
          })),
        },
        'tool_calls',
      );
    }
    const keys = results
      .flatMap((r) => r.sources.map((s) => s.key))
      .slice(0, 12);
    const record = results[0].untrustedToolData;
    return completion({
      content: JSON.stringify({
        answer: `${context.untrustedConversation.length ? '结合上一轮问题，' : ''}已读取当前项目的授权资料。${record.title ? `「${record.title}」当前状态为 ${record.status}。` : '项目数据以本轮读取的来源为准。'}以下是待人工核实的建议。`,
        blockers: ['DRAFT', 'CLARIFYING'].includes(record.status)
          ? ['需求仍待澄清，验收标准需要人工确认。']
          : [],
        nextSteps: [
          {
            text: '打开来源，核对业务状态与版本，再决定下一步操作。',
            sourceIds: keys,
          },
        ],
        sourceIds: keys,
      }),
    });
  }
  return Response.json({
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
};
const module = await Test.createTestingModule({ imports: [AppModule] })
  .useMocker((token) => (token === AI_FETCH ? transport : undefined))
  .compile();
const app = module.createNestApplication({ logger: false });
configureApp(app);
app.enableShutdownHooks();
await app.listen(4000, '127.0.0.1');
