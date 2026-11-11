import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRequestContext } from "@playwright/test";
import { test, expect, login, origin, writeHeaders } from "./fixtures";

const evidence = resolve(process.cwd(), "../../docs/ux/evidence/r07-d");
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

test("Owner 浏览器项目准备、两级成员、Client 独立入口和当前项目权限", async ({
  page,
  accounts,
  playwright,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  await page.getByRole("link", { name: "进入我的项目" }).click();
  await expect(
    page.getByRole("heading", { name: "还没有获授权的项目" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "创建工作空间", exact: true }).click();
  await page.getByLabel("空间名称").fill("桥石产品团队");
  await page.getByRole("button", { name: "创建工作空间", exact: true }).click();
  await expect(page).toHaveURL(/projects\?workspaceId=/);
  const workspaceId = new URL(page.url()).searchParams.get("workspaceId")!;
  await expect(page.getByLabel("工作空间", { exact: true })).toHaveValue(
    workspaceId,
  );
  await page.getByRole("link", { name: "创建项目", exact: true }).click();
  await page.getByLabel("项目名称").fill("客户协作门户");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("请填写初始范围")).toBeVisible();
  const scope =
    "统一需求入口与客户协作门户。\n交付内容：需求登记、项目进度展示。\n不包含支付或第三方系统集成。";
  await page.getByLabel("初始范围", { exact: true }).fill(scope);
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page).toHaveURL(/projects\/[\da-f-]+$/);
  const projectId = page.url().split("/").at(-1)!;
  await expect(page.getByTestId("project-role")).toHaveText("负责人");
  await expect(page.locator(".scope-content")).toHaveText(scope);
  await page.getByRole("link", { name: "项目成员", exact: true }).click();
  await page.getByRole("link", { name: "管理供应方成员" }).click();
  await page.getByLabel("开发成员邮箱").fill("missing-member@example.test");
  await page.getByRole("button", { name: "添加到工作空间" }).click();
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "该邮箱尚未注册",
  );
  await expect(page.getByLabel("开发成员邮箱")).toHaveValue(
    "missing-member@example.test",
  );
  await page.getByLabel("开发成员邮箱").fill(accounts.b.email);
  await page.getByRole("button", { name: "添加到工作空间" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  await expect(
    page.getByTestId("member-email").filter({ hasText: accounts.b.email }),
  ).toBeVisible();

  const developer = await playwright.request.newContext({ baseURL: origin });
  await write(
    developer,
    "post",
    "/auth/login",
    { email: accounts.b.email, password: accounts.b.password },
    200,
  );
  expect((await developer.get(`/api/v1/projects/${projectId}`)).status()).toBe(
    404,
  ); // Workspace membership alone grants no project.
  expect(
    (await developer.get(`/api/v1/workspaces/${workspaceId}/members`)).status(),
  ).toBe(403);
  await page.goto(`/app/projects/${projectId}/members`);
  await page
    .getByRole("button", {
      name: `分配 ${accounts.b.displayName}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: `已分配 ${accounts.b.displayName}` }),
  ).toBeDisabled();
  expect((await developer.get(`/api/v1/projects/${projectId}`)).status()).toBe(
    200,
  );
  const forbidden = await developer.put(
    `/api/v1/projects/${projectId}/client`,
    { headers: writeHeaders, data: { email: accounts.client.email } },
  );
  expect(forbidden.status()).toBe(403);
  await page.getByLabel("客户邮箱").fill(accounts.b.email);
  await page.getByRole("button", { name: "绑定客户", exact: true }).click();
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "身份冲突",
  );
  await page.getByLabel("客户邮箱").fill(accounts.client.email);
  await page.getByRole("button", { name: "绑定客户", exact: true }).click();
  await expect(
    page.getByText(`当前客户：${accounts.client.displayName}`),
  ).toBeVisible();
  const actual = (
    await (await page.request.get(`/api/v1/projects/${projectId}`)).json()
  ).data;
  expect(
    actual.members.filter((m: { role: string }) => m.role === "CLIENT"),
  ).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "更正客户绑定", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/owner-members-desktop.png`,
    fullPage: true,
    animations: "disabled",
    mask: [page.getByTestId("member-email")],
    maskColor: "#E2E6ED",
  });

  // Exercise real pagination, and prove changing scope cannot retain old rows.
  const hidden = await write(page.request, "post", "/projects", {
    workspaceId,
    name: "供应方内部项目",
    baselineScope: "不可向未分配账号展示",
  });
  for (let i = 0; i < 11; i++)
    await write(page.request, "post", "/projects", {
      workspaceId,
      name: `分页项目 ${i + 1}`,
      baselineScope: "仅用于验证授权后的分页",
    });
  await page.goto(`/app/projects?workspaceId=${workspaceId}`);
  await expect(page.locator(".project-card")).toHaveCount(12);
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByLabel("工作空间", { exact: true }).selectOption("");
  await expect(page).toHaveURL(/\/app\/projects$/);
  await expect(page.locator(".project-card")).toHaveCount(12);

  await page.getByRole("button", { name: "退出登录" }).click();
  await login(page, accounts.b);
  await page.goto("/app/projects");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("link", { name: /客户协作门户/ }).click();
  await expect(page.getByTestId("project-role")).toHaveText("开发成员");
  await page.getByRole("link", { name: "项目成员", exact: true }).click();
  await expect(page.getByRole("heading", { name: "分配开发成员" })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("客户邮箱")).toHaveCount(0);
  await page.getByRole("button", { name: "退出登录" }).click();
  await login(page, accounts.client);
  await page.getByRole("link", { name: "进入我的项目" }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  expect(
    (await (await page.request.get("/api/v1/workspaces")).json()).data,
  ).toEqual([]);
  expect(
    (await page.request.get(`/api/v1/projects/${hidden.id}`)).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post(`/api/v1/projects/${hidden.id}/members`, {
        headers: writeHeaders,
        data: { userId: actual.owner.userId, role: "DEVELOPER" },
      })
    ).status(),
  ).toBe(404);
  await page.getByRole("link", { name: /客户协作门户/ }).click();
  await expect(page.getByTestId("project-role")).toHaveText("客户");
  await page.reload();
  await expect(page.getByTestId("project-role")).toHaveText("客户");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/client-project-mobile.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "项目成员", exact: true }).click();
  await expect(page.getByLabel("客户邮箱")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "分配开发成员" })).toHaveCount(
    0,
  );
  await page.goto(`/app/settings/members?workspaceId=${workspaceId}`);
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "内容不存在",
  );
  await page.goto(`/app/projects/${hidden.id}`);
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "内容不存在",
  );
  await expect(page.getByText("供应方内部项目", { exact: true })).toHaveCount(
    0,
  );

  // This Client can own another workspace; it does not grant management in the original project.
  const ownWorkspace = await write(page.request, "post", "/workspaces", {
    name: "客户自己的团队",
  });
  const ownProject = await write(page.request, "post", "/projects", {
    workspaceId: ownWorkspace.id,
    name: "自有项目",
    baselineScope: "独立项目权限",
  });
  await page.goto(`/app/projects/${ownProject.id}/members`);
  await expect(page.getByTestId("project-role")).toHaveText("负责人");
  await expect(page.getByLabel("客户邮箱")).toBeVisible();
  await page.goto(`/app/projects/${projectId}/members`);
  await expect(page.getByTestId("project-role")).toHaveText("客户");
  await expect(page.getByLabel("客户邮箱")).toHaveCount(0);
  await developer.dispose();
});

