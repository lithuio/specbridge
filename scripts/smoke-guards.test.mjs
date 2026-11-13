import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const canary = "synthetic-ci-guard-not-a-credential";
const cases = [
  ["ai-smoke.mjs", 0, /^NOT RUN:/],
  ["copilot-smoke.mjs", 0, /^NOT RUN:/],
  ["browser-ai-real.mjs", 1, /requires local opt-in/],
  ["mcp-inspector-smoke.mjs", 1, /requires explicit local opt-in/],
];
for (const [script, code, message] of cases) {
  test(`${script} refuses real service execution in CI even with opt-in`, () => {
    const child = spawnSync(
      process.execPath,
      [`apps/api/scripts/${script}`, "--run"],
      {
        cwd: root,
        env: {
          PATH: process.env.PATH,
          CI: "true",
          NODE_ENV: "test",
          R08_REAL_PROVIDER: "1",
          R08_MCP_INSPECTOR_SMOKE: "1",
          DEEPSEEK_API_KEY: canary,
          SPECBRIDGE_API_TOKEN: canary,
        },
        encoding: "utf8",
        timeout: 10000,
        maxBuffer: 65536,
      },
    );
    assert.equal(child.status, code);
    const output = child.stdout + child.stderr;
    assert.equal(output.includes(canary), false);
    assert.match(output, message);
  });
}
