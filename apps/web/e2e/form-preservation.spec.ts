import type { Locator, Page, Route } from "@playwright/test";
import { SessionStore } from "@/features/auth/session";
import {
  test,
  expect,
  login,
  origin,
  writeHeaders,
  type Account,
} from "./fixtures";

test("会话复核暂停私有 API，过期复核不能覆盖新身份，Provider 清理后可恢复", async () => {
  const store = new SessionStore();
  const originalFetch = globalThis.fetch;
  let respond = () =>
    Promise.resolve(
      Response.json({
        data: {
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            displayName: "会话测试",
            email: "session@example.test",
            createdAt: "2026-01-01T00:00:00Z",
          },
        },
      }),
    );
  globalThis.fetch = () => respond();
  try {
    await store.restore();
    const runtime = store.getSnapshot().runtime;
    runtime.queryClient.setQueryData(["private-test"], "same-user-cache");
    store.suspend();
    await expect(runtime.api("get", "/api/v1/me", {})).rejects.toMatchObject({
      code: "SESSION_UNAVAILABLE",
    });
    await store.restore();
    expect(store.getSnapshot().runtime).toBe(runtime);
    expect(runtime.queryClient.getQueryData(["private-test"])).toBe(
      "same-user-cache",
    );

    const success = respond;
    let release!: (response: Response) => void;
    // Deliberately ignore abort in transport; response parsing must still reject
    // a late identity result after a newer check has already authenticated.
    respond = () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      });
    const oldCheck = store.restore();
    respond = success;
    await store.restore();
    release(
      Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }),
    );
    await oldCheck;
    expect(store.getSnapshot().status).toBe("authenticated");
    expect(store.getSnapshot().runtime).toBe(runtime);

    // Mirrors React Strict Mode's setup → cleanup → setup of AuthProvider.
    store.dispose();
    await store.restore();
    expect(store.getSnapshot().status).toBe("authenticated");
    expect(store.getSnapshot().runtime).not.toBe(runtime);
    expect(store.getSnapshot().runtime.controller.signal.aborted).toBe(false);
  } finally {
    store.dispose();
    globalThis.fetch = originalFetch;
  }
});

