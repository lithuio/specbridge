import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Each phase clears its run artifacts; keep cross-phase review evidence intact.
  outputDir: "./test-results/runs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    // Auth traces/HAR/storageState can contain passwords and session cookies.
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "node --experimental-strip-types ../../scripts/browser-stack.mjs",
    url: "http://127.0.0.1:3000/login",
    timeout: 120_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
  },
});
