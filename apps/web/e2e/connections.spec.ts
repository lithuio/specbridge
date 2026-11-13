import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { test, expect, login, writeHeaders } from "./fixtures";
import { accessibility } from "./accessibility";
import type { Page } from "@playwright/test";

const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence",
  "ai-workflow-d",
);
const cli = resolve("../mcp/dist/connect/cli.js");
async function project(page: Page) {
  const w = await page.request.post("/api/v1/workspaces", {
    headers: writeHeaders,
    data: { name: "连接验收团队" },
  });
  expect(w.status()).toBe(201);
  const p = await page.request.post("/api/v1/projects", {
    headers: writeHeaders,
    data: {
      workspaceId: (await w.json()).data.id,
      name: "青禾 · 本地开发助手",
      baselineScope: "只读批准规格，人工决定实施范围",
    },
  });
  expect(p.status()).toBe(201);
  return (await p.json()).data.id as string;
}
function launch(args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, [cli, ...args], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "",
    errors = "";
  child.stdout.on("data", (chunk: Buffer) => {
    if (output.length < 16384) output += chunk.toString();
    else child.kill();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    if (errors.length < 16384) errors += chunk.toString();
    else child.kill();
  });
  const done = new Promise<number | null>((r, reject) => {
    child.once("close", r);
    child.once("error", () => reject(new Error("Installer could not start")));
  });
  return { child, done, output: () => output, errors: () => errors };
}
test("真实网页确认→CLI兑换→私有凭据→stdio MCP/API；重连、撤销和卸载", async ({
  page,
  accounts,
}) => {
  test.setTimeout(75000);
  await login(page, accounts.a);
  const projectId = await project(page);
  const root = await mkdtemp(join(tmpdir(), "specbridge-browser-connect-"));
  const workspace = join(root, "workspace"),
    vault = join(root, "private");
  await mkdir(join(workspace, ".codex"), { recursive: true });
  const original =
    '# preserve existing settings\nmodel = "chosen-model"\n[mcp_servers.unrelated]\ncommand = "existing-command"\n';
  await writeFile(join(workspace, ".codex/config.toml"), original, {
    mode: 0o600,
  });
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: "test",
  };
  if (process.env.CI) {
    // CI tests the installer/MCP chain, not a paid Codex Host. Only version preflight is a fixture.
    const bin = join(root, "bin");
    await mkdir(bin);
    await writeFile(
      join(bin, "codex"),
      '#!/bin/sh\n[ "$1" = "--version" ] || exit 1\necho "codex-cli CI-version-fixture"\n',
      { mode: 0o700 },
    );
    env.PATH = bin + ":" + (process.env.PATH ?? "");
  }
  const args = [
    "--api-origin",
    "http://127.0.0.1:3000",
    "--web-origin",
    "http://127.0.0.1:3000",
    "--project",
    projectId,
    "--workspace",
    workspace,
    "--credential-dir",
    vault,
    "--no-browser",
  ];
  const installation = launch(args, env);
  try {
    await expect
      .poll(() =>
        /http:\/\/127\.0\.0\.1:\d+\/start/.test(installation.output()),
      )
      .toBe(true);
    const start = installation
      .output()
      .match(/http:\/\/127\.0\.0\.1:\d+\/start/)![0];
    await page.goto(start);
    await expect(
      page.getByRole("heading", { name: "授权本地 Codex 连接" }),
    ).toBeVisible();
    await expect.poll(() => new URL(page.url()).hash).toBe("");
    const confirm = page.getByRole("button", { name: "确认授权并返回安装器" });
    await expect(confirm).toBeDisabled();
    await mkdir(evidence, { recursive: true });
    const checks = [await accessibility(page, "connect-desktop")];
    await page.screenshot({
      path: join(evidence, "desktop-confirm.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    checks.push(await accessibility(page, "connect-mobile"));
    await page.screenshot({
      path: join(evidence, "mobile-confirm.png"),
      fullPage: true,
    });
    await page.getByLabel("有效天数").fill("1");
    await page.getByRole("checkbox").focus();
    await page.keyboard.press("Space");
    await expect(confirm).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");
    expect(await installation.done).toBe(0);
    expect(installation.output()).toContain("连接成功，暂无批准规格");
    expect(installation.errors()).toBe("");
    const files = await readdir(vault);
    const credentialFile = files.find(
      (f) => f.endsWith(".json") && !f.endsWith(".install.json"),
    )!;
    const credential = JSON.parse(
      await readFile(join(vault, credentialFile), "utf8"),
    ) as { token: string; tokenId: string };
    const config = await readFile(
      join(workspace, ".codex/config.toml"),
      "utf8",
    );
    const skill = await readFile(
      join(workspace, ".agents/skills/requirement-analyst/SKILL.md"),
      "utf8",
    );
    expect(config.startsWith(original)).toBe(true);
    for (const text of [
      config,
      skill,
      installation.output(),
      installation.errors(),
      page.url(),
      await page.content(),
    ])
      expect(text.includes(credential.token)).toBe(false);
    expect((await stat(vault)).mode & 0o777).toBe(0o700);
    expect((await stat(join(vault, credentialFile))).mode & 0o777).toBe(0o600);
    const repeated = launch(args, env);
    expect(await repeated.done).toBe(0);
    expect(repeated.output()).toContain("未创建新Token");
    await page.goto(`/app/projects/${projectId}/api-tokens`);
    await expect(page.getByText("已发放凭据", { exact: true })).toBeVisible();
    await page
      .getByLabel("SpecBridge 仓库绝对路径")
      .fill("/home/me/specbridge");
    await page.getByLabel("目标代码目录绝对路径").fill("/home/me/my-project");
    await page.getByRole("button", { name: "生成连接命令" }).click();
    await expect(
      page.getByRole("button", { name: "复制连接命令" }),
    ).toBeVisible();
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "复制连接命令" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "已复制，可在本地终端执行。",
    );
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain(projectId);
    expect(copied).not.toContain(credential.token);
    await page.setViewportSize({ width: 320, height: 740 });
    checks.push(await accessibility(page, "connect-manager-320"));
    await page.screenshot({
      path: join(evidence, "mobile-manager.png"),
      fullPage: true,
    });
    await page
      .getByLabel("目标代码目录绝对路径")
      .fill("/home/me/another-project");
    await expect(
      page.getByRole("button", { name: "复制连接命令" }),
    ).toHaveCount(0);
    await expect(page.getByText("已复制，可在本地终端执行。")).toHaveCount(0);
    const tokens = await page.request.get(
      `/api/v1/projects/${projectId}/api-tokens`,
    );
    expect((await tokens.json()).data).toHaveLength(1);
    expect(
      (
        await page.request.delete(`/api/v1/api-tokens/${credential.tokenId}`, {
          headers: writeHeaders,
        })
      ).status(),
    ).toBe(204);
    const denied = launch([...args, "--status"], env);
    expect(await denied.done).toBe(1);
    expect((denied.output() + denied.errors()).includes(credential.token)).toBe(
      false,
    );
    const removal = launch([...args, "--uninstall"], env);
    expect(await removal.done).toBe(0);
    expect(await readFile(join(workspace, ".codex/config.toml"), "utf8")).toBe(
      original,
    );
    expect(await readdir(vault)).toHaveLength(0);
    await writeFile(
      join(evidence, "accessibility.json"),
      JSON.stringify(checks, null, 2) + "\n",
    );
  } finally {
    if (installation.child.exitCode === null) {
      installation.child.kill("SIGTERM");
      await installation.done;
    }
    const tokens = await page.request.get(
      `/api/v1/projects/${projectId}/api-tokens`,
    );
    if (tokens.ok())
      for (const t of (await tokens.json()).data as { id: string }[])
        await page.request.delete(`/api/v1/api-tokens/${t.id}`, {
          headers: writeHeaders,
        });
    await rm(root, { recursive: true, force: true });
  }
});
function fragment() {
  return new URLSearchParams({
    grantId: randomUUID(),
    challenge: randomBytes(32).toString("base64url"),
    challengeMethod: "S256",
    state: randomBytes(32).toString("base64url"),
    callbackPort: "49152",
  }).toString();
}
test("无效与拒绝不发放；结果未知先查状态并取消，刷新不重放", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const id = await project(page);
  const target = `/app/projects/${id}/agent-connect`;
  await page.goto(target + "#code=invalid");
  await expect(page.getByText(/连接信息无效、已丢失/)).toBeVisible();
  await page.goto(target + "#" + fragment());
  await page.reload();
  await expect(page.getByRole("button", { name: "拒绝连接" })).toBeVisible();
  await page.getByRole("button", { name: "拒绝连接" }).click();
  await expect(page.getByText(/已拒绝，未创建授权/)).toBeVisible();
  expect(
    (
      await (
        await page.request.get(`/api/v1/projects/${id}/agent-connections`)
      ).json()
    ).data,
  ).toHaveLength(0);
  await page.goto("/app");
  await page.goto(target + "#" + fragment());
  await page.route(
    `**/api/v1/projects/${id}/agent-connections`,
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch();
      await route.abort("failed");
    },
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "确认授权并返回安装器" }).click();
  await expect(
    page.getByRole("button", { name: "核对授权记录" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "确认授权并返回安装器" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "核对授权记录" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "等待安装器兑换" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText(/连接信息无效、已丢失/)).toBeVisible();
  await page.getByRole("link", { name: "返回访问凭据与连接记录" }).click();
  await page.getByRole("button", { name: "取消此连接授权" }).click();
  await expect(page.getByText("已取消", { exact: true })).toBeVisible();
  expect(
    (await (await page.request.get(`/api/v1/projects/${id}/api-tokens`)).json())
      .data,
  ).toHaveLength(0);
});
