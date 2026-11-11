import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect, login, origin, writeHeaders } from "./fixtures";

const evidence = resolve(process.cwd(), process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence", "r07-e");
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
async function refresh(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      /\/api\/v1\/requirements\/[\da-f-]+$/.test(r.url()) &&
      r.request().method() === "GET",
  );
  await page.getByRole("button", { name: "刷新需求", exact: true }).click();
  expect((await response).status()).toBe(200);
}
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "已保存，当前需求已更新" }),
  ).toBeVisible();
}

test("Client 创建/草稿冲突，Developer 问答→不可变 Revision→Ready，权限与历史深链接", async ({
  page,
  accounts,
  browser,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const workspace = await write(page.request, "post", "/workspaces", {
    name: "青禾产品团队",
  });
  const project = await write(page.request, "post", "/projects", {
    workspaceId: workspace.id,
    name: "青禾 · 客户协作门户",
    baselineScope: "统一客户需求入口与交付确认。",
  });
  const member = await write(
    page.request,
    "post",
    `/workspaces/${workspace.id}/members`,
    { email: accounts.b.email },
  );
  await write(page.request, "post", `/projects/${project.id}/members`, {
    userId: member.userId,
    role: "DEVELOPER",
  });
  await write(
    page.request,
    "put",
    `/projects/${project.id}/client`,
    { email: accounts.client.email },
    200,
  );
  const developerContext = await browser.newContext({ baseURL: origin });
  const clientContext = await browser.newContext({ baseURL: origin });
  const developer = await developerContext.newPage();
  const client = await clientContext.newPage();
  const errors: string[] = [];
  for (const actor of [developer, client])
    actor.on("pageerror", (e) => errors.push(e.name));
  try {
    await login(developer, accounts.b);
    await login(client, accounts.client);
    const list = `/app/projects/${project.id}/requirements`;
    await client.goto(list);
    await expect(client.getByText("还没有需求", { exact: true })).toBeVisible();
    await client.getByRole("link", { name: "创建需求", exact: true }).click();
    await client.getByRole("button", { name: "创建需求", exact: true }).click();
    await expect(
      client.getByText("请填写需求标题", { exact: true }),
    ).toBeVisible();
    await client
      .getByRole("textbox", { name: "需求标题", exact: true })
      .fill("客户需求导出");
    await client
      .getByRole("textbox", { name: "需求原文", exact: true })
      .fill(
        "希望导出项目需求，方便每周对照范围。\n保留中文与换行。<script>不可执行</script>",
      );
    await client.getByRole("button", { name: "创建需求", exact: true }).click();
    await expect(client).toHaveURL(/requirements\/[\da-f-]+$/);
    const id = client.url().split("/").at(-1)!;
    const url = `${list}/${id}`;
    await expect(
      client.getByRole("button", { name: "编辑草稿" }),
    ).toBeVisible();
    await client.goBack();
    await expect(
      client.getByRole("textbox", { name: "需求标题", exact: true }),
    ).toHaveValue("");
    await expect(
      client.getByRole("button", { name: "创建需求", exact: true }),
    ).toBeEnabled();
    await client.goForward();
    await expect(
      client.getByRole("button", { name: "编辑草稿" }),
    ).toBeVisible();
    await client.getByRole("button", { name: "编辑草稿" }).click();
    await client
      .getByRole("textbox", { name: "需求标题", exact: true })
      .fill("按月份导出需求");
    await write(
      page.request,
      "patch",
      `/requirements/${id}`,
      { expectedVersion: 1, title: "负责人已更新标题" },
      200,
    );
    let edits = 0;
    client.on("request", (r) => {
      if (r.method() === "PATCH" && r.url().endsWith(`/requirements/${id}`))
        edits++;
    });
    const stale = client.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" &&
        r.url().endsWith(`/requirements/${id}`),
    );
    await client.getByRole("button", { name: "保存草稿" }).click();
    expect((await stale).status()).toBe(409);
    await expect(client.getByRole("alert", { name: "请求错误" })).toContainText(
      "内容已更新",
    );
    await expect(
      client.getByRole("textbox", { name: "需求标题", exact: true }),
    ).toHaveValue("按月份导出需求");
    await expect(
      client.getByRole("heading", { name: "负责人已更新标题", exact: true }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "保存草稿" }),
    ).toBeDisabled();
    expect(edits).toBe(1);
    await client
      .getByRole("button", { name: "已核对最新内容，使用当前版本" })
      .click();
    await client.getByRole("button", { name: "保存草稿" }).click();
    await saved(client);
    expect(edits).toBe(2);
    await page.goto(url);
    await expect(page.getByRole("button", { name: "编辑草稿" })).toBeVisible(); // Owner can edit another author's DRAFT.
    await developer.goto(url);
    await expect(
      developer.getByRole("heading", { name: "按月份导出需求" }),
    ).toBeVisible();
    await expect(
      developer.getByRole("button", { name: "编辑草稿" }),
    ).toHaveCount(0);
    await write(
      developer.request,
      "patch",
      `/requirements/${id}`,
      { expectedVersion: 3, title: "不能越权编辑" },
      403,
    );
    await expect(
      client.getByRole("button", { name: "创建新 Revision", exact: true }),
    ).toHaveCount(0);
    await expect(
      client.getByRole("button", { name: "标记就绪", exact: true }),
    ).toHaveCount(0);
    await write(
      client.request,
      "post",
      `/requirements/${id}/revisions`,
      {
        expectedVersion: 3,
        content: "不能创建",
        acceptanceCriteria: ["不能创建"],
      },
      403,
    );
    await write(
      client.request,
      "post",
      `/requirements/${id}/mark-ready`,
      { expectedVersion: 3 },
      403,
    );

    await developer
      .getByRole("button", { name: "提出问题", exact: true })
      .click();
    await developer
      .getByLabel("问题内容")
      .fill("导出文件需要包含哪些字段？月份按什么时间筛选？");
    await developer.getByRole("button", { name: "提交问题" }).click();
    await saved(developer);
    await refresh(client);
    await expect(client.getByRole("button", { name: "编辑草稿" })).toHaveCount(
      0,
    );
    await client
      .getByRole("button", { name: "回答问题 1", exact: true })
      .click();
    await client
      .getByLabel("回答内容")
      .fill(
        "包含标题、状态与最新规格编号；按需求创建月份筛选，导出 UTF-8 CSV。 ",
      );
    await client.getByRole("button", { name: "提交回答" }).click();
    await saved(client);
    await refresh(developer);
    await expect(developer.getByText("1 个问题 · 0 个待回答")).toBeVisible();
    await developer
      .getByRole("button", { name: "创建新 Revision", exact: true })
      .click();
    await developer
      .getByLabel("规格正文")
      .fill(
        "按创建月份筛选当前项目需求，导出 UTF-8 CSV。\n字段：标题、状态、最新规格编号。仅包含当前项目授权范围。",
      );
    await developer.getByRole("button", { name: "移除验收标准 1" }).click();
    await developer.getByRole("button", { name: "保存为新 Revision" }).click();
    await saved(developer);
    await expect(
      developer.getByRole("button", { name: "标记就绪", exact: true }),
    ).toBeDisabled();
    const first = (await detail(page.request, id)).latestRevision;
    await developer
      .getByRole("button", { name: "创建新 Revision", exact: true })
      .click();
    await developer.getByRole("button", { name: "添加验收标准" }).click();
    await developer
      .getByLabel("验收标准 1", { exact: true })
      .fill("按月份筛选后，CSV 仅包含该月份创建的本项目需求。");
    await developer.getByRole("button", { name: "添加验收标准" }).click();
    await developer
      .getByLabel("验收标准 2", { exact: true })
      .fill("标题、状态、最新规格编号完整；中文与换行可正确读取。");
    await developer.getByRole("button", { name: "保存为新 Revision" }).click();
    await saved(developer);
    const second = (await detail(page.request, id)).latestRevision;
    expect(second.revisionNo).toBe(2);
    await developer
      .getByRole("button", { name: "标记就绪", exact: true })
      .click();
    await developer
      .getByRole("button", { name: "确认标记就绪", exact: true })
      .click();
    await saved(developer);
    await expect(
      developer.getByText("规格已就绪", { exact: true }),
    ).toBeVisible();
    await expect(
      developer.getByRole("button", { name: "提出问题", exact: true }),
    ).toHaveCount(0);
    await developer.reload();
    await expect(
      developer.getByText("规格已就绪", { exact: true }),
    ).toBeVisible();
    await developer.evaluate(() =>
      window.scrollTo({ top: 0, behavior: "instant" }),
    );
    await developer.screenshot({
      path: `${evidence}/requirement-ready-desktop.png`,
      fullPage: true,
      animations: "disabled",
    });
    await client.goto(`${url}/revisions/${first.id}`);
    await expect(
      client.getByRole("heading", { name: "Revision 1", exact: true }),
    ).toBeVisible();
    await client.reload();
    await expect(
      client.getByRole("region", { name: "历史规格" }),
    ).toContainText(first.content);
    await expect(
      client.getByRole("heading", { name: "验收标准 · 0 条" }),
    ).toBeVisible();
    await expect(client.getByLabel("规格正文")).toHaveCount(0);
    await client.setViewportSize({ width: 390, height: 844 });
    await client.screenshot({
      path: `${evidence}/revision-history-mobile.png`,
      fullPage: true,
      animations: "disabled",
    });
    await client.setViewportSize({ width: 320, height: 844 });
    expect(
      await client.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const unchanged = (
      await (
        await page.request.get(
          `/api/v1/requirements/${id}/revisions/${first.id}`,
        )
      ).json()
    ).data;
    expect(unchanged.content).toBe(first.content);
    expect(unchanged.acceptanceCriteria).toEqual([]);
    await client.goto(url);
    await expect(
      client.getByText("需求已就绪，问答已关闭。", { exact: false }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "回答问题 1" }),
    ).toHaveCount(0);

    // Both parents are visible to Owner; URL splicing must still hide the mismatched child.
    const other = await write(page.request, "post", "/projects", {
      workspaceId: workspace.id,
      name: "内部项目",
      baselineScope: "不可拼接项目上下文",
    });
    const otherReq = await write(
      page.request,
      "post",
      `/projects/${other.id}/requirements`,
      { title: "内部需求", originalText: "内部正文" },
    );
    await page.goto(`/app/projects/${other.id}/requirements/${id}`);
    await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
      "内容不存在",
    );
    await expect(page.getByText("按月份导出需求", { exact: true })).toHaveCount(
      0,
    );
    await page.goto(
      `/app/projects/${other.id}/requirements/${id}/revisions/${first.id}`,
    );
    await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
      "内容不存在",
    );
    await page.goto(
      `/app/projects/${other.id}/requirements/${otherReq.id}/revisions/${first.id}`,
    );
    await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
      "内容不存在",
    );
    expect(
      (
        await client.request.get(`/api/v1/requirements/${otherReq.id}`)
      ).status(),
    ).toBe(404);
    expect(errors).toEqual([]);
  } finally {
    await developerContext.close();
    await clientContext.close();
  }
});

