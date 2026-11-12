import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { test, expect, login, writeHeaders } from "./fixtures";
import { accessibility } from "./accessibility";

const route = "**/api/v1/projects/*/copilot/messages";
const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence",
  "r08-c",
);
async function create(page: Page, path: string, data: object) {
  const r = await page.request.post(`/api/v1${path}`, {
    headers: writeHeaders,
    data,
  });
  expect(r.status()).toBe(201);
  return (await r.json()).data;
}
async function project(page: Page, name = "青禾 · 项目助手验证") {
  const w = await create(page, "/workspaces", { name: "青禾产品团队" });
  return create(page, "/projects", {
    workspaceId: w.id,
    name,
    baselineScope: "需求协作与交付确认",
  });
}
async function setup(page: Page) {
  const p = await project(page);
  const r = await create(page, `/projects/${p.id}/requirements`, {
    title: "按月导出项目需求",
    originalText: "项目成员需要按月份导出清单，避免跨项目泄露。",
  });
  const v = await create(page, `/requirements/${r.id}/revisions`, {
    expectedVersion: 1,
    content: "仅导出当前项目中可见的需求。",
    acceptanceCriteria: ["跨项目请求返回无权限。"],
  });
  await page.goto(`/app/projects/${p.id}/requirements/${r.id}`);
  return { p, r, v };
}
async function open(page: Page) {
  await page.getByRole("button", { name: "打开项目 Copilot" }).click();
  const drawer = page.getByRole("dialog", {
    name: "项目 Copilot",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  return drawer;
}
async function ask(page: Page, message: string) {
  const drawer = page.getByRole("dialog", {
    name: "项目 Copilot",
    exact: true,
  });
  await drawer.getByLabel("询问当前项目").fill(message);
  const done = page.waitForResponse((r) =>
    r.url().endsWith("/copilot/messages"),
  );
  await drawer.getByRole("button", { name: "发送", exact: true }).click();
  const r = await done;
  expect(r.status()).toBe(200);
  await expect(drawer.getByLabel("询问当前项目")).toHaveValue("");
  return r.json();
}

test("真实授权项目 → 多轮工具读取与版本来源；键盘、桌面和手机抽屉", async ({
  page,
  accounts,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const { p, r, v } = await setup(page);
  const before = await (
    await page.request.get(`/api/v1/requirements/${r.id}`)
  ).json();
  const drawer = await open(page);
  await drawer.getByLabel("询问当前项目").focus();
  for (const key of ["Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect
      .poll(() => drawer.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  await expect(drawer.getByText(p.name, { exact: true })).toBeVisible();
  await expect(
    drawer.getByText("当前页面：需求 · 详情", { exact: true }),
  ).toBeVisible();
  const first = await ask(page, "当前需求有什么阻塞点，下一步怎么做？");
  expect(first.data.context.toolCalls).toBeGreaterThan(0);
  expect(first.data.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: v.id, type: "revision" }),
    ]),
  );
  await expect(drawer.getByText("可能的阻塞点", { exact: true })).toBeVisible();
  const source = drawer.getByRole("link", { name: /Revision 1/ });
  await expect(source).toHaveAttribute(
    "href",
    `/app/projects/${p.id}/requirements/${r.id}/revisions/${v.id}`,
  );
  // The shared Button fades from disabled opacity 0.5 when the request ends.
  // Inspect the settled interactive state, not a frame during that transition.
  const clear = drawer.getByRole("button", { name: "清空对话", exact: true });
  await expect(clear).toBeEnabled();
  const transition = await clear.evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    animations: el.getAnimations().map((a) => a.playState),
  }));
  await expect(clear).toHaveCSS("opacity", "1");
  await writeFile(
    resolve(evidence, "button-transition.json"),
    JSON.stringify(
      {
        before: transition,
        settledOpacity: "1",
      },
      null,
      2,
    ) + "\n",
  );
  const checks = [await accessibility(page, "copilot-desktop")];
  await page.screenshot({ path: resolve(evidence, "desktop-copilot.png") });
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "打开项目 Copilot" }),
  ).toBeFocused();
  await open(page);
  await expect(drawer.getByText("本轮业务来源", { exact: true })).toBeVisible();
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/copilot/messages"),
  );
  await ask(page, "结合刚才的问题，应该先核实什么？");
  expect((await request).postDataJSON().history).toHaveLength(1);
  await expect(drawer.getByText(/结合上一轮问题/)).toBeVisible();
  // Link navigation preserves completed turns within a project, while checking the new page.
  await drawer
    .getByRole("link", { name: /Revision 1/ })
    .last()
    .click();
  await expect(page).toHaveURL(new RegExp(`/revisions/${v.id}$`));
  await open(page);
  await expect(
    drawer.getByText("当前页面：需求 · 历史版本", { exact: true }),
  ).toBeVisible();
  await expect(drawer.locator("article")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await drawer
    .locator(".copilot-scroll")
    .evaluate((el) =>
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" }),
    );
  await expect(drawer.getByLabel("询问当前项目")).toBeInViewport();
  checks.push(await accessibility(page, "copilot-mobile"));
  await page.screenshot({ path: resolve(evidence, "mobile-copilot.png") });
  await page.setViewportSize({ width: 320, height: 740 });
  checks.push(await accessibility(page, "copilot-320"));
  await writeFile(
    resolve(evidence, "accessibility.json"),
    JSON.stringify(checks, null, 2),
  );
  expect(
    await (await page.request.get(`/api/v1/requirements/${r.id}`)).json(),
  ).toMatchObject({ data: before.data });
});

