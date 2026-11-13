// Local test adapter for the pinned official Inspector CLI. No credentials in
// OS argv, files or user configuration: construct its in-memory parser input
// from the isolated test environment, then discard that environment copy.
import { pathToFileURL } from 'node:url';

if (process.env.CI || process.env.R08_MCP_INSPECTOR_SMOKE !== '1') {
  console.error('Inspector smoke requires explicit local opt-in.');
  process.exit(1);
}
try {
  const entry = process.env.R08_MCP_INSPECTOR_ENTRY;
  const method = process.env.R08_INSPECTOR_METHOD;
  if (!entry || !['tools/list', 'tools/call'].includes(method))
    throw new Error('Invalid smoke configuration');
  const args = [
    process.execPath,
    entry,
    process.execPath,
    process.env.R08_MCP_ENTRY,
  ];
  for (const key of [
    'SPECBRIDGE_API_BASE_URL',
    'SPECBRIDGE_PROJECT_ID',
    'SPECBRIDGE_API_TOKEN',
  ]) {
    if (!process.env[key]) throw new Error('Missing smoke environment');
    args.push('-e', `${key}=${process.env[key]}`);
    delete process.env[key];
  }
  args.push('--method', method, '--format', 'json', '--stored-auth-only');
  if (method === 'tools/list') args.push('--strict');
  if (method === 'tools/call') {
    args.push('--tool-name', process.env.R08_INSPECTOR_TOOL);
    args.push('--tool-args-json', process.env.R08_INSPECTOR_ARGS ?? '{}');
  }
  const { runCli } = await import(pathToFileURL(entry).href);
  await runCli(args);
} catch {
  // Never forward third-party exception objects or configuration diagnostics.
  console.error('Inspector smoke failed; private diagnostics withheld.');
  process.exitCode = 1;
}
