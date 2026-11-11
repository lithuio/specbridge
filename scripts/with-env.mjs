import { spawn } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// Only local root commands opt in. API/CI tests never implicitly load .env.
const [envFile, command, ...args] = process.argv.slice(2);
if (!['.env', '.env.test'].includes(envFile) || !command) {
  console.error('Usage: node scripts/with-env.mjs <.env|.env.test> <command> [args...]');
  process.exit(1);
}

try {
  // Existing process variables take precedence, matching the migration runner.
  loadEnvFile(fileURLToPath(new URL(`../${envFile}`, import.meta.url)));
} catch {
  console.error(`Cannot load ${envFile}; create it from ${envFile}.example first.`);
  process.exit(1);
}

const child = spawn(command, args, { stdio: 'inherit', shell: false });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('error', () => {
  console.error('Cannot start the local command; check installed tools.');
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 143);
});