test("匿名 401 恢复后登录页可反复挂载", async ({ browser }) => {
  // Initial restoration must remain independent from the runtime retained for
  // a known user's forms. Exercise fresh contexts and hydration repeatedly.
  for (let i = 0; i < 30; i++) {
    const context = await browser.newContext({ baseURL: origin });
    try {
      const page = await context.newPage();
      await page.goto("/login");
      await expect(
        page.getByRole("textbox", { name: "邮箱", exact: true }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  }
});

async function write(page: Page, path: string, data: object, status = 201) {
  const response = await page.request.post(`/api/v1${path}`, {
    headers: writeHeaders,
    data,
  });
  expect(response.status()).toBe(status);
  return (await response.json()).data;
}

async function projectFor(page: Page) {
  const workspace = await write(page, "/workspaces", {
    name: "表单保留回归空间",
  });
  return write(page, "/projects", {
    workspaceId: workspace.id,
    name: "表单保留回归项目",
    baselineScope: "验证草稿和授权隔离",
  });
}

// Hold a real identity response: the draft (including portaled dialogs) must be
// inaccessible during verification and resume with its original value.
async function recheck(
  page: Page,
  field: Locator,
  value: string,
  visibility = false,
) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const handler = async (route: Route) => {
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  };
  await page.route("**/api/v1/me", handler);
  try {
    await page.evaluate((visibility) => {
      if (visibility) {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
        delete (document as unknown as Record<string, unknown>).visibilityState;
      } else window.dispatchEvent(new Event("focus"));
    }, visibility);
    await expect(
      page.getByText("正在恢复会话…", { exact: true }),
    ).toBeVisible();
    await expect(field).toBeHidden();
  } finally {
    release();
  }
  await expect(field).toBeVisible();
  await expect(field).toHaveValue(value);
  await page.unroute("**/api/v1/me", handler);
}

async function switchAccount(page: Page, account: Account) {
  await write(
    page,
    "/auth/login",
    { email: account.email, password: account.password },
    200,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
}

test("创建页成功后可连续新建，未提交草稿与未知结果跨返回保留", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.b);
  await page.goto("/app/workspaces/new");
  const name = page.getByRole("textbox", { name: "空间名称", exact: true });
  const createWorkspace = page.getByRole("button", {
    name: "创建工作空间",
    exact: true,
  });
  await name.fill("未提交的工作空间");
  await page.getByRole("link", { name: "← 我的项目", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/projects$/);
  await page.goBack();
  await expect(name).toHaveValue("未提交的工作空间");
  for (const value of ["连续创建空间一", "连续创建空间二"]) {
    await name.fill(value);
    await expect(createWorkspace).toBeEnabled();
    await createWorkspace.click();
    await expect(page).toHaveURL(/projects\?workspaceId=/);
    await page.goBack();
    await expect(name).toHaveValue("");
    await expect(createWorkspace).toBeEnabled();
  }
  await page.route("**/api/v1/workspaces", (route) =>
    route.request().method() === "POST"
      ? route.abort("failed")
      : route.continue(),
  );
  await name.fill("结果未知的空间");
  await createWorkspace.click();
  await expect(
    page.getByText("创建结果未知。请先", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "返回列表核对", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/projects$/);
  await page.goBack();
  await expect(name).toHaveValue("结果未知的空间");
  await expect(createWorkspace).toBeDisabled();
  await page.unrouteAll();

  const workspace = await write(page, "/workspaces", {
    name: "连续创建项目的空间",
  });
  await page.goto(`/app/projects/new?workspaceId=${workspace.id}`);
  const projectName = page.getByRole("textbox", {
    name: "项目名称",
    exact: true,
  });
  const scope = page.getByRole("textbox", { name: "初始范围", exact: true });
  const createProject = page.getByRole("button", {
    name: "创建项目",
    exact: true,
  });
  await projectName.fill("未提交项目");
  await scope.fill("未提交的范围");
  await page.getByRole("link", { name: "← 我的项目", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/projects$/);
  await page.goBack();
  await expect(projectName).toHaveValue("未提交项目");
  await expect(scope).toHaveValue("未提交的范围");
  for (const value of ["连续创建项目一", "连续创建项目二"]) {
    await projectName.fill(value);
    await scope.fill("已确认创建范围");
    await createProject.click();
    await expect(page).toHaveURL(/projects\/[\da-f-]+$/);
    await expect(
      page.getByRole("heading", { name: value, exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(projectName).toHaveValue("");
    await expect(scope).toHaveValue("");
    await expect(page.getByRole("combobox")).toHaveValue(workspace.id);
    await expect(createProject).toBeEnabled();
  }
  await page.route("**/api/v1/projects", (route) =>
    route.request().method() === "POST"
      ? route.abort("failed")
      : route.continue(),
  );
  await projectName.fill("未知结果的项目");
  await scope.fill("必须保留的范围");
  await createProject.click();
  await expect(
    page.getByText("创建结果未知。请先", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "返回项目列表核对", exact: true })
    .click();
  await expect(page).toHaveURL(/projects\?workspaceId=/);
  await page.goBack();
  await expect(projectName).toHaveValue("未知结果的项目");
  await expect(scope).toHaveValue("必须保留的范围");
  await expect(createProject).toBeDisabled();
});

test("同账号聚焦、切页与恢复失败保留需求，换号和会话失效清除旧草稿", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const project = await projectFor(page);
  await page.goto(`/app/projects/${project.id}/requirements/new`);
  const title = page.getByRole("textbox", { name: "需求标题", exact: true });
  const text = page.getByRole("textbox", { name: "需求原文", exact: true });
  await title.fill("未提交的需求");
  await text.fill("切换标签页后仍需保留的内容");
  await recheck(page, text, "切换标签页后仍需保留的内容");
  await recheck(page, text, "切换标签页后仍需保留的内容", true);
  await page.route("**/api/v1/me", (route) => route.abort("failed"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "暂时无法恢复会话" }),
  ).toBeVisible();
  await expect(text).toBeHidden();
  await page.unrouteAll();
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(text).toHaveValue("切换标签页后仍需保留的内容");
  await expect(title).toHaveValue("未提交的需求");
  await switchAccount(page, accounts.b);
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: accounts.b.displayName, exact: true }),
  ).toBeVisible();
  await expect(page.locator("#originalText")).toHaveCount(0);
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "内容不存在",
  );
  await switchAccount(page, accounts.a);
  await expect(text).toHaveValue("");
  await title.fill("通知后必须清除");
  await page.evaluate(() => {
    const channel = new BroadcastChannel("specbridge-session");
    channel.postMessage("changed");
    channel.close();
  });
  await expect(title).toHaveValue("");
  await text.fill("过期后必须清除");
  expect(
    (
      await page.request.post("/api/v1/auth/logout", { headers: writeHeaders })
    ).status(),
  ).toBe(204);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("#originalText")).toHaveCount(0);
});

test("项目读取 500 和断网保留表单，403/404 清除并禁止旧缓存恢复", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const project = await projectFor(page);
  await page.goto(`/app/projects/${project.id}/requirements/new`);
  const field = page.getByRole("textbox", { name: "需求原文", exact: true });
  await field.fill("项目读取失败仍然保留");
  let failure = 500;
  const handler = (route: Route) =>
    failure === 0
      ? route.abort("failed")
      : route.fulfill({
          status: failure,
          json: { error: { code: "REQUEST_FAILED" } },
        });
  const url = `**/api/v1/projects/${project.id}`;
  await page.route(url, handler);
  await page.getByRole("button", { name: "刷新项目", exact: true }).click();
  await expect(
    page.getByText(
      "暂时无法读取项目，未保存的输入已保留。重新加载成功后可继续操作。",
    ),
  ).toBeVisible();
  await expect(field).toBeHidden();
  await expect(
    page.getByRole("button", { name: "创建需求", exact: true }),
  ).toBeHidden();
  failure = 0;
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "连接失败",
  );
  await page.unroute(url, handler);
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(field).toHaveValue("项目读取失败仍然保留");
  for (const denied of [403, 404]) {
    failure = denied;
    await page.route(url, handler);
    await page.getByRole("button", { name: "刷新项目", exact: true }).click();
    await expect(page.locator("#originalText")).toHaveCount(0);
    failure = 500;
    await page.getByRole("button", { name: "重新加载", exact: true }).click();
    await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
      "服务暂时不可用",
    );
    await expect(page.locator("#originalText")).toHaveCount(0);
    await page.unroute(url, handler);
    await page.getByRole("button", { name: "重新加载", exact: true }).click();
    await expect(field).toHaveValue("");
    await field.fill("下一次权限检查的草稿");
  }
});

