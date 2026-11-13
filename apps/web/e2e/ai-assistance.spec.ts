import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect, login, writeHeaders, origin } from "./fixtures";
import { accessibility } from "./accessibility";

const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence",
  "ai-workflow-a",
);
const original = "希望按月份导出项目需求，先确认字段与权限。";
const route = "**/api/v1/requirements/*/ai-assistance";
async function write(api: APIRequestContext, path: string, data: object) {
  const response = await api.post(`/api/v1${path}`, {
    headers: writeHeaders,
    data,
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}
async function detail(page: Page, id: string) {
  const response = await page.request.get(`/api/v1/requirements/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function setup(page: Page) {
  const w = await write(page.request, "/workspaces", {
    name: "青禾 · 工作稿验收",
  });
  const p = await write(page.request, "/projects", {
    workspaceId: w.id,
    name: "需求导出",
    baselineScope: "本轮使用合成资料验证个人工作稿。",
  });
  await page.goto(`/app/projects/${p.id}/requirements/new`);
  await page
    .getByRole("textbox", { name: "需求标题", exact: true })
    .fill("按月份导出需求");
  await page
    .getByRole("textbox", { name: "需求原文", exact: true })
    .fill(original);
  await page.getByRole("button", { name: "创建需求", exact: true }).click();
  await expect(page).toHaveURL(/requirements\/[\da-f-]+$/);
  const id = page.url().split("/").at(-1)!;
  await expect(
    page.getByRole("button", { name: "生成澄清建议", exact: true }),
  ).toBeEnabled();
  return { p, id };
}
const clarify = (page: Page) => page.locator('[aria-label="澄清工作稿"]');
const specification = (page: Page) => page.locator('[aria-label="规格工作稿"]');
async function generate(page: Page, kind: "clarify" | "specification") {
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/ai-assistance"),
  );
  await page
    .getByRole("button", {
      name: kind === "clarify" ? "生成澄清建议" : "生成规格建议",
      exact: true,
    })
    .click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("region", { name: "AI 建议预览" })).toBeVisible();
}
async function save(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === "PUT" && r.url().includes("/working-drafts/"),
  );
  await page
    .getByRole("button", { name: "保存个人工作稿", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByText("个人工作稿已保存。项目问答、Revision 和业务状态未改变。"),
  ).toBeVisible();
}

test("独立澄清与规格：预览、编辑、跨刷新保存、部分发布；桌面手机键盘", async ({
  page,
  accounts,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const { id } = await setup(page),
    before = await detail(page, id);
  await generate(page, "clarify");
  expect(await detail(page, id)).toEqual(before);
  await expect(
    clarify(page).getByRole("textbox", { name: "问题 1", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "采用到当前工作稿" }).click();
  await clarify(page)
    .getByRole("textbox", { name: "问题 1", exact: true })
    .fill("请确认导出字段是否为标题、状态和负责人？");
  await save(page);
  expect(await detail(page, id)).toEqual(before);
  await page.reload();
  await expect(
    clarify(page).getByRole("textbox", { name: "问题 1", exact: true }),
  ).toHaveValue("请确认导出字段是否为标题、状态和负责人？");
  await clarify(page)
    .getByRole("checkbox", { name: "选择问题 1", exact: true })
    .check();
  const preview = page.getByRole("button", { name: "预览发布所选问题" });
  await preview.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "请确认正式发布内容" }),
  ).toBeFocused();
  await page.screenshot({
    path: resolve(evidence, "clarification-desktop.png"),
    fullPage: true,
  });
  const checks = [await accessibility(page, "clarification-desktop")];
  await page.getByRole("button", { name: "确认发布问题", exact: true }).click();
  await expect(
    page.getByText("已发布 1 个问题。其余工作稿已保留，可等待回答后继续。"),
  ).toBeVisible();
  const questions = await detail(page, id);
  expect(questions.clarifications).toHaveLength(1);
  expect(questions.latestRevision).toBeNull();
  expect(questions.originalText).toBe(original);
  await expect(
    clarify(page).getByRole("textbox", { name: "问题 2", exact: true }),
  ).toHaveValue("是否需要按状态筛选？");
  await page.getByRole("button", { name: "帮我整理规格", exact: true }).click();
  await generate(page, "specification");
  await page.getByRole("button", { name: "采用到当前工作稿" }).click();
  await specification(page)
    .getByRole("textbox", { name: "规格工作稿正文", exact: true })
    .fill("人工整理：按月份导出当前项目可见需求，字段仍待客户确认。");
  await save(page);
  expect((await detail(page, id)).latestRevision).toBeNull();
  await page.reload();
  await page.getByRole("button", { name: "帮我整理规格", exact: true }).click();
  await expect(
    specification(page).getByRole("textbox", { name: "规格工作稿正文" }),
  ).toHaveValue("人工整理：按月份导出当前项目可见需求，字段仍待客户确认。");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "预览创建 Revision" }).click();
  await page
    .getByRole("region", { name: "人工发布确认" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: resolve(evidence, "specification-mobile.png"),
    fullPage: true,
  });
  checks.push(await accessibility(page, "specification-mobile"));
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: resolve(evidence, "specification-320.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "确认创建 Revision", exact: true })
    .click();
  await expect(
    page.getByText("已由你确认创建正式 Revision。仍需在原流程中人工标记就绪。"),
  ).toBeVisible();
  const after = await detail(page, id);
  expect(after.latestRevision.revisionNo).toBe(1);
  expect(after.latestRevision.content).toContain("人工整理");
  expect(after.status).toBe("CLARIFYING");
  expect(after.originalText).toBe(original);
  await writeFile(
    resolve(evidence, "accessibility.json"),
    JSON.stringify(checks, null, 2),
  );
});

test("AI 故障不阻止手动提问，改写先预览且可保留原稿", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { id } = await setup(page);
  await clarify(page).getByRole("button", { name: "手动添加问题" }).click();
  await clarify(page)
    .getByRole("textbox", { name: "问题 1", exact: true })
    .fill("手写问题需要保留");
  await page.route(route, (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "AI_UNAVAILABLE" } }),
    }),
  );
  await page.getByRole("button", { name: "生成澄清建议" }).click();
  await expect(
    page.getByRole("region", { name: "需求工作台" }).getByRole("alert"),
  ).toContainText("暂时不可用");
  await expect(
    clarify(page).getByRole("textbox", { name: "问题 1", exact: true }),
  ).toHaveValue("手写问题需要保留");
  await save(page);
  await page.unroute(route);
  for (const [status, code, expected] of [
    [429, "RATE_LIMITED", "等待 2 秒"],
    [503, "AI_INVALID_RESPONSE", "格式无效"],
  ] as const) {
    await page.route(route, (routed) =>
      routed.fulfill({
        status,
        headers: { "Retry-After": "2" },
        contentType: "application/json",
        body: JSON.stringify({ error: { code } }),
      }),
    );
    await page.getByRole("button", { name: "生成澄清建议" }).click();
    await expect(clarify(page).getByRole("alert")).toContainText(expected);
    await page.unroute(route);
  }
  await page.evaluate(() => {
    const native = AbortSignal.timeout;
    AbortSignal.timeout = (ms) =>
      native.call(AbortSignal, ms === 35_000 ? 50 : ms);
  });
  await page.route(route, async (routed) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await routed.abort().catch(() => {});
  });
  await page.getByRole("button", { name: "生成澄清建议" }).click();
  await expect(clarify(page).getByRole("alert")).toContainText("等待超时");
  await page.unroute(route);
  // Restore the native duration for successful generation without reloading unsaved input.
  await page.evaluate(() => {
    const short = AbortSignal.timeout;
    AbortSignal.timeout = (ms) =>
      short.call(AbortSignal, ms === 35_000 ? 35_001 : ms);
  });
  await generate(page, "clarify");
  await page.getByRole("button", { name: "保留原稿，关闭建议" }).click();
  await expect(
    clarify(page).getByRole("textbox", { name: "问题 1", exact: true }),
  ).toHaveValue("手写问题需要保留");
  await clarify(page)
    .getByRole("checkbox", { name: "选择问题 1", exact: true })
    .check();
  await page.getByRole("button", { name: "预览发布所选问题" }).click();
  await page.getByRole("button", { name: "确认发布问题", exact: true }).click();
  await expect(
    page.getByText("已发布 1 个问题。其余工作稿已保留，可等待回答后继续。"),
  ).toBeVisible();
  expect((await detail(page, id)).clarifications[0].body).toBe(
    "手写问题需要保留",
  );
});

test("业务 409 与工作稿 CAS 均保留输入并要求人工核对", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { id } = await setup(page);
  await page.getByRole("button", { name: "帮我整理规格" }).click();
  await specification(page)
    .getByRole("textbox", { name: "规格工作稿正文" })
    .fill("冲突前的个人输入");
  await save(page);
  await write(page.request, `/requirements/${id}/clarifications`, {
    kind: "QUESTION",
    body: "另一位同事的新问题",
    expectedVersion: 1,
  });
  await page.getByRole("button", { name: "预览创建 Revision" }).click();
  await page.getByRole("button", { name: "确认创建 Revision" }).click();
  await expect(
    page.getByRole("region", { name: "需求工作台" }).getByRole("alert"),
  ).toContainText("内容已更新");
  await expect(
    specification(page).getByRole("textbox", { name: "规格工作稿正文" }),
  ).toHaveValue("冲突前的个人输入");
  await page.getByRole("button", { name: "已核对最新需求，继续编辑" }).click();
  await save(page);
  const current = (
    await (
      await page.request.get(`/api/v1/requirements/${id}/working-drafts`)
    ).json()
  ).data[0];
  const remote = await page.request.put(
    `/api/v1/requirements/${id}/working-drafts/specification`,
    {
      headers: writeHeaders,
      data: {
        kind: "specification",
        draftId: current.id,
        expectedDraftVersion: current.version,
        baseRequirementVersion: 2,
        body: { ...current.body, content: "另一个标签页保存的内容" },
      },
    },
  );
  expect(remote.status()).toBe(200);
  await specification(page)
    .getByRole("textbox", { name: "规格工作稿正文" })
    .fill("此标签页尚未保存的输入");
  await page.getByRole("button", { name: "保存个人工作稿" }).click();
  await expect(
    page.getByRole("region", { name: "需求工作台" }).getByRole("alert"),
  ).toContainText("其他页面更新");
  await page
    .getByRole("button", { name: "核对已保存工作稿，保留当前输入" })
    .click();
  await expect(
    page.getByText("另一个标签页保存的内容", { exact: true }),
  ).toBeVisible();
  await expect(
    specification(page).getByRole("textbox", { name: "规格工作稿正文" }),
  ).toHaveValue("此标签页尚未保存的输入");
  await page
    .getByRole("button", { name: "保留我的输入，基于此版本继续" })
    .click();
  await save(page);
  expect((await detail(page, id)).latestRevision).toBeNull();
});

test("响应丢失后查回执，不重复发布；手机布局不溢出", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { id } = await setup(page);
  await clarify(page).getByRole("button", { name: "手动添加问题" }).click();
  await clarify(page)
    .getByRole("textbox", { name: "问题 1", exact: true })
    .fill("仅发布一次的问题");
  await save(page);
  await clarify(page)
    .getByRole("checkbox", { name: "选择问题 1", exact: true })
    .check();
  await page.route("**/working-drafts/clarify/publish", async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "预览发布所选问题" }).click();
  await page.getByRole("button", { name: "确认发布问题", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "查询发布结果" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "查询发布结果" }).click();
  await expect(
    page.getByText("已发布 1 个问题。其余工作稿已保留，可等待回答后继续。"),
  ).toBeVisible();
  expect((await detail(page, id)).clarifications).toHaveLength(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("客户只见自己的澄清稿，删除个人稿保留已发布记录", async ({
  page,
  browser,
  accounts,
}) => {
  await login(page, accounts.a);
  const { p, id } = await setup(page);
  await clarify(page).getByRole("button", { name: "手动添加问题" }).click();
  await clarify(page)
    .getByRole("textbox", { name: "问题 1", exact: true })
    .fill("负责人私有的工作内容");
  await save(page);
  const bound = await page.request.put(`/api/v1/projects/${p.id}/client`, {
    headers: writeHeaders,
    data: { email: accounts.client.email },
  });
  expect(bound.status()).toBe(200);
  const context = await browser.newContext({ baseURL: origin });
  try {
    const client = await context.newPage();
    await login(client, accounts.client);
    await client.goto(`/app/projects/${p.id}/requirements/${id}`);
    await expect(
      client.getByRole("button", { name: "生成澄清建议" }),
    ).toBeEnabled();
    await expect(
      client.getByRole("button", { name: "帮我整理规格" }),
    ).toHaveCount(0);
    await expect(
      client.getByText("负责人私有的工作内容", { exact: true }),
    ).toHaveCount(0);
    await expect(
      clarify(client).getByRole("textbox", { name: "问题 1", exact: true }),
    ).toHaveCount(0);
    await clarify(client).getByRole("button", { name: "手动添加问题" }).click();
    await clarify(client)
      .getByRole("textbox", { name: "问题 1", exact: true })
      .fill("客户亲自提出的问题");
    await save(client);
    await clarify(client)
      .getByRole("checkbox", { name: "选择问题 1", exact: true })
      .check();
    await client.getByRole("button", { name: "预览发布所选问题" }).click();
    await client
      .getByRole("button", { name: "确认发布问题", exact: true })
      .click();
    await expect(
      client.getByText("已发布 1 个问题。其余工作稿已保留，可等待回答后继续。"),
    ).toBeVisible();
    await client
      .getByRole("button", { name: "删除个人工作稿", exact: true })
      .click();
    await client
      .getByRole("button", { name: "确认删除个人工作稿", exact: true })
      .click();
    await expect(
      client.getByText("个人工作稿已删除，正式记录保持不变。"),
    ).toBeVisible();
    expect((await detail(client, id)).clarifications).toHaveLength(1);
    await client.reload();
    await expect(
      client.getByRole("button", { name: "生成澄清建议" }),
    ).toBeEnabled();
    await expect(
      clarify(client).getByRole("textbox", { name: "问题 1", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      clarify(page).getByRole("textbox", { name: "问题 1", exact: true }),
    ).toHaveValue("负责人私有的工作内容");
  } finally {
    await context.close();
  }
});

test("会话复核取消在途 AI 并恢复按钮，保存响应未知时先核对服务端", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.b);
  await setup(page);
  await clarify(page).getByRole("button", { name: "手动添加问题" }).click();
  const field = clarify(page).getByRole("textbox", {
    name: "问题 1",
    exact: true,
  });
  await field.fill("会话复核期间保留的个人输入");
  async function suspend() {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/me", async (routed) => {
      const response = await routed.fetch();
      await held;
      await routed.fulfill({ response });
    });
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByText("正在恢复会话…", { exact: true }),
    ).toBeVisible();
    await expect(field).toBeHidden();
    release();
    await expect(field).toBeVisible();
    await page.unroute("**/api/v1/me");
  }
  for (const action of ["ai", "save"] as const) {
    let release!: () => void, entered!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const pattern = action === "ai" ? route : "**/working-drafts/clarify";
    await page.route(pattern, async (routed) => {
      const response = await routed.fetch();
      entered();
      await held;
      await routed.fulfill({ response }).catch(() => {});
    });
    await page
      .getByRole("button", {
        name: action === "ai" ? "生成澄清建议" : "保存个人工作稿",
        exact: true,
      })
      .click();
    await ready;
    await suspend();
    release();
    await page.unroute(pattern);
    await expect(field).toHaveValue("会话复核期间保留的个人输入");
    if (action === "ai") {
      await expect(
        page.getByRole("button", { name: "生成澄清建议" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("region", { name: "AI 建议预览" }),
      ).toHaveCount(0);
    } else {
      await page
        .getByRole("button", { name: "核对已保存工作稿，保留当前输入" })
        .click();
      await expect(
        page.getByRole("heading", { name: "服务端工作稿 v1" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "保留我的输入，基于此版本继续" })
        .click();
      await expect(
        page.getByRole("button", { name: "生成澄清建议" }),
      ).toBeEnabled();
      await expect(field).toHaveValue("会话复核期间保留的个人输入");
    }
  }
});
