import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { test, expect, login, writeHeaders, origin } from "./fixtures";
import { accessibility } from "./accessibility";
const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence",
  "ai-workflow-c",
);
async function create(page: Page, path: string, data: object) {
  const r = await page.request.post(`/api/v1${path}`, {
    headers: writeHeaders,
    data,
  });
  expect(r.status()).toBe(201);
  return (await r.json()).data;
}
async function setup(page: Page) {
  const w = await create(page, "/workspaces", { name: "青禾 · 提案验证" });
  const p = await create(page, "/projects", {
    workspaceId: w.id,
    name: "会员需求协作",
    baselineScope: "按月份导出当前项目中可见的需求。",
  });
  const r = await create(page, `/projects/${p.id}/requirements`, {
    title: "导出月份清单",
    originalText: "希望按月导出项目需求。字段尚待确认。",
  });
  await page.goto(`/app/projects/${p.id}/requirements/${r.id}`);
  return { p, r };
}
async function open(page: Page) {
  await page.getByRole("button", { name: "打开项目 Copilot" }).click();
  const d = page.getByRole("dialog", { name: "项目 Copilot", exact: true });
  const toggle = d.getByRole("button", { name: "准备操作与个人提案" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
  const tasks = d.getByRole("region", { name: "Copilot 人工确认任务" });
  await expect(tasks.getByLabel("选择需求")).toBeVisible();
  return { d, tasks };
}
async function prepare(page: Page) {
  const tasks = page.getByRole("region", { name: "Copilot 人工确认任务" });
  await tasks
    .getByRole("button", { name: "准备个人提案", exact: true })
    .click();
  await expect(tasks.getByRole("button", { name: "核对并继续" })).toBeVisible();
  return tasks;
}
async function confirm(page: Page) {
  const tasks = page.getByRole("region", { name: "Copilot 人工确认任务" });
  await tasks.getByRole("button", { name: "核对并继续" }).click();
  await tasks.getByRole("button", { name: "确认执行此提案" }).click();
}
async function detail(page: Page, id: string) {
  return (await (await page.request.get(`/api/v1/requirements/${id}`)).json())
    .data;
}
test("Copilot 预览、编辑与选择后才写业务；键盘与桌面手机证据", async ({
  page,
  accounts,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const { r } = await setup(page);
  const before = await detail(page, r.id);
  const { d } = await open(page);
  const tasks = await prepare(page);
  expect(await detail(page, r.id)).toEqual(before);
  await tasks
    .getByLabel("问题 1", { exact: true })
    .fill("人工确认：导出清单包含哪些字段？");
  await tasks.getByLabel("采用问题 2", { exact: true }).uncheck();
  await expect(
    tasks.getByRole("button", { name: "核对并继续" }),
  ).toBeDisabled();
  await tasks.getByRole("button", { name: "保存预览修改" }).click();
  await expect(tasks.getByRole("button", { name: "核对并继续" })).toBeEnabled();
  await page.getByRole("button", { name: "关闭 Copilot" }).click();
  await page.getByRole("button", { name: "打开项目 Copilot" }).click();
  await expect(tasks.getByLabel("问题 1", { exact: true })).toHaveValue(
    "人工确认：导出清单包含哪些字段？",
  );
  const next = tasks.getByRole("button", { name: "核对并继续" });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(
    tasks.getByRole("region", { name: "确认提案执行" }),
  ).toBeVisible();
  expect(await detail(page, r.id)).toEqual(before);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => d.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  const checks = [await accessibility(page, "proposal-desktop")];
  await page.screenshot({ path: resolve(evidence, "proposal-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => d.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
    .toBe(true);
  checks.push(await accessibility(page, "proposal-mobile"));
  await page.screenshot({ path: resolve(evidence, "proposal-mobile.png") });
  await tasks.getByRole("button", { name: "确认执行此提案" }).click();
  await expect(
    tasks.getByText("已完成人工确认操作，回执已保存。"),
  ).toBeVisible();
  const after = await detail(page, r.id);
  expect(after.draftVersion).toBe(before.draftVersion + 1);
  expect(after.status).toBe("CLARIFYING");
  expect(after.latestRevision).toBeNull();
  expect(after.originalText).toBe(before.originalText);
  await writeFile(
    resolve(evidence, "accessibility.json"),
    JSON.stringify(checks, null, 2) + "\n",
  );
});
test("409 保留预览；响应丢失先查回执，关闭重开不会重复执行", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { r } = await setup(page);
  await open(page);
  const tasks = await prepare(page);
  await tasks.getByLabel("问题 1", { exact: true }).fill("需要保留的人工编辑");
  await tasks.getByRole("button", { name: "保存预览修改" }).click();
  await expect(tasks.getByRole("button", { name: "核对并继续" })).toBeEnabled();
  await create(page, `/requirements/${r.id}/clarifications`, {
    kind: "QUESTION",
    body: "其他窗口已添加",
    expectedVersion: 1,
  });
  await confirm(page);
  await expect(
    tasks.getByText("内容已更新，请保留输入并核对最新版后再操作。"),
  ).toBeVisible();
  await expect(tasks.getByLabel("问题 1", { exact: true })).toHaveValue(
    "需要保留的人工编辑",
  );
  await tasks
    .getByRole("button", { name: "返回任务列表", exact: true })
    .click();
  await expect(tasks.getByText(/业务版本 2/)).toBeVisible();
  await prepare(page);
  let calls = 0;
  await page.route("**/copilot-proposals/*/execute", async (route) => {
    calls++;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort("failed");
  });
  await confirm(page);
  await expect(
    tasks.getByRole("button", { name: "核对服务器记录" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭 Copilot" }).click();
  await page.getByRole("button", { name: "打开项目 Copilot" }).click();
  await tasks.getByRole("button", { name: "核对服务器记录" }).click();
  await expect(
    tasks.getByText("已完成人工确认操作，回执已保存。"),
  ).toBeVisible();
  expect(calls).toBe(1);
  expect((await detail(page, r.id)).draftVersion).toBe(4);
});
test("商业预览保留待确认金额；人工创建和更新始终是草稿", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { p, r } = await setup(page);
  const revision = await create(page, `/requirements/${r.id}/revisions`, {
    expectedVersion: 1,
    content: "仅当前项目导出",
    acceptanceCriteria: ["跨项目拒绝"],
  });
  const ready = await page.request.post(
    `/api/v1/requirements/${r.id}/mark-ready`,
    { headers: writeHeaders, data: { expectedVersion: revision.draftVersion } },
  );
  expect(ready.status()).toBe(200);
  const { tasks } = await open(page);
  await tasks.getByLabel("准备任务").selectOption("create_change_draft");
  await prepare(page);
  await expect(tasks.getByLabel("估算工时（未确认可留空）")).toHaveValue("");
  await tasks.getByLabel("估算工时（未确认可留空）").fill("2.5");
  await tasks.getByLabel("成本变化（最小货币单位）").fill("1000");
  await tasks.getByLabel("币种（如 CNY）").fill("CNY");
  await tasks.getByRole("button", { name: "保存预览修改" }).click();
  await expect(tasks.getByRole("button", { name: "核对并继续" })).toBeEnabled();
  await confirm(page);
  await expect(
    tasks.getByText("已完成人工确认操作，回执已保存。"),
  ).toBeVisible();
  const list = (
    await (
      await page.request.get(`/api/v1/projects/${p.id}/change-requests`)
    ).json()
  ).data;
  expect(list).toHaveLength(1);
  expect(list[0].status).toBe("DRAFT");
  await tasks
    .getByRole("button", { name: "返回任务列表", exact: true })
    .click();
  await expect(tasks.getByLabel("准备任务")).toBeVisible();
  await tasks.getByLabel("准备任务").selectOption("update_change_draft");
  await tasks.getByLabel("待更新商业草稿").selectOption(list[0].id);
  await prepare(page);
  await tasks
    .getByLabel("商业范围", { exact: true })
    .fill("人工调整的商业草稿范围");
  await tasks.getByRole("button", { name: "保存预览修改" }).click();
  await expect(tasks.getByRole("button", { name: "核对并继续" })).toBeEnabled();
  await confirm(page);
  await expect(
    tasks.getByText("已完成人工确认操作，回执已保存。"),
  ).toBeVisible();
  const c = (
    await (
      await page.request.get(`/api/v1/change-requests/${list[0].id}`)
    ).json()
  ).data;
  expect(c.status).toBe("DRAFT");
  expect(c.draft.scopeSummary).toBe("人工调整的商业草稿范围");
  expect(c.activeVersion).toBeNull();
});
test("AI 故障后本人工作稿仍可用；Client 仅可准备问题", async ({
  page,
  accounts,
  browser,
}) => {
  await login(page, accounts.a);
  const { p, r } = await setup(page);
  await page.request.put(`/api/v1/projects/${p.id}/client`, {
    headers: writeHeaders,
    data: { email: accounts.client.email },
  });
  const saved = await page.request.put(
    `/api/v1/requirements/${r.id}/working-drafts/clarify`,
    {
      headers: writeHeaders,
      data: {
        kind: "clarify",
        draftId: null,
        expectedDraftVersion: 0,
        baseRequirementVersion: 1,
        body: {
          questions: [
            {
              id: crypto.randomUUID(),
              body: "我保存的工作问题",
              reason: "待确认",
            },
          ],
          assumptions: [],
          risks: [],
        },
      },
    },
  );
  expect(saved.status()).toBe(200);
  const { tasks } = await open(page);
  await page.route("**/copilot-proposals", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().postDataJSON().source === "generate"
    )
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "AI_UNAVAILABLE", message: "Unavailable" },
        }),
      });
    else await route.continue();
  });
  await tasks
    .getByRole("button", { name: "准备个人提案", exact: true })
    .click();
  await tasks.getByRole("button", { name: "核对服务器记录" }).click();
  await expect(
    tasks.getByRole("button", { name: "准备个人提案", exact: true }),
  ).toBeEnabled();
  await tasks.getByLabel("内容来源").selectOption("working_draft");
  await prepare(page);
  await expect(tasks.getByLabel("问题 1", { exact: true })).toHaveValue(
    "我保存的工作问题",
  );
  await confirm(page);
  await expect(
    tasks.getByText("已完成人工确认操作，回执已保存。"),
  ).toBeVisible();
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: 390, height: 844 },
  });
  const client = await context.newPage();
  await login(client, accounts.client);
  await client.goto(`/app/projects/${p.id}/requirements/${r.id}`);
  const clientView = await open(client);
  await expect(
    clientView.tasks.getByLabel("准备任务").locator("option"),
  ).toHaveCount(1);
  await expect(
    clientView.tasks.getByText("尚无提案。原手动编辑流程始终可用。"),
  ).toBeVisible();
  await context.close();
});
