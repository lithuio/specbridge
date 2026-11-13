// Explicit local opt-in. Only synthetic fixtures in the guarded test database.
// No env values, chat bodies, cookies or provider errors are printed.
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { Test } from '@nestjs/testing';
import { testDatabaseUrl } from '../dist/database/database.config.js';

if (
  process.env.CI ||
  !process.argv.includes('--run') ||
  !process.env.DEEPSEEK_API_KEY
) {
  console.log(
    'NOT RUN: explicit local opt-in and a safe server key are required.',
  );
  process.exit(0);
}
let app,
  pool,
  calls = 0,
  reservedTokens = 0,
  upstreamStatus;
const start = performance.now();
try {
  const url = testDatabaseUrl(process.env.TEST_DATABASE_URL);
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: url,
    AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
    OBSERVE_APP_KEY: '',
    OBSERVE_APP_SECRET: '',
    DEEPSEEK_ENABLED: 'true',
    DEEPSEEK_MAX_TOKENS: '4096',
    DEEPSEEK_TIMEOUT_MS: '30000',
  });
  // Import application only after diagnostics are disabled; never load .env in CI.
  const [
    { AppModule },
    { configureApp },
    { AI_FETCH },
    { AiConfig },
    { copilotResponse },
    { tokenHash },
    { WorkspacesService },
    { ProjectsService },
    { RequirementsService },
  ] = await Promise.all([
    import('../dist/app.module.js'),
    import('../dist/configure-app.js'),
    import('../dist/ai/deepseek.provider.js'),
    import('../dist/ai/ai.config.js'),
    import('../dist/ai/copilot.contract.js'),
    import('../dist/auth/session.service.js'),
    import('../dist/workspaces/workspaces.service.js'),
    import('../dist/projects/projects.service.js'),
    import('../dist/requirements/requirements.service.js'),
  ]);
  const config = new AiConfig();
  config.credentials();
  pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  const identity = (
    await pool.query('SELECT current_database() AS name,current_user AS role')
  ).rows[0];
  assert.equal(identity.name, 'specbridge_test');
  assert.equal(identity.role, 'specbridge_test');
  const transport = async (input, init) => {
    calls++;
    reservedTokens += JSON.parse(init.body).max_tokens;
    assert.ok(calls <= 3 && reservedTokens <= 4096);
    const response = await fetch(input, init);
    upstreamStatus = response.status;
    return response;
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .useMocker((token) => (token === AI_FETCH ? transport : undefined))
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  const actor = randomUUID(),
    token = randomBytes(32).toString('base64url');
  await pool.query(
    'INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)',
    [
      actor,
      `${actor}@example.test`,
      'Synthetic Copilot smoke',
      'fixture-not-for-login',
    ],
  );
  await pool.query(
    "INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [actor, tokenHash(token)],
  );
  const w = await app
    .get(WorkspacesService)
    .create(actor, 'Synthetic Copilot workspace');
  const p = await app
    .get(ProjectsService)
    .create(actor, {
      workspaceId: w.id,
      name: 'Synthetic Copilot project',
      baselineScope: '仅用于本地烟测的合成项目，不含真实客户资料。',
    });
  const r = await app
    .get(RequirementsService)
    .create(actor, p.id, {
      title: '合成需求：按状态筛选待办',
      originalText:
        '用户可按状态筛选待办列表。筛选后仅显示所选状态，清除筛选后恢复列表。',
    });
  const v = await app
    .get(RequirementsService)
    .revision(actor, r.id, {
      expectedVersion: 1,
      content: '按所选状态显示待办；清除后恢复列表。',
      acceptanceCriteria: ['无匹配项时显示空状态。'],
    });
  const snapshot = async () =>
    (
      await pool.query(
        `SELECT
    (SELECT jsonb_agg(r ORDER BY r.id) FROM requirements r WHERE r.project_id=$1) AS requirements,
    (SELECT jsonb_agg(v ORDER BY v.id) FROM requirement_revisions v JOIN requirements r ON r.id=v.requirement_id WHERE r.project_id=$1) AS revisions,
    (SELECT jsonb_agg(a ORDER BY a.id) FROM audit_events a WHERE a.project_id=$1) AS audit`,
        [p.id],
      )
    ).rows[0];
  const before = await snapshot();
  const response = await fetch(
    `${await app.getUrl()}/api/v1/projects/${p.id}/copilot/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
        'X-CSRF-Protection': '1',
        Cookie: `specbridge_session=${token}`,
      },
      body: JSON.stringify({
        message:
          '请用 get_requirement 读取当前页面需求及 Revision，说明当前状态、一个待核实的阻塞点和下一步人工操作。最终必须引用需求和 Revision 来源。',
        page: { kind: 'requirement', id: r.id, revisionId: v.id },
      }),
      signal: AbortSignal.timeout(65_000),
    },
  );
  assert.equal(response.status, 200);
  const result = copilotResponse.parse((await response.json()).data);
  assert.equal(result.projectId, p.id);
  assert.ok(
    result.sources.some((s) => s.id === r.id) &&
      result.sources.some((s) => s.id === v.id),
  );
  assert.deepEqual(await snapshot(), before);
  console.log(
    JSON.stringify({
      status: 'PASS',
      model: config.model,
      httpStatus: response.status,
      modelCalls: calls,
      toolCalls: result.context.toolCalls,
      sourceCount: result.sources.length,
      schemaValid: true,
      realVersionSources: true,
      domainUnchanged: true,
      reservedOutputTokens: reservedTokens,
      durationMs: Math.round(performance.now() - start),
    }),
  );
} catch {
  console.log(
    JSON.stringify({
      status: 'FAIL',
      reason:
        'Copilot smoke did not satisfy HTTP/schema/source/read-only checks; private details withheld.',
      modelCalls: calls,
      upstreamStatus,
      reservedOutputTokens: reservedTokens,
      durationMs: Math.round(performance.now() - start),
    }),
  );
  process.exitCode = 1;
} finally {
  await app?.close();
  await pool?.end();
}
