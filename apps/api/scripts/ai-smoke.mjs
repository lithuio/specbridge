// Explicit local opt-in only. The caller may load .env; this script never prints it.
import { AiConfig } from '../dist/ai/ai.config.js';
import { DeepseekProvider } from '../dist/ai/deepseek.provider.js';
if (process.env.CI || !process.argv.includes('--run') || !process.env.DEEPSEEK_API_KEY) {
  console.log('NOT RUN: local opt-in and a safely rotated server key are required.');
  process.exit(0);
}
process.env.DEEPSEEK_ENABLED = 'true';
process.env.DEEPSEEK_MAX_TOKENS = '2048';
process.env.DEEPSEEK_TIMEOUT_MS = '30000';
const start = performance.now();
try {
  const config = new AiConfig();
  const provider = new DeepseekProvider(config);
  const response = await provider.analyze(provider.messages({
    synthetic: true,
    originalText: '演示需求：用户可按状态筛选待办列表。筛选后仅显示所选状态，清除筛选后恢复列表。请指出缺少的边界条件。',
  }));
  console.log(JSON.stringify({ status: 'PASS', model: config.model, schemaValid: true,
    usage: response.usage, durationMs: Math.round(performance.now() - start) }));
} catch {
  console.log(JSON.stringify({ status: 'FAIL', reason: 'AI smoke did not produce a valid result; provider details withheld.', durationMs: Math.round(performance.now() - start) }));
  process.exitCode = 1;
}