test("Revision、失败商业草稿与审批弹窗评论在复核和临时项目故障后保留", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const project = await projectFor(page);
  const requirement = await write(
    page,
    `/projects/${project.id}/requirements`,
    { title: "规格保留", originalText: "原始诉求" },
  );
  const requirementPath = `/app/projects/${project.id}/requirements/${requirement.id}`;
  await page.goto(requirementPath);
  await page
    .getByRole("button", { name: "创建新 Revision", exact: true })
    .click();
  const content = page.getByRole("textbox", { name: "规格正文", exact: true });
  await content.fill("未提交的规格正文");
  await recheck(page, content, "未提交的规格正文", true);
  await page
    .getByRole("textbox", { name: "验收标准 1", exact: true })
    .fill("确认保留规格");
  await page
    .getByRole("button", { name: "保存为新 Revision", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "已保存，当前需求已更新" }),
  ).toBeVisible();
  await write(
    page,
    `/requirements/${requirement.id}/mark-ready`,
    { expectedVersion: 2 },
    200,
  );
  const change = await write(
    page,
    `/requirements/${requirement.id}/change-requests`,
    {},
  );
  await page.goto(`/app/projects/${project.id}/changes/${change.id}`);
  await page.getByRole("button", { name: "编辑商业草稿", exact: true }).click();
  const scope = page.getByRole("textbox", { name: "范围说明", exact: true });
  await scope.fill("网络故障时的商业评估草稿");
  await recheck(page, scope, "网络故障时的商业评估草稿");
  const projectUrl = `**/api/v1/projects/${project.id}`;
  await page.route(projectUrl, (route) =>
    route.fulfill({ status: 500, json: { error: { code: "INTERNAL_ERROR" } } }),
  );
  await page.route(`**/api/v1/change-requests/${change.id}`, (route) =>
    route.request().method() === "PATCH"
      ? route.abort("failed")
      : route.continue(),
  );
  await page.getByRole("button", { name: "保存商业草稿", exact: true }).click();
  await expect(
    page.getByText(
      "暂时无法读取项目，未保存的输入已保留。重新加载成功后可继续操作。",
    ),
  ).toBeVisible();
  await expect(scope).toBeHidden();
  await page.unrouteAll();
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(scope).toHaveValue("网络故障时的商业评估草稿");
  await expect(
    page.getByRole("button", { name: "保存商业草稿", exact: true }),
  ).toBeDisabled();

  // Complete a real frozen version, then verify preservation also covers the
  // dialog portal and doesn't accidentally submit a commercial decision.
  const revision = (
    await (
      await page.request.get(`/api/v1/requirements/${requirement.id}`)
    ).json()
  ).data.latestRevision;
  expect(
    (
      await page.request.put(`/api/v1/projects/${project.id}/client`, {
        headers: writeHeaders,
        data: { email: accounts.client.email },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.patch(`/api/v1/change-requests/${change.id}`, {
        headers: writeHeaders,
        data: {
          expectedVersion: 0,
          requirementRevisionId: revision.id,
          scopeSummary: "正式范围",
          estimateHours: "1.00",
          costDeltaMinor: 100,
          currency: "CNY",
          scheduleDeltaDays: 1,
          acceptanceCriteria: ["验收标准"],
        },
      })
    ).status(),
  ).toBe(200);
  await write(page, `/change-requests/${change.id}/submit`, {
    expectedVersion: 1,
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page.getByRole("button", { name: "批准此版本", exact: true }).click();
  const comment = page.getByRole("textbox", {
    name: "审批评论（可选，双方可见）",
    exact: true,
  });
  await comment.fill("尚未确认的审批评论");
  await recheck(page, comment, "尚未确认的审批评论", true);
  await page.getByRole("button", { name: "确认批准 v1", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "操作已完成，当前变更与审批历史已更新" }),
  ).toBeVisible();
  const saved = (
    await (
      await page.request.get(`/api/v1/change-requests/${change.id}`)
    ).json()
  ).data;
  expect(saved.status).toBe("VENDOR_APPROVED");
  expect(saved.activeVersion.approvals[0].comment).toBe("尚未确认的审批评论");
});