test("不可用、限流、无效来源、超时和权限撤回；保留输入且手动流程正常", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { p, r } = await setup(page);
  const drawer = await open(page);
  const input = drawer.getByLabel("询问当前项目");
  await input.fill("失败后仍保留此问题");
  for (const status of [503, 429]) {
    await page.route(route, (r) =>
      r.fulfill({
        status,
        headers: status === 429 ? { "Retry-After": "2" } : {},
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: status === 429 ? "AI_RATE_LIMITED" : "AI_UNAVAILABLE",
          },
        }),
      }),
    );
    await drawer.getByRole("button", { name: /^(发送|重试发送)$/ }).click();
    await expect(drawer.getByRole("alert")).toContainText(
      status === 429 ? "等待 2 秒" : "暂时不可用",
    );
    await expect(input).toHaveValue("失败后仍保留此问题");
    await page.unroute(route);
  }
  await page.route(route, async (routed) => {
    const response = await routed.fetch(),
      json = await response.json();
    json.data.sources[0].href = "https://example.test/forged";
    await routed.fulfill({ response, json });
  });
  await drawer.getByRole("button", { name: "重试发送" }).click();
  await expect(drawer.getByRole("alert")).toContainText("无法验证");
  await expect(drawer.locator("article")).toHaveCount(0);
  await page.unroute(route);
  // Native AbortSignal.timeout is a browser timer; replace only its duration for this UI path.
  await page.evaluate(() => {
    const original = AbortSignal.timeout;
    AbortSignal.timeout = (ms) =>
      original.call(AbortSignal, ms === 65_000 ? 50 : ms);
  });
  await page.route(route, async (routed) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await routed.abort().catch(() => {});
  });
  await drawer.getByRole("button", { name: "重试发送" }).click();
  await expect(drawer.getByRole("alert")).toContainText("等待超时");
  await expect(input).toHaveValue("失败后仍保留此问题");
  await page.unroute(route);
  await page.route(route, (routed) =>
    routed.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "NOT_FOUND" } }),
    }),
  );
  await drawer.getByRole("button", { name: "重试发送" }).click();
  await expect(
    drawer.getByRole("button", { name: "重新核验权限" }),
  ).toBeVisible();
  await expect(input).not.toBeVisible();
  await page.keyboard.press("Escape");
  await page.unroute(route);
  await page.goto(`/app/projects/${p.id}/requirements/${r.id}`);
  await expect(
    page.getByRole("button", { name: "分析需求", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "创建新 Revision", exact: true }),
  ).toBeEnabled();
});

test("全局项目选择、空项目以及切换项目清空聊天", async ({ page, accounts }) => {
  await login(page, accounts.b);
  const p = await project(page, "空项目 · 北斗");
  const q = await project(page, "另一个项目 · 南山");
  await page.goto("/app");
  let drawer = await open(page);
  await expect(
    drawer.getByRole("heading", { name: "选择当前项目" }),
  ).toBeVisible();
  await drawer.getByRole("button", { name: p.name, exact: true }).click();
  const empty = await ask(page, "这个项目目前有哪些需求？");
  expect(
    empty.data.sources.every((s: { type: string }) => s.type === "project"),
  ).toBe(true);
  await drawer.getByRole("button", { name: "切换项目" }).click();
  await drawer.getByRole("button", { name: q.name, exact: true }).click();
  await expect(drawer.locator("article")).toHaveCount(0);
  await expect(
    drawer.getByText("从当前项目开始", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto(`/app/projects/${p.id}`);
  drawer = await open(page);
  await expect(drawer.locator("article")).toHaveCount(0);
});

test("关闭抽屉取消在途回答，迟到结果不能恢复；再次打开保留问题", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.b);
  await setup(page);
  const drawer = await open(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fetched = false;
  await page.route(route, async (routed) => {
    const response = await routed.fetch();
    fetched = true;
    await gate;
    await routed.fulfill({ response }).catch(() => {});
  });
  await drawer.getByLabel("询问当前项目").fill("取消后保留的合成问题");
  await drawer.getByRole("button", { name: "发送", exact: true }).click();
  await expect(drawer.getByRole("status")).toContainText("正在读取");
  await expect.poll(() => fetched).toBe(true);
  await page.keyboard.press("Escape");
  release();
  await page.unroute(route);
  await open(page);
  await expect(drawer.getByLabel("询问当前项目")).toHaveValue(
    "取消后保留的合成问题",
  );
  await expect(drawer.locator("article")).toHaveCount(0);
  await expect(
    drawer.getByRole("button", { name: "发送", exact: true }),
  ).toBeEnabled();
});
