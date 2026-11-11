import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import {
  test,
  expect,
  login,
  origin,
  writeHeaders,
  type Account,
} from "./fixtures";

const evidence = resolve(process.cwd(), "../../docs/ux/evidence/r07-f");
async function write(
  api: APIRequestContext,
  method: "post" | "patch" | "put",
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
async function read(api: APIRequestContext, path: string) {
  const response = await api.get(`/api/v1${path}`);
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function setup(page: Page, accounts: { b: Account; client: Account }) {
  const workspace = await write(page.request, "post", "/workspaces", {
    name: "青禾产品团队",
  });
  const project = await write(page.request, "post", "/projects", {
    workspaceId: workspace.id,
    name: "青禾 · 客户协作门户",
    baselineScope: "统一需求入口与交付确认。",
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
  const requirement = await write(
    page.request,
    "post",
    `/projects/${project.id}/requirements`,
    { title: "按月份导出客户需求", originalText: "导出需求以核对范围。" },
  );
  await write(
    page.request,
    "post",
    `/requirements/${requirement.id}/revisions`,
    {
      expectedVersion: 1,
      content: "按月份导出 CSV，保留中文与换行。",
      acceptanceCriteria: ["月份筛选准确，中文导出无乱码。"],
    },
  );
  await write(
    page.request,
    "post",
    `/requirements/${requirement.id}/mark-ready`,
    { expectedVersion: 2 },
    200,
  );
  return { project, requirement };
}
async function refresh(page: Page) {
  await page.getByRole("button", { name: "刷新变更", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "刷新变更", exact: true }),
  ).toBeEnabled();
}
async function done(page: Page) {
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "操作已完成，当前变更与审批历史已更新" }),
  ).toBeVisible();
}
async function decision(
  page: Page,
  choice: "批准" | "拒绝",
  version: number,
  comment: string,
) {
  await page
    .getByRole("button", { name: `${choice}此版本`, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`冻结版本 v${version}`);
  await dialog
    .getByRole("textbox", { name: "审批评论（可选，双方可见）" })
    .fill(comment);
  await dialog
    .getByRole("button", { name: `确认${choice} v${version}`, exact: true })
    .click();
  await done(page);
}
async function submit(page: Page) {
  await page.getByRole("button", { name: "正式提交审批", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认正式提交", exact: true })
    .click();
  await done(page);
}
async function fillAssessment(page: Page, amount = "12345") {
  await page
    .getByRole("textbox", { name: "范围说明", exact: true })
    .fill("按月份导出 CSV，包含需求原文与已确认规格。\n不包含跨项目导出。");
  await page
    .getByRole("textbox", { name: "评估工时（小时）", exact: true })
    .fill("12.35");
  await page
    .getByRole("textbox", { name: "费用变化（最小单位）", exact: true })
    .fill(amount);
  await page
    .getByRole("textbox", { name: "工期变化（天）", exact: true })
    .fill("2");
  await page.getByLabel("币种", { exact: true }).selectOption("CNY");
  await page
    .getByRole("button", { name: "添加商业验收标准", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "商业验收标准 1", exact: true })
    .fill("导出月份准确、中文无乱码，包含确认版本编号。");
}

test("真实三角色商业草稿→顺序审批→客户拒绝→重开选择新规格→重新同版批准与冻结历史", async ({
  page,
  browser,
  accounts,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const { project, requirement } = await setup(page, accounts);
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
    const requirementUrl = `/app/projects/${project.id}/requirements/${requirement.id}`;
    await developer.goto(requirementUrl);
    await developer
      .getByRole("button", { name: "创建商业评估", exact: true })
      .click();
    await expect(developer).toHaveURL(/\/changes\/[\da-f-]+$/);
    const id = developer.url().split("/").at(-1)!;
    const path = `/change-requests/${id}`;
    const url = `/app/projects/${project.id}/changes/${id}`;
    expect((await read(developer.request, path)).lockVersion).toBe(0);
    await developer.getByRole("button", { name: "编辑商业草稿" }).click();
    await expect(developer.getByLabel("币种", { exact: true })).toHaveValue("");
    // NULL remains unknown; saving a partial draft at expectedVersion=0 is legal.
    await developer
      .getByRole("textbox", { name: "范围说明", exact: true })
      .fill("供应方内部尚未完整评估");
    await developer.getByRole("button", { name: "保存商业草稿" }).click();
    await done(developer);
    const partial = await read(developer.request, path);
    expect(partial.lockVersion).toBe(1);
    expect(partial.draft.costDeltaMinor).toBeNull();
    await expect(
      developer.getByRole("button", { name: "正式提交审批" }),
    ).toBeDisabled();
    await client.goto(url);
    const clientDraft = await read(client.request, path);
    expect(clientDraft).not.toHaveProperty("draft");
    expect(clientDraft.capabilities.submit).toEqual({
      allowed: false,
      reasonCode: "ROLE_FORBIDDEN",
    });
    await expect(
      client.getByText("供应方内部尚未完整评估", { exact: true }),
    ).toHaveCount(0);
    await expect(
      client.getByRole("button", { name: "编辑商业草稿" }),
    ).toHaveCount(0);
    await write(
      client.request,
      "patch",
      path,
      { expectedVersion: 1, scopeSummary: "客户越权" },
      403,
    );
    await developer.getByRole("button", { name: "编辑商业草稿" }).click();
    await fillAssessment(developer, "9007199254740992");
    await developer
      .getByRole("textbox", { name: "评估工时（小时）", exact: true })
      .fill("1e2");
    await developer.getByRole("button", { name: "保存商业草稿" }).click();
    await expect(
      developer.getByText(
        "费用须为 ±9007199254740991 内的整数最小单位，不接受小数或指数",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      developer.getByText("工时须为 0～999999.99，最多两位小数，不接受指数", {
        exact: true,
      }),
    ).toBeVisible();
    developer.once("dialog", (dialog) => dialog.dismiss());
    await developer
      .getByRole("link", { name: "变更与审批", exact: true })
      .click();
    await expect(
      developer.getByRole("textbox", { name: "范围说明", exact: true }),
    ).toBeVisible();
    await developer
      .getByRole("textbox", { name: "评估工时（小时）", exact: true })
      .fill("999999.99");
    await developer
      .getByRole("textbox", { name: "费用变化（最小单位）", exact: true })
      .fill("-9007199254740991");
    await developer.getByRole("button", { name: "保存商业草稿" }).click();
    await done(developer);
    const exact = await read(developer.request, path);
    expect(exact.draft.estimateHours).toBe("999999.99");
    expect(exact.draft.costDeltaMinor).toBe(-9007199254740991);
    await expect(
      developer.getByText("CNY −90,071,992,547,409.91", { exact: true }),
    ).toBeVisible();
    // Bring the demonstration back to ordinary commercial values before freezing.
    await developer.getByRole("button", { name: "编辑商业草稿" }).click();
    await developer
      .getByRole("textbox", { name: "评估工时（小时）", exact: true })
      .fill("12.35");
    await developer
      .getByRole("textbox", { name: "费用变化（最小单位）", exact: true })
      .fill("12345");
    await developer.getByRole("button", { name: "保存商业草稿" }).click();
    await done(developer);
    await submit(developer);
    const submitted = await read(developer.request, path);
    const first = submitted.activeVersion;
    expect(first.versionNo).toBe(1);
    expect(first.estimateHours).toBe("12.35");
    expect(first.costDeltaMinor).toBe(12345);
    // Cached requirement capabilities must reflect the pending change without reload.
    await developer
      .getByRole("link", { name: "关联需求 →", exact: true })
      .click();
    await expect(
      developer.getByRole("button", { name: "创建新 Revision" }),
    ).toBeDisabled();
    await developer.goto(url);
    await refresh(client);
    await expect(
      client.getByRole("button", { name: "批准此版本" }),
    ).toHaveCount(0);
    await write(
      client.request,
      "post",
      `${path}/client-decision`,
      { expectedVersion: submitted.lockVersion, decision: "APPROVED" },
      409,
    );
    await write(
      developer.request,
      "post",
      `${path}/vendor-decision`,
      { expectedVersion: submitted.lockVersion, decision: "APPROVED" },
      403,
    );
    await page.goto(url);
    await decision(page, "批准", 1, "工时与费用已复核，请客户确认范围。");
    await refresh(client);
    await decision(client, "拒绝", 1, "请补充导出空月份时的提示。");
    const rejected = await read(client.request, path);
    expect(
      rejected.activeVersion.approvals.map(
        (a: { decision: string }) => a.decision,
      ),
    ).toEqual(["APPROVED", "REJECTED"]);
    expect(rejected).not.toHaveProperty("draft");
    await refresh(developer);
    await developer
      .getByRole("button", { name: "重开评估", exact: true })
      .click();
    await developer
      .getByRole("dialog")
      .getByRole("button", { name: "确认重开评估", exact: true })
      .click();
    await done(developer);
    const reopened = await read(developer.request, path);
    expect(reopened.status).toBe("DRAFT");
    expect(reopened.activeVersionId).toBe(first.id);
    expect(reopened.versions).toHaveLength(1);
    await refresh(client);
    expect(await read(client.request, path)).not.toHaveProperty("draft");
    await expect(
      client.getByText(/上一轮 v1 · 以下为历史冻结内容/),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "批准此版本" }),
    ).toHaveCount(0);
    // New requirement revision after rejection requires explicit draft selection.
    const r = await read(developer.request, `/requirements/${requirement.id}`);
    await write(
      developer.request,
      "post",
      `/requirements/${requirement.id}/revisions`,
      {
        expectedVersion: r.draftVersion,
        content: "按月份导出 CSV；空月份显示无数据提示。",
        acceptanceCriteria: ["中文无乱码；空月份提示清晰。"],
      },
    );
    await write(
      developer.request,
      "post",
      `/requirements/${requirement.id}/mark-ready`,
      { expectedVersion: r.draftVersion + 1 },
      200,
    );
    await refresh(developer);
    await expect(
      developer.getByRole("button", { name: "正式提交审批" }),
    ).toBeDisabled();
    await developer.getByRole("button", { name: "编辑商业草稿" }).click();
    await developer
      .getByLabel("引用需求版本", { exact: true })
      .selectOption({ label: "最新 Revision 2 · 已就绪" });
    await developer
      .getByRole("textbox", { name: "范围说明", exact: true })
      .fill("按月份导出 CSV；空月份显示无数据提示。");
    await developer.getByRole("button", { name: "保存商业草稿" }).click();
    await done(developer);
    await submit(developer);
    const second = (await read(developer.request, path)).activeVersion;
    expect(second.versionNo).toBe(2);
    expect(second.id).not.toBe(first.id);
    expect(second.approvals).toEqual([]);
    expect(second.requirementRevision.revisionNo).toBe(2);
    await refresh(page);
    await decision(page, "批准", 2, "已补充空月份提示，评估不变。");
    await refresh(client);
    await client.evaluate(() =>
      window.scrollTo({ top: 0, behavior: "instant" }),
    );
    await client.screenshot({
      path: resolve(evidence, "client-approval-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
    await client.getByRole("button", { name: "批准此版本" }).click();
    await client.setViewportSize({ width: 390, height: 844 });
    const confirmation = client.getByRole("dialog");
    await confirmation
      .getByRole("textbox", { name: "审批评论（可选，双方可见）" })
      .fill("确认范围和费用，批准此版本。");
    await client.screenshot({
      path: resolve(evidence, "client-confirmation-mobile.png"),
      animations: "disabled",
    });
    await confirmation
      .getByRole("button", { name: "确认批准 v2", exact: true })
      .click();
    await done(client);
    const approved = await read(client.request, path);
    expect(approved.status).toBe("APPROVED");
    expect(approved.activeVersionId).toBe(second.id);
    expect(approved.activeVersion.approvals).toHaveLength(2);
    for (const a of approved.activeVersion.approvals) {
      expect(a.changeRequestVersionId).toBe(second.id);
      expect(a.decision).toBe("APPROVED");
    }
    await write(
      developer.request,
      "post",
      `${path}/resubmit`,
      { expectedVersion: approved.lockVersion },
      409,
    );
    await write(
      developer.request,
      "patch",
      path,
      { expectedVersion: approved.lockVersion, scopeSummary: "终态修改" },
      409,
    );
    await client.goto(`${url}/versions/${first.id}`);
    await client.reload();
    await expect(
      client.getByRole("heading", { name: "冻结版本 v1", exact: true }).first(),
    ).toBeVisible();
    await expect(
      client.getByText("请补充导出空月份时的提示。", { exact: true }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "批准此版本" }),
    ).toHaveCount(0);
    const historical = await read(
      client.request,
      `${path}/versions/${first.id}`,
    );
    expect(historical.scopeSnapshot).toBe(first.scopeSnapshot);
    expect(historical.requirementRevision).toEqual(first.requirementRevision);
    await client.setViewportSize({ width: 320, height: 800 });
    expect(
      await client.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    // A different accessible project in the URL must still fail the parent check.
    const other = await write(page.request, "post", "/projects", {
      workspaceId: project.workspaceId,
      name: "独立项目",
      baselineScope: "独立范围",
    });
    await page.goto(`/app/projects/${other.id}/changes/${id}`);
    await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
      "内容不存在",
    );
    expect(
      (
        await client.request.get(`/api/v1/projects/${other.id}/change-requests`)
      ).status(),
    ).toBe(404);
    await page.goto(
      `/app/projects/${other.id}/changes/${id}/versions/${first.id}`,
    );
    await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
      "内容不存在",
    );
    expect(errors).toEqual([]);
  } finally {
    await developerContext.close();
    await clientContext.close();
  }
});

test("草稿与提交 stale 保留输入；旧审批不得落到重提新版本；列表分页、筛选及未知创建不重放", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { project, requirement } = await setup(page, accounts);
  const created = await write(
    page.request,
    "post",
    `/requirements/${requirement.id}/change-requests`,
    {},
  );
  const id = created.id;
  const path = `/change-requests/${id}`;
  const url = `/app/projects/${project.id}/changes/${id}`;
  await page.goto(url);
  await page.getByRole("button", { name: "编辑商业草稿" }).click();
  await fillAssessment(page);
  let patches = 0;
  let submissions = 0;
  let decisions = 0;
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().endsWith(path)) patches++;
    if (r.method() === "POST" && r.url().endsWith(`${path}/submit`))
      submissions++;
    if (r.method() === "POST" && r.url().endsWith(`${path}/vendor-decision`))
      decisions++;
  });
  await write(
    page.request,
    "patch",
    path,
    { expectedVersion: 0, scopeSummary: "另一编辑者已保存的范围" },
    200,
  );
  const stale = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().endsWith(path),
  );
  await page.getByRole("button", { name: "保存商业草稿" }).click();
  expect((await stale).status()).toBe(409);
  await expect(
    page.getByRole("textbox", { name: "范围说明", exact: true }),
  ).toHaveValue(/按月份导出 CSV/);
  await expect(
    page.getByRole("region", { name: "已保存商业草稿" }),
  ).toContainText("另一编辑者已保存的范围");
  await expect(
    page.getByRole("button", { name: "保存商业草稿" }),
  ).toBeDisabled();
  expect(patches).toBe(1);
  await page
    .getByRole("button", { name: "已核对最新草稿，使用当前版本" })
    .click();
  await page.getByRole("button", { name: "保存商业草稿" }).click();
  await done(page);
  expect(patches).toBe(2);
  await page.getByRole("button", { name: "正式提交审批" }).click();
  let current = await read(page.request, path);
  await write(
    page.request,
    "patch",
    path,
    { expectedVersion: current.lockVersion, scopeSummary: "最终核对范围" },
    200,
  );
  const staleSubmit = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" && r.url().endsWith(`${path}/submit`),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认正式提交", exact: true })
    .click();
  expect((await staleSubmit).status()).toBe(409);
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "确认正式提交", exact: true }),
  ).toBeDisabled();
  expect(submissions).toBe(1);
  expect((await read(page.request, path)).versions).toHaveLength(0);
  await page.getByRole("button", { name: "关闭确认框" }).click();
  await submit(page);
  expect(submissions).toBe(2);
  await page.getByRole("button", { name: "批准此版本" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "审批评论（可选，双方可见）" })
    .fill("仅对原 v1 的决定，必须保留");
  current = await read(page.request, path);
  await write(
    page.request,
    "post",
    `${path}/vendor-decision`,
    {
      expectedVersion: current.lockVersion,
      decision: "REJECTED",
      comment: "其他标签页负责人已拒绝",
    },
    200,
  );
  await write(
    page.request,
    "post",
    `${path}/resubmit`,
    { expectedVersion: current.lockVersion + 1 },
    200,
  );
  await write(page.request, "post", `${path}/submit`, {
    expectedVersion: current.lockVersion + 2,
  });
  const staleApproval = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      r.url().endsWith(`${path}/vendor-decision`),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认批准 v1", exact: true })
    .click();
  expect((await staleApproval).status()).toBe(409);
  await expect(
    page
      .getByRole("dialog")
      .getByRole("textbox", { name: "审批评论（可选，双方可见）" }),
  ).toHaveValue("仅对原 v1 的决定，必须保留");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "确认批准 v1", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText("未自动重放");
  expect(decisions).toBe(1);
  const unreviewed = await read(page.request, path);
  expect(unreviewed.activeVersion.versionNo).toBe(2);
  expect(unreviewed.activeVersion.approvals).toHaveLength(0);
  await page.getByRole("button", { name: "关闭确认框" }).click();
  await decision(page, "拒绝", 2, "新一轮亦需调整");
  expect(decisions).toBe(2);
  await page.getByRole("button", { name: "重开评估" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认重开评估", exact: true })
    .click();
  await done(page);
  expect((await read(page.request, path)).versions).toHaveLength(2);
  await submit(page);
  await decision(page, "批准", 3, "已重新核对 v3");
  await page
    .getByRole("region", { name: "冻结版本历史" })
    .getByRole("link", { name: "冻结版本 v1", exact: true })
    .click();
  await expect(
    page.getByText("其他标签页负责人已拒绝", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("历史只读 · 本轮已拒绝；本页不能执行审批。", { exact: true })).toBeVisible();
  // One real page boundary verifies discovery pagination and independent filtering.
  for (let i = 0; i < 12; i++)
    await write(
      page.request,
      "post",
      `/requirements/${requirement.id}/change-requests`,
      {},
    );
  const list = `/app/projects/${project.id}/changes`;
  await page.goto(list);
  await expect(page.locator("a.requirement-row")).toHaveCount(12);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page).toHaveURL(/offset=12/);
  await page.reload();
  await expect(page.locator("a.requirement-row")).toHaveCount(1);
  await page
    .getByLabel("审批状态", { exact: true })
    .selectOption("VENDOR_APPROVED");
  await expect(page).not.toHaveURL(/offset=/);
  await expect(page.locator("a.requirement-row")).toHaveCount(1);
  await page.getByLabel("审批状态", { exact: true }).selectOption("APPROVED");
  await expect(
    page.getByText("暂无符合条件的变更", { exact: true }),
  ).toBeVisible();
  await page.goto(`/app/projects/${project.id}/requirements/${requirement.id}`);
  const createPath = `/api/v1/requirements/${requirement.id}/change-requests`;
  let creates = 0;
  await page.route(`**${createPath}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    creates++;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "创建商业评估", exact: true }).click();
  await expect(
    page.getByText("创建结果未知，请先查看变更列表核对；不会自动再次创建。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "创建商业评估", exact: true }),
  ).toBeDisabled();
  expect(creates).toBe(1);
  await page.unroute(`**${createPath}`);
});
