// Playwright owns this process. Use only the existing isolated test DB and
// reviewed migrations; never read .env or reuse an already-running API/Web.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { testDatabaseUrl } from "../apps/api/src/database/database.config.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const apiDir = `${root}apps/api`;
const webDir = `${root}apps/web`;
const database = testDatabaseUrl(process.env.TEST_DATABASE_URL);
const common = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  NEXT_TELEMETRY_DISABLED: "1",
};
const children = [];
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children.toReversed()) {
    if (child.exitCode !== null || !child.pid) continue;
    await new Promise((resolve) => {
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill("SIGTERM");
    });
  }
  process.exit(code);
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
function start(args, cwd, env) {
  // Child logs can include HTTP input; do not pipe them into test evidence.
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...common, ...env },
    stdio: "ignore",
  });
  children.push(child);
  child.on("error", () => {
    console.error("Browser stack child failed to start.");
    void stop(1);
  });
  return child;
}
async function free(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
}
async function ready(child, url) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error("Startup failed");
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {
      /* startup retry only */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Startup timed out");
}
try {
  await free(4000);
  await free(3000);
  const migration = start(
    ["--experimental-strip-types", "scripts/migrate.mjs", "--test"],
    apiDir,
    { TEST_DATABASE_URL: database },
  );
  await new Promise((resolve, reject) =>
    migration.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Test DB unavailable or migration failed")),
    ),
  );
  const api = start([process.env.R08_AI_FIXTURE === "1" ? "scripts/browser-ai-fixture.mjs" : "dist/main.js"], apiDir, {
    NODE_ENV: "test",
    PORT: "4000",
    DATABASE_URL: database,
    AUTH_TRUSTED_ORIGINS: "http://127.0.0.1:3000",
    AUTH_TRUSTED_PROXIES: "loopback",
  });
  await ready(api, "http://127.0.0.1:4000/api/v1/health");
  const web = start(
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3000",
    ],
    webDir,
    { NODE_ENV: "production" },
  );
  await ready(web, "http://127.0.0.1:3000/login");
  console.log("Isolated browser stack ready (3000 → 4000 → test DB 5434).");
  for (const child of [api, web])
    child.once("exit", () => {
      if (!stopping) {
        console.error("Browser stack stopped unexpectedly.");
        void stop(1);
      }
    });
} catch {
  console.error(
    "Browser stack startup failed. Check free ports 3000/4000, run db:test:up, and verify the isolated test configuration. Child output withheld.",
  );
  await stop(1);
}