test("Ready 冲突不确认新规格，Pending 竞争保留修订输入，分页与创建结果未知", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const workspace = await write(page.request, "post", "/workspaces", {
    name: "并发协作团队",
  });
  const project = await write(page.request, "post", "/projects", {
    workspaceId: workspace.id,
    name: "并发修订项目",
    baselineScope: "核心并发分支",
  });
  await write(
    page.request,
    "put",
    `/projects/${project.id}/client`,
    { email: accounts.client.email },
    200,
  );
  const req = await write(
    page.request,
    "post",
    `/projects/${project.id}/requirements`,
    { title: "并发规格确认", originalText: "保存版本并确认" },
  );
  const url = `/app/projects/${project.id}/requirements/${req.id}`;
  await write(page.request, "post", `/requirements/${req.id}/revisions`, {
    expectedVersion: 1,
    content: "初始规格",
    acceptanceCriteria: ["初始标准"],
  });
  await page.goto(url);
  await page.getByRole("button", { name: "标记就绪", exact: true }).click();
  const concurrent = await write(
    page.request,
    "post",
    `/requirements/${req.id}/revisions`,
    {
      expectedVersion: 2,
      content: "另一人刚创建的新规格",
      acceptanceCriteria: ["新标准"],
    },
  );
  let readyWrites = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/mark-ready")) readyWrites++;
  });
  const stale = page.waitForResponse(
    (r) => r.url().endsWith("/mark-ready") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "确认标记就绪", exact: true }).click();
  expect((await stale).status()).toBe(409);
  await expect(
    page.getByText("另一人刚创建的新规格", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "确认标记就绪", exact: true }),
  ).toBeDisabled();
  expect(readyWrites).toBe(1);
  expect((await detail(page.request, req.id)).status).toBe("CLARIFYING");
  const question = await write(
    page.request,
    "post",
    `/requirements/${req.id}/clarifications`,
    { expectedVersion: 3, kind: "QUESTION", body: "还有一个待确认的边界" },
  );
  await refresh(page);
  await expect(
    page.getByRole("button", { name: "确认标记就绪", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("region", { name: "就绪检查" })).toContainText(
    "还有未回答的问题",
  );
  await write(page.request, "post", `/requirements/${req.id}/clarifications`, {
    expectedVersion: 4,
    kind: "ANSWER",
    parentId: question.id,
    body: "边界已确认",
  });
  await refresh(page);
  await page
    .getByRole("button", { name: "已核对最新内容，使用当前版本" })
    .click();
  await page.getByRole("button", { name: "确认标记就绪", exact: true }).click();
  await saved(page);
  expect(readyWrites).toBe(2);
  await page
    .getByRole("button", { name: "创建新 Revision", exact: true })
    .click();
  await page.getByLabel("规格正文").fill("未提交的后续范围，必须保留输入。");
  // Existing R05 API establishes a real pending review; no Phase F UI or SQL fixtures.
  const change = await write(
    page.request,
    "post",
    `/requirements/${req.id}/change-requests`,
    {},
  );
  await write(
    page.request,
    "patch",
    `/change-requests/${change.id}`,
    {
      expectedVersion: 0,
      scopeSummary: "并发测试",
      estimateHours: "1.00",
      costDeltaMinor: 0,
      currency: "CNY",
      scheduleDeltaDays: 0,
      acceptanceCriteria: ["确认规格"],
    },
    200,
  );
  await write(page.request, "post", `/change-requests/${change.id}/submit`, {
    expectedVersion: 1,
  });
  let revisionWrites = 0;
  page.on("request", (r) => {
    if (
      r.method() === "POST" &&
      r.url().endsWith(`/requirements/${req.id}/revisions`)
    )
      revisionWrites++;
  });
  const pending = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/requirements/${req.id}/revisions`) &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "保存为新 Revision" }).click();
  const pendingResponse = await pending;
  expect(pendingResponse.status()).toBe(409);
  expect((await pendingResponse.json()).error.code).toBe("REVIEW_IN_PROGRESS");
  await expect(page.getByLabel("规格正文")).toHaveValue(
    "未提交的后续范围，必须保留输入。",
  );
  await expect(
    page.getByRole("button", { name: "保存为新 Revision" }),
  ).toBeDisabled();
  expect(revisionWrites).toBe(1);
  expect((await detail(page.request, req.id)).latestRevisionId).toBe(
    concurrent.id,
  );
  await write(
    page.request,
    "post",
    `/change-requests/${change.id}/vendor-decision`,
    { expectedVersion: 2, decision: "APPROVED", comment: "供应方确认" },
    200,
  );
  await refresh(page);
  await expect(page.getByLabel("规格正文")).toHaveValue(
    "未提交的后续范围，必须保留输入。",
  );
  await expect(
    page.getByRole("button", { name: "保存为新 Revision" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "创建新 Revision", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("此需求有审批中的变更，审批结束前不能创建新 Revision。", {
      exact: true,
    }),
  ).toBeVisible();

  const history = await write(
    page.request,
    "post",
    `/projects/${project.id}/requirements`,
    { title: "历史分页需求", originalText: "分页" },
  );
  for (let i = 1; i <= 13; i++)
    await write(page.request, "post", `/requirements/${history.id}/revisions`, {
      expectedVersion: i,
      content: `规格 ${i}`,
      acceptanceCriteria: ["可独立查看"],
    });
  const historyUrl = `/app/projects/${project.id}/requirements/${history.id}`;
  await page.goto(historyUrl);
  const historyPanel = page.getByRole("region", { name: "版本历史" });
  await expect(historyPanel.getByRole("listitem")).toHaveCount(12);
  await historyPanel.getByRole("button", { name: "下一页" }).click();
  await expect(historyPanel.getByRole("listitem")).toHaveCount(1);
  await page.reload();
  await expect(
    historyPanel.getByRole("link", { name: "Revision 1", exact: true }),
  ).toBeVisible();
  await historyPanel
    .getByRole("link", { name: "Revision 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revision 1", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("规格 1", { exact: true })).toBeVisible();
  for (let i = 1; i <= 11; i++)
    await write(page.request, "post", `/projects/${project.id}/requirements`, {
      title: `分页需求 ${i}`,
      originalText: "需求列表分页",
    });
  const list = `/app/projects/${project.id}/requirements`;
  await page.goto(list);
  await expect(page.locator(".requirement-row")).toHaveCount(12);
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(page.locator(".requirement-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".requirement-row")).toHaveCount(1);
  await page.getByRole("link", { name: "创建需求", exact: true }).click();
  let creates = 0;
  await page.route(
    `**/api/v1/projects/${project.id}/requirements`,
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      creates++;
      const result = await route.fetch();
      expect(result.status()).toBe(201);
      await route.abort("failed");
    },
  );
  await page
    .getByRole("textbox", { name: "需求标题", exact: true })
    .fill("响应丢失的需求");
  await page
    .getByRole("textbox", { name: "需求原文", exact: true })
    .fill("仅真实创建一次");
  await page.getByRole("button", { name: "创建需求", exact: true }).click();
  await expect(
    page.getByText("创建结果未知。", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "创建需求", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "需求标题", exact: true }),
  ).toHaveValue("响应丢失的需求");
  expect(creates).toBe(1);
  await page.getByRole("link", { name: "返回需求列表核对" }).click();
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(
    page.getByRole("heading", { name: "响应丢失的需求", exact: true }),
  ).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
});