test("真实客户更正与首次提交竞争锁定、创建结果未知不重放", async ({
  page,
  accounts,
  playwright,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const workspace = await write(page.request, "post", "/workspaces", {
    name: "版本确认团队",
  });
  const project = await write(page.request, "post", "/projects", {
    workspaceId: workspace.id,
    name: "交付确认项目",
    baselineScope: "首次提交后保持唯一客户身份。",
  });
  await page.goto(`/app/projects/${project.id}/members`);
  await page.getByLabel("客户邮箱").fill(accounts.b.email);
  await page.getByRole("button", { name: "绑定客户", exact: true }).click();
  await expect(
    page.getByText(`当前客户：${accounts.b.displayName}`),
  ).toBeVisible();
  await page.getByLabel("客户邮箱").fill(accounts.client.email);
  await page.getByRole("button", { name: "更正客户绑定", exact: true }).click();
  await expect(
    page.getByText(`当前客户：${accounts.client.displayName}`),
  ).toBeVisible();
  const formerClient = await playwright.request.newContext({ baseURL: origin });
  await write(
    formerClient,
    "post",
    "/auth/login",
    { email: accounts.b.email, password: accounts.b.password },
    200,
  );
  expect(
    (await formerClient.get(`/api/v1/projects/${project.id}`)).status(),
  ).toBe(404);
  await formerClient.dispose();

  // Real precondition only: E/F UI remains out of scope. Never write SQL or fabricate lock flags.
  const requirement = await write(
    page.request,
    "post",
    `/projects/${project.id}/requirements`,
    { title: "锁定验证", originalText: "确认客户绑定锁定" },
  );
  await write(
    page.request,
    "post",
    `/requirements/${requirement.id}/revisions`,
    {
      expectedVersion: 1,
      content: "正式规格",
      acceptanceCriteria: ["保持客户身份"],
    },
  );
  await write(
    page.request,
    "post",
    `/requirements/${requirement.id}/mark-ready`,
    { expectedVersion: 2 },
    200,
  );
  const change = await write(
    page.request,
    "post",
    `/requirements/${requirement.id}/change-requests`,
    {},
  );
  await write(
    page.request,
    "patch",
    `/change-requests/${change.id}`,
    {
      expectedVersion: 0,
      scopeSummary: "锁定验证",
      estimateHours: "1.00",
      costDeltaMinor: 0,
      currency: "CNY",
      scheduleDeltaDays: 0,
      acceptanceCriteria: ["保持客户身份"],
    },
    200,
  );
  await page.getByLabel("客户邮箱").fill(accounts.b.email);
  await write(page.request, "post", `/change-requests/${change.id}/submit`, {
    expectedVersion: 1,
  });
  const conflict = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/projects/${project.id}/client`) &&
      r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "更正客户绑定", exact: true }).click();
  expect((await conflict).status()).toBe(409);
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "客户绑定已锁定",
  );
  await expect(page.getByLabel("客户邮箱")).toHaveValue(accounts.b.email);
  await expect(page.getByLabel("客户邮箱")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "更正客户绑定", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByText("客户绑定已锁定：", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText(`当前客户：${accounts.client.displayName}`),
  ).toBeVisible();
  const detail = (
    await (await page.request.get(`/api/v1/projects/${project.id}`)).json()
  ).data;
  expect(
    detail.members.filter((m: { role: string }) => m.role === "CLIENT"),
  ).toHaveLength(1);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/client-locked-desktop.png`,
    fullPage: true,
    animations: "disabled",
  });

  await page.goto("/app/workspaces/new");
  let writes = 0;
  await page.route("**/api/v1/workspaces", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    writes++;
    const result = await route.fetch(); // Commit succeeds; simulate a lost response.
    expect(result.status()).toBe(201);
    await route.abort("failed");
  });
  await page.getByLabel("空间名称").fill("待核对的创建结果");
  await page.getByRole("button", { name: "创建工作空间", exact: true }).click();
  await expect(
    page.getByText("创建结果未知。", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "创建工作空间", exact: true }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  await page.getByRole("link", { name: "返回列表核对" }).click();
  await expect(
    page
      .getByLabel("工作空间", { exact: true })
      .locator("option")
      .filter({ hasText: "待核对的创建结果" }),
  ).toHaveCount(1);
  await page.unrouteAll({ behavior: "wait" });
});
