import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect, login, origin, writeHeaders } from "./fixtures";
import { accessibility } from "./accessibility";

const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence",
  "r08-b",
);
const original =
  "希望按月份导出项目需求，供团队每周核对范围。请先确认字段与权限。";
const adoptRevision = "确认采用，填写 Revision 草稿";
const analysisRoute = "**/api/v1/requirements/*/ai-analysis";
async function write(
  api: APIRequestContext,
  method: "post" | "put" | "patch",
  path: string,
  data: object,
  status = 201,
) {
  const response = await api[method](`/api/v1${path}`, {
    headers: writeHeaders,
    data,
  });
  expect(response.status()).toBe(status);
  return (await response.json()).data;
}
async function detail(api: APIRequestContext, id: string) {
  const response = await api.get(`/api/v1/requirements/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function project(page: Page) {
  const workspace = await write(page.request, "post", "/workspaces", {
    name: "青禾产品团队",
  });
  return write(page.request, "post", "/projects", {
    workspaceId: workspace.id,
    name: "青禾 · 需求协作门户",
    baselineScope: "需求协作与交付确认",
  });
}
async function setup(page: Page) {
  const p = await project(page);
  const r = await write(
    page.request,
    "post",
    `/projects/${p.id}/requirements`,
    { title: "按月导出项目需求", originalText: original },
  );
  await page.goto(`/app/projects/${p.id}/requirements/${r.id}`);
  await expect(
    page.getByRole("button", { name: "分析需求", exact: true }),
  ).toBeEnabled();
  return { p, r };
}
async function analyze(page: Page) {
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/ai-analysis"),
  );
  await page.getByRole("button", { name: "分析需求", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByRole("textbox", { name: "需求摘要", exact: true }),
  ).toBeVisible();
}

test("真实 Draft 入口 → 结构化审阅 → 人工采用 → R04 保存；桌面/手机证据", async ({
  page,
  accounts,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const p = await project(page);
  await page.goto(`/app/projects/${p.id}/requirements/new`);
  await page
    .getByRole("textbox", { name: "需求标题", exact: true })
    .fill("按月导出项目需求");
  await page
    .getByRole("textbox", { name: "需求原文", exact: true })
    .fill(original);
  await page.getByRole("button", { name: "创建需求", exact: true }).click();
  await expect(page).toHaveURL(/requirements\/[\da-f-]+$/);
  const id = page.url().split("/").at(-1)!;
  const before = await detail(page.request, id);
  await analyze(page);
  expect(await detail(page.request, id)).toEqual(before);
  const panel = page.getByRole("region", { name: "AI 需求分析", exact: true });
  for (const label of [
    "需求摘要",
    "澄清问题",
    "验收标准",
    "待确认假设",
    "风险提示",
  ])
    await expect(
      panel.getByRole("group", { name: label, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByRole("button", { name: adoptRevision }),
  ).toBeDisabled();
  await panel
    .getByRole("textbox", { name: "需求摘要", exact: true })
    .fill("按月导出当前项目需求，字段与权限由负责人核实。");
  await panel
    .getByRole("checkbox", { name: "选择需求摘要", exact: true })
    .check();
  await panel
    .getByRole("checkbox", { name: "选择验收标准 1", exact: true })
    .check();
  await panel
    .getByRole("textbox", { name: "验收标准 1", exact: true })
    .fill("选择月份后，仅导出当前项目该月的需求。");
  await panel
    .getByRole("button", { name: "删除验收标准 2", exact: true })
    .click();
  await panel
    .getByRole("textbox", { name: "待确认假设 1", exact: true })
    .fill("格式待客户确认，不能视为承诺。");
  await panel
    .getByRole("button", { name: "删除待确认假设 1", exact: true })
    .click();
  await expect(
    panel.locator("legend").filter({ hasText: "待确认假设" }),
  ).toBeFocused();
  const checks = [await accessibility(page, "ai-review-desktop")];
  await page.screenshot({
    path: resolve(evidence, "review-desktop.png"),
    fullPage: true,
  });
  await panel.evaluate((el) =>
    window.scrollTo({
      top: window.scrollY + el.getBoundingClientRect().top - 88,
      behavior: "instant",
    }),
  );
  await expect(
    panel.getByRole("textbox", { name: "需求摘要", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: resolve(evidence, "review-desktop-viewport.png"),
  });
  await page.getByRole("button", { name: adoptRevision }).click();
  const editor = page.getByRole("region", { name: "需求操作表单" });
  await expect(editor.getByRole("textbox", { name: "规格正文" })).toHaveValue(
    "按月导出当前项目需求，字段与权限由负责人核实。",
  );
  await expect(
    editor.getByRole("textbox", { name: "验收标准 1", exact: true }),
  ).toHaveValue("选择月份后，仅导出当前项目该月的需求。");
  expect(await detail(page.request, id)).toEqual(before);
  await editor
    .getByRole("textbox", { name: "规格正文" })
    .fill("人工确认：导出范围仅限当前项目及所选月份。");
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.scrollIntoViewIfNeeded();
  checks.push(await accessibility(page, "ai-human-review-mobile"));
  await page.screenshot({
    path: resolve(evidence, "confirm-mobile.png"),
    fullPage: true,
  });
  await editor.evaluate((el) =>
    el.scrollIntoView({ block: "end", behavior: "instant" }),
  );
  await expect(
    editor.getByRole("textbox", { name: "规格正文" }),
  ).toBeInViewport();
  await expect(
    editor.getByRole("button", { name: "保存为新 Revision" }),
  ).toBeInViewport();
  await page.screenshot({
    path: resolve(evidence, "confirm-mobile-viewport.png"),
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await editor.getByRole("button", { name: "保存为新 Revision" }).click();
  await expect(editor).toHaveCount(0);
  const after = await detail(page.request, id);
  expect(after.originalText).toBe(original);
  expect(after.latestRevision.content).toBe(
    "人工确认：导出范围仅限当前项目及所选月份。",
  );
  expect(after.latestRevision.acceptanceCriteria).toEqual([
    "选择月份后，仅导出当前项目该月的需求。",
  ]);
  expect(after.status).not.toBe("READY");
  await writeFile(
    resolve(evidence, "accessibility.json"),
    JSON.stringify(checks, null, 2),
  );
});

test("迟到分析不覆盖手动输入；来源 stale 与保存 409 均须重新人工核对", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { r } = await setup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let captured!: () => void;
  const ready = new Promise<void>((resolve) => {
    captured = resolve;
  });
  await page.route(analysisRoute, async (route) => {
    const response = await route.fetch();
    captured();
    await held;
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "分析需求", exact: true }).click();
  await ready;
  await expect(
    page.getByRole("status").filter({ hasText: "AI 正在分析" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "创建新 Revision", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "规格正文" })
    .fill("分析期间人工补充的正文");
  await write(
    page.request,
    "patch",
    `/requirements/${r.id}`,
    { expectedVersion: 1, title: "另一位成员已更新" },
    200,
  );
  release();
  await expect(
    page.getByRole("textbox", { name: "需求摘要", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "规格正文" })).toHaveValue(
    "分析期间人工补充的正文",
  );
  await expect(
    page.getByText(/需求已更新：建议核对版本 1，当前编辑版本 2/),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭表单" }).click();
  await page
    .getByRole("checkbox", { name: "选择需求摘要", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "选择验收标准 1", exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: adoptRevision }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "已核对来源与最新内容，继续使用建议" })
    .click();
  await page.getByRole("button", { name: adoptRevision }).click();
  await page
    .getByRole("textbox", { name: "规格正文" })
    .fill("人工审阅的保留输入");
  await write(
    page.request,
    "patch",
    `/requirements/${r.id}`,
    { expectedVersion: 2, title: "再次并发更新" },
    200,
  );
  const conflict = page.waitForResponse(
    (res) =>
      res.url().endsWith("/revisions") && res.request().method() === "POST",
  );
  await page.getByRole("button", { name: "保存为新 Revision" }).click();
  expect((await conflict).status()).toBe(409);
  await expect(page.getByText(/输入基于编辑版本 2，当前为 3/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "规格正文" })).toHaveValue(
    "人工审阅的保留输入",
  );
  await expect(
    page.getByRole("button", { name: "保存为新 Revision" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "已核对最新内容，使用当前版本" })
    .click();
  await page.getByRole("button", { name: "保存为新 Revision" }).click();
  await expect(page.getByRole("region", { name: "需求操作表单" })).toHaveCount(
    0,
  );
  expect((await detail(page.request, r.id)).latestRevision.revisionNo).toBe(1);
});

test("失败/超时/限流/格式错误可重试，保留原文并继续手动流程", async ({
  page,
  accounts,
}) => {
  test.setTimeout(90_000);
  await login(page, accounts.a);
  const { r } = await setup(page);
  const panel = page.getByRole("region", { name: "AI 需求分析", exact: true });
  for (const [status, code, message] of [
    [503, "AI_UNAVAILABLE", "AI 暂时不可用或服务响应超时"],
    [503, "AI_INVALID_RESPONSE", "AI 返回的分析格式无效"],
    [413, "PAYLOAD_TOO_LARGE", "分析材料过长"],
    [429, "RATE_LIMITED", "操作过于频繁"],
    [409, "STALE_VERSION", "内容已更新"],
  ] as const) {
    await page.route(analysisRoute, (route) =>
      route.fulfill({
        status,
        headers: { "retry-after": "2" },
        json: { error: { code } },
      }),
    );
    await panel
      .getByRole("button", { name: /^(分析需求|重试 AI 分析)$/ })
      .click();
    await expect(panel.getByRole("alert")).toContainText(message);
    if (status === 429) {
      await expect(
        panel.getByRole("button", { name: /秒后可重试/ }),
      ).toBeDisabled();
      await expect(
        panel.getByRole("button", { name: "重试 AI 分析" }),
      ).toBeEnabled();
    }
    await page.unroute(analysisRoute);
  }
  // The client has a bounded 35s wait even if the proxy never returns.
  await page.route(analysisRoute, async () => new Promise<void>(() => {}));
  await panel.getByRole("button", { name: "重试 AI 分析" }).click();
  await expect(panel.getByRole("alert")).toContainText("AI 分析等待超时", {
    timeout: 40_000,
  });
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await panel.getByRole("checkbox", { name: "包含已保存的澄清问答" }).uncheck();
  // A malformed success envelope must not crash the page or offer adoption.
  await page.route(analysisRoute, (route) =>
    route.fulfill({ json: { data: { result: { summary: "broken" } } } }),
  );
  await panel.getByRole("button", { name: "重试 AI 分析" }).click();
  await expect(panel.getByRole("alert")).toContainText("AI 返回的分析格式无效");
  await page.unroute(analysisRoute);
  await page.getByRole("button", { name: "编辑草稿", exact: true }).click();
  await page
    .getByRole("textbox", { name: "需求标题", exact: true })
    .fill("AI 不可用时仍可手动完成");
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await expect(page.getByRole("region", { name: "需求操作表单" })).toHaveCount(
    0,
  );
  expect((await detail(page.request, r.id)).originalText).toBe(original);
  const retried = page.waitForResponse((r) => r.url().endsWith("/ai-analysis"));
  await panel.getByRole("button", { name: "重试 AI 分析" }).click();
  expect((await retried).status()).toBe(200);
  expect((await retried).request().postDataJSON().includeClarifications).toBe(
    false,
  );
  await expect(
    panel.getByRole("textbox", { name: "需求摘要", exact: true }),
  ).toBeVisible();
});

test("Client 仅采用单条问题；纯文本建议不执行；撤权清除私有审阅", async ({
  page,
  accounts,
  browser,
}) => {
  await login(page, accounts.b);
  const { p, r } = await setup(page);
  await write(
    page.request,
    "put",
    `/projects/${p.id}/client`,
    { email: accounts.client.email },
    200,
  );
  const context = await browser.newContext({ baseURL: origin });
  const client = await context.newPage();
  try {
    await login(client, accounts.client);
    await client.goto(`/app/projects/${p.id}/requirements/${r.id}`);
    await analyze(client);
    await expect(
      client.getByRole("button", { name: adoptRevision }),
    ).toHaveCount(0);
    await client
      .getByRole("radio", { name: "选择澄清问题 1", exact: true })
      .check();
    await client
      .getByRole("radio", { name: "选择澄清问题 2", exact: true })
      .check();
    await expect(
      client.getByRole("radio", { name: "选择澄清问题 1", exact: true }),
    ).not.toBeChecked();
    const text =
      '<img src=x onerror="window.__aiExecuted=true"> 需要确认导出字段吗？';
    await client
      .getByRole("textbox", { name: "澄清问题 2", exact: true })
      .fill(text);
    await client
      .getByRole("button", { name: "确认采用，填写问题", exact: true })
      .click();
    await expect(
      client.getByRole("textbox", { name: "问题内容", exact: true }),
    ).toHaveValue(text);
    expect((await detail(client.request, r.id)).clarifications).toEqual([]);
    await client.getByRole("button", { name: "提交问题", exact: true }).click();
    await expect(
      client.getByRole("region", { name: "需求操作表单" }),
    ).toHaveCount(0);
    const current = await detail(client.request, r.id);
    expect(current.clarifications).toHaveLength(1);
    expect(current.clarifications[0].body).toBe(text);
    expect(current.latestRevision).toBeNull();
    expect(await client.evaluate(() => "__aiExecuted" in window)).toBe(false);
    await write(
      page.request,
      "put",
      `/projects/${p.id}/client`,
      { email: accounts.a.email },
      200,
    );
    await client.getByRole("button", { name: "刷新需求", exact: true }).click();
    await expect(
      client.getByRole("region", { name: "AI 需求分析", exact: true }),
    ).toHaveCount(0);
    await client.reload();
    await expect(
      client.getByRole("button", { name: "分析需求", exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("已有 Revision 为只读来源；未知保存结果保留输入且不重放", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.b);
  const { p, r } = await setup(page);
  const v1 = await write(
    page.request,
    "post",
    `/requirements/${r.id}/revisions`,
    {
      expectedVersion: 1,
      content: "已保存的第一版规格",
      acceptanceCriteria: ["原有验收标准必须保留"],
    },
  );
  await page.reload();
  await analyze(page);
  await expect(
    page.getByRole("link", { name: "查看来源 Revision" }),
  ).toHaveAttribute(
    "href",
    `/app/projects/${p.id}/requirements/${r.id}/revisions/${v1.id}`,
  );
  await page
    .getByRole("checkbox", { name: "选择验收标准 1", exact: true })
    .check();
  await page.getByRole("button", { name: adoptRevision }).click();
  const editor = page.getByRole("region", { name: "需求操作表单" });
  await expect(editor.getByRole("textbox", { name: "规格正文" })).toHaveValue(
    "已保存的第一版规格",
  );
  await expect(
    editor.getByRole("textbox", { name: "验收标准 1", exact: true }),
  ).toHaveValue("原有验收标准必须保留");
  let writes = 0;
  await page.route(
    `**/api/v1/requirements/${r.id}/revisions`,
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      writes++;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.fulfill({
        status: 503,
        json: { error: { code: "SERVICE_UNAVAILABLE" } },
      });
    },
  );
  await editor.getByRole("button", { name: "保存为新 Revision" }).click();
  await expect(editor.getByText(/操作结果未知，输入已保留/)).toBeVisible();
  await expect(
    editor.getByRole("button", { name: "保存为新 Revision" }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("textbox", { name: "验收标准 2", exact: true }),
  ).toHaveValue("选择月份后仅导出该月需求。");
  expect(writes).toBe(1);
  expect((await detail(page.request, r.id)).latestRevision.revisionNo).toBe(2);
  const immutable = await page.request.get(
    `/api/v1/requirements/${r.id}/revisions/${v1.id}`,
  );
  expect(immutable.status()).toBe(200);
  expect((await immutable.json()).data.content).toBe("已保存的第一版规格");
});

test("审阅编辑跨临时读取失败保留；切页取消生成；换项目与退出隔离 AI 状态", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.b);
  const { p, r } = await setup(page);
  const sibling = await write(
    page.request,
    "post",
    `/projects/${p.id}/requirements`,
    {
      title: "独立需求的审阅",
      originalText: "另一项需求，需要独立的澄清。",
    },
  );
  await analyze(page);
  const summary = page.getByRole("textbox", { name: "需求摘要", exact: true });
  await summary.fill("应保留的本地审阅输入");
  await page
    .getByRole("checkbox", { name: "选择需求摘要", exact: true })
    .check();
  const projectRoute = `**/api/v1/projects/${p.id}`;
  await page.route(projectRoute, (route) =>
    route.fulfill({
      status: 500,
      json: { error: { code: "SERVICE_UNAVAILABLE" } },
    }),
  );
  await page.getByRole("button", { name: "刷新项目", exact: true }).click();
  await expect(summary).toBeHidden();
  await expect(
    page.getByText(
      "暂时无法读取项目，未保存的输入已保留。重新加载成功后可继续操作。",
    ),
  ).toBeVisible();
  await page.unroute(projectRoute);
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(summary).toHaveValue("应保留的本地审阅输入");
  await expect(
    page.getByRole("checkbox", { name: "选择需求摘要", exact: true }),
  ).toBeChecked();
  const restored = page.waitForResponse((r) => r.url().endsWith("/api/v1/me"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  expect((await restored).status()).toBe(200);
  await expect(summary).toHaveValue("应保留的本地审阅输入");
  await page.getByRole("button", { name: "清空本次建议", exact: true }).click();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let received!: () => void;
  const captured = new Promise<void>((resolve) => {
    received = resolve;
  });
  await page.route(analysisRoute, async (route) => {
    const response = await route.fetch();
    received();
    await held;
    await route.fulfill({ response }).catch(() => undefined);
  });
  await page.getByRole("button", { name: "分析需求", exact: true }).click();
  await captured;
  await page.getByRole("link", { name: "← 项目需求", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${p.id}/requirements$`));
  release();
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "分析需求", exact: true }),
  ).toBeEnabled();
  await expect(summary).toHaveCount(0);
  await page.unroute(analysisRoute);
  const other = await project(page);
  await page.goto(`/app/projects/${other.id}/requirements/${r.id}`);
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "内容不存在",
  );
  await expect(
    page.getByRole("region", { name: "AI 需求分析", exact: true }),
  ).toHaveCount(0);
  await page.goto(`/app/projects/${p.id}/requirements/${r.id}`);
  await analyze(page);
  await summary.fill("退出后必须清除的建议");
  const firstId = await summary.getAttribute("id");
  const firstRadio = page.getByRole("radio", {
    name: "选择澄清问题 1",
    exact: true,
  });
  await firstRadio.check();
  const firstName = await firstRadio.getAttribute("name");
  await page.getByRole("link", { name: "← 项目需求", exact: true }).click();
  await page.locator(`a.requirement-row[href$="/${sibling.id}"]`).click();
  await analyze(page);
  expect(await summary.getAttribute("id")).not.toBe(firstId);
  expect(await firstRadio.getAttribute("name")).not.toBe(firstName);
  await expect(summary).not.toHaveValue("退出后必须清除的建议");
  await summary.fill("另一项需求的私有输入");
  await page
    .getByRole("radio", { name: "选择澄清问题 2", exact: true })
    .check();
  expect(
    (
      await page.request.post("/api/v1/auth/logout", { headers: writeHeaders })
    ).status(),
  ).toBe(204);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('textarea[id$="-ai-summary-0"]')).toHaveCount(0);
});
