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

const evidence = resolve(process.cwd(), process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence", "r07-g");
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
  expect(response.status(), path).toBe(status);
  return (await response.json()).data;
}
async function read(api: APIRequestContext, path: string) {
  const r = await api.get(`/api/v1${path}`);
  expect(r.status()).toBe(200);
  return (await r.json()).data;
}
async function setup(
  owner: Page,
  client: Page,
  accounts: { b: Account; client: Account },
) {
  const w = await write(owner.request, "post", "/workspaces", {
    name: "青禾交付团队",
  });
  const p = await write(owner.request, "post", "/projects", {
    workspaceId: w.id,
    name: "青禾 · 客户协作门户",
    baselineScope: "客户需求与交付确认",
  });
  const m = await write(owner.request, "post", `/workspaces/${w.id}/members`, {
    email: accounts.b.email,
  });
  await write(owner.request, "post", `/projects/${p.id}/members`, {
    userId: m.userId,
    role: "DEVELOPER",
  });
  await write(
    owner.request,
    "put",
    `/projects/${p.id}/client`,
    { email: accounts.client.email },
    200,
  );
  const r = await write(
    owner.request,
    "post",
    `/projects/${p.id}/requirements`,
    { title: "按月份导出已确认需求", originalText: "导出用于核对的需求清单" },
  );
  await write(owner.request, "post", `/requirements/${r.id}/revisions`, {
    expectedVersion: 1,
    content: "按月份导出 CSV，保留中文和确认版本。",
    acceptanceCriteria: ["中文无乱码；仅导出当前项目指定月份。"],
  });
  await write(
    owner.request,
    "post",
    `/requirements/${r.id}/mark-ready`,
    { expectedVersion: 2 },
    200,
  );
  const c = await write(
    owner.request,
    "post",
    `/requirements/${r.id}/change-requests`,
    {},
  );
  await write(
    owner.request,
    "patch",
    `/change-requests/${c.id}`,
    {
      expectedVersion: 0,
      scopeSummary: "按月份导出 CSV，保留中文和批准规格编号。",
      estimateHours: "12.00",
      costDeltaMinor: 120000,
      currency: "CNY",
      scheduleDeltaDays: 2,
      acceptanceCriteria: ["指定月份准确", "中文无乱码且保留规格编号"],
    },
    200,
  );
  await write(owner.request, "post", `/change-requests/${c.id}/submit`, {
    expectedVersion: 1,
  });
  await write(
    owner.request,
    "post",
    `/change-requests/${c.id}/vendor-decision`,
    { expectedVersion: 2, decision: "APPROVED" },
    200,
  );
  await write(
    client.request,
    "post",
    `/change-requests/${c.id}/client-decision`,
    { expectedVersion: 3, decision: "APPROVED" },
    200,
  );
  return { w, p, r, c };
}
async function submit(page: Page, number: number) {
  await page.getByRole("button", { name: "提交新交付", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "成果链接（HTTPS）" })
    .fill(`https://example.test/releases/${number}`);
  await dialog
    .getByRole("textbox", { name: "交付说明", exact: true })
    .fill(
      number === 1
        ? "已完成月份导出，请核对中文与版本编号。"
        : "已修复中文编码，补充规格编号与验证证据。",
    );
  await dialog
    .getByRole("textbox", { name: "证据链接" })
    .fill("https://example.test/evidence/report");
  await dialog
    .getByRole("button", { name: "确认提交交付", exact: true })
    .click();
  await expect(page).toHaveURL(/\/deliveries\/[\da-f-]+$/);
  await expect(
    page.getByRole("heading", { name: `交付详情 · D${number}`, exact: true }),
  ).toBeVisible();
  return page.url().split("/").at(-1)!;
}
async function dashboard(page: Page, project: string, bucket = "mine") {
  await page.goto(`/app?projectId=${project}&bucket=${bucket}`);
  await expect(page.getByTestId("project-count")).toHaveText("1");
  return read(page.request, `/dashboard?projectId=${project}&bucket=${bucket}`);
}

test("真实退回→新交付→接受，真实聚合/审计隔离、终态与历史深链接", async ({
  page: owner,
  browser,
  accounts,
}) => {
  test.setTimeout(90_000);
  await mkdir(evidence, { recursive: true });
  const dc = await browser.newContext({ baseURL: origin });
  const cc = await browser.newContext({ baseURL: origin });
  const dev = await dc.newPage();
  const client = await cc.newPage();
  const errors: string[] = [];
  for (const page of [dev, client])
    page.on("pageerror", (e) => errors.push(e.name));
  try {
    await login(owner, accounts.a);
    await login(dev, accounts.b);
    await login(client, accounts.client);
    const { w, p, r, c } = await setup(owner, client, accounts);
    const base = `/app/projects/${p.id}`;
    const cr = `${base}/changes/${c.id}`;
    const hidden = await write(owner.request, "post", "/projects", {
      workspaceId: w.id,
      name: "内部隔离项目",
      baselineScope: "客户不可见",
    });
    // Later revisions do not invalidate the approved delivery basis.
    await write(owner.request, "post", `/requirements/${r.id}/revisions`, {
      expectedVersion: 3,
      content: "下一阶段范围，不能覆盖旧批准规格",
      acceptanceCriteria: ["新范围另行审批"],
    });
    const before = await dashboard(dev, p.id);
    expect(
      before.items.some((i: { type: string }) => i.type === "SUBMIT_DELIVERY"),
    ).toBe(true);
    expect(before.summary.deliveryCounts).toEqual({
      SUBMITTED: 0,
      CHANGES_REQUESTED: 0,
      ACCEPTED: 0,
    });
    await dev.goto(cr);
    const requests: object[] = [];
    for (const page of [dev, client])
      page.on("request", (req) => {
        if (
          req.method() === "POST" &&
          /\/deliveries(?:\/[^/]+\/review)?$/.test(req.url())
        )
          requests.push(req.postDataJSON());
      });
    const first = await submit(dev, 1);
    await expect(
      dev.getByText("下一阶段范围，不能覆盖旧批准规格", { exact: true }),
    ).toHaveCount(0);
    await expect(
      dev.getByRole("button", { name: "接受交付", exact: true }),
    ).toHaveCount(0);
    await write(
      dev.request,
      "post",
      `/deliveries/${first}/review`,
      { decision: "ACCEPTED" },
      403,
    );
    await write(
      dev.request,
      "post",
      `/change-requests/${c.id}/deliveries`,
      { artifactUrl: "https://example.test/duplicate", summary: "重复" },
      409,
    );
    const waiting = await dashboard(dev, p.id, "waiting");
    expect(
      waiting.items.some((i: { type: string }) => i.type === "REVIEW_DELIVERY"),
    ).toBe(true);
    const mine = await dashboard(client, p.id);
    expect(
      mine.items.some((i: { entityId: string }) => i.entityId === first),
    ).toBe(true);
    await client.goto(`${base}/deliveries/${first}`);
    await client.getByRole("button", { name: "退回修改", exact: true }).click();
    let dialog = client.getByRole("dialog");
    await dialog.getByRole("button", { name: "确认退回", exact: true }).click();
    await expect(
      dialog.getByText("请填写退回意见", { exact: true }),
    ).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "退回意见" })
      .fill("中文编码不正确，请修复并补充验证证据。");
    await dialog.getByRole("button", { name: "确认退回", exact: true }).click();
    await expect(
      client.getByRole("status").filter({ hasText: "验收决定已保存" }),
    ).toBeVisible();
    await client.reload();
    await expect(
      client.getByText("中文编码不正确，请修复并补充验证证据。", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      client.getByRole("button", { name: "退回修改", exact: true }),
    ).toHaveCount(0);
    const returned = await dashboard(dev, p.id);
    expect(
      returned.items.some(
        (i: { type: string }) => i.type === "REVISE_DELIVERY",
      ),
    ).toBe(true);
    await dev.goto(cr);
    const second = await submit(dev, 2);
    expect(second).not.toBe(first);
    await client.goto(`${base}/deliveries/${second}`);
    await client.getByRole("button", { name: "接受交付", exact: true }).click();
    dialog = client.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "验收评论" })
      .fill("月份、中文与规格编号均已核对，验收通过。");
    await client.setViewportSize({ width: 390, height: 844 });
    await expect(dialog).toBeVisible();
    await client.screenshot({
      path: resolve(evidence, "client-accept-mobile.png"),
      animations: "disabled",
    });
    await dialog.getByRole("button", { name: "确认接受", exact: true }).click();
    await expect(
      client.getByText("此批准版本已验收，流程完成。不能重复验收或继续交付。", {
        exact: true,
      }),
    ).toBeVisible();
    await client.reload();
    await expect(
      client.getByRole("button", { name: "接受交付", exact: true }),
    ).toHaveCount(0);
    await write(
      client.request,
      "post",
      `/deliveries/${second}/review`,
      { decision: "ACCEPTED" },
      409,
    );
    await write(
      dev.request,
      "post",
      `/change-requests/${c.id}/deliveries`,
      { artifactUrl: "https://example.test/third", summary: "已完成后重复" },
      409,
    );
    await dev.goto(cr);
    await expect(
      dev.getByText("此批准版本已验收，不能继续交付。", { exact: true }),
    ).toBeVisible();
    await expect(
      dev.getByRole("button", { name: "提交新交付", exact: true }),
    ).toHaveCount(0);
    for (const body of requests)
      expect(body).not.toHaveProperty("expectedVersion");
    expect(requests).toHaveLength(4);
    await dev.goto(`${base}/deliveries?changeRequestId=${c.id}`);
    await expect(
      dev.getByRole("link", { name: `${r.title} · v1 / D1`, exact: true }),
    ).toBeVisible();
    await dev.getByLabel("交付状态", { exact: true }).selectOption("ACCEPTED");
    await expect(dev).toHaveURL(/status=ACCEPTED/);
    await dev.reload();
    await expect(
      dev.getByRole("link", { name: `${r.title} · v1 / D2`, exact: true }),
    ).toBeVisible();
    await expect(
      dev.getByRole("link", { name: `${r.title} · v1 / D1`, exact: true }),
    ).toHaveCount(0);
    const completed = await dashboard(client, p.id, "completed");
    expect(completed.summary.deliveryCounts).toEqual({
      SUBMITTED: 0,
      CHANGES_REQUESTED: 1,
      ACCEPTED: 1,
    });
    expect(completed.summary.buckets.completed).toBe(1);
    expect(
      completed.items.map((i: { entityId: string }) => i.entityId),
    ).toEqual([second]);
    await expect(client.getByTestId("count-completed")).toHaveText("1");
    const allClient = await read(client.request, "/dashboard");
    expect(allClient.summary.projectCount).toBe(1);
    expect(JSON.stringify(allClient)).not.toContain(hidden.id);
    const ownerEvents = await read(
      owner.request,
      `/projects/${p.id}/audit-events?limit=100`,
    );
    const clientEvents = await read(
      client.request,
      `/projects/${p.id}/audit-events?limit=100`,
    );
    expect(
      ownerEvents.some(
        (e: { eventType: string }) =>
          e.eventType === "change_request.draft_updated",
      ),
    ).toBe(true);
    expect(
      clientEvents.some(
        (e: { eventType: string }) =>
          e.eventType.startsWith("project.") ||
          [
            "change_request.created",
            "change_request.draft_updated",
            "change_request.reopened",
          ].includes(e.eventType),
      ),
    ).toBe(false);
    expect(
      clientEvents.filter(
        (e: { eventType: string }) => e.eventType === "delivery.reviewed",
      ),
    ).toHaveLength(2);
    for (const event of clientEvents)
      for (const forbidden of [
        "comment",
        "artifactUrl",
        "email",
        "costDeltaMinor",
        "summary",
      ])
        expect(event.metadata).not.toHaveProperty(forbidden);
    for (const path of [
      `/projects/${hidden.id}/audit-events`,
      `/projects/${hidden.id}/deliveries`,
      `/dashboard?projectId=${hidden.id}`,
    ])
      expect((await client.request.get(`/api/v1${path}`)).status()).toBe(404);
    await owner.goto(`/app/projects/${hidden.id}/deliveries/${second}`);
    await expect(
      owner.getByText("内容不存在，或当前账号无权访问。", { exact: true }),
    ).toBeVisible();
    await client.goto(`${base}/audit`);
    await client.getByLabel("活动类型").selectOption("delivery.reviewed");
    await expect(client).toHaveURL(/eventType=delivery.reviewed/);
    await client.reload();
    await expect(
      client.getByRole("heading", { name: "客户验收决定 · 接受", exact: true }),
    ).toBeVisible();
    await expect(
      client.getByRole("heading", {
        name: "客户验收决定 · 退回修改",
        exact: true,
      }),
    ).toBeVisible();
    await client
      .getByRole("link", { name: "查看记录 →", exact: true })
      .first()
      .click();
    await expect(client).toHaveURL(`${origin}${base}/deliveries/${second}`);
    await client
      .getByRole("link", { name: "独立批准版本详情 →", exact: true })
      .click();
    await client.reload();
    await expect(
      client.getByRole("heading", { name: "冻结版本 v1", exact: true }).first(),
    ).toBeVisible();
    await owner.goto(`${base}/audit`);
    await owner.getByRole("button", { name: "下一页", exact: true }).click();
    await expect(owner).toHaveURL(/offset=12/);
    await owner.reload();
    await expect(owner.getByText("第 2 页", { exact: true })).toBeVisible();
    // Pagination never changes the summary; all thirteen ready-to-prepare items are real API writes.
    for (let i = 0; i < 13; i++)
      await write(
        owner.request,
        "post",
        `/projects/${hidden.id}/requirements`,
        { title: `内部需求 ${i}`, originalText: "仅供应方项目" },
      );
    await dashboard(owner, hidden.id);
    await expect(owner.getByTestId("count-mine")).toHaveText("14");
    await owner
      .getByRole("region", { name: "工作事项" })
      .getByRole("button", { name: "下一页", exact: true })
      .click();
    await expect(owner).toHaveURL(/offset=12/);
    await owner.reload();
    await expect(owner.getByTestId("count-mine")).toHaveText("14");
    await dashboard(owner, p.id, "completed");
    await expect(owner.getByRole("region", { name: "概览范围", exact: true })).toHaveCSS("display", "flex");
    await owner.evaluate(() =>
      window.scrollTo({ top: 0, behavior: "instant" }),
    );
    await owner.screenshot({
      path: resolve(evidence, "dashboard-desktop.png"),
      animations: "disabled",
      mask: [owner.getByTestId("account-email")],
    });
    await client.setViewportSize({ width: 320, height: 844 });
    await dashboard(client, p.id, "completed");
    expect(
      await client.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await client.goto(`${base}/audit`);
    expect(
      await client.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await dc.close();
    await cc.close();
  }
});

test("终审竞争不重放、未知提交不重发、真实概览错误与缓存刷新", async ({
  page: owner,
  browser,
  accounts,
}) => {
  test.setTimeout(90_000);
  const cc = await browser.newContext({ baseURL: origin });
  const client = await cc.newPage();
  const errors: string[] = [];
  client.on("pageerror", (e) => errors.push(e.name));
  try {
    await login(owner, accounts.a);
    await login(client, accounts.client);
    const { p, c } = await setup(owner, client, accounts);
    const base = `/app/projects/${p.id}`;
    const cr = `${base}/changes/${c.id}`;
    await owner.goto(cr);
    await owner
      .getByRole("button", { name: "提交新交付", exact: true })
      .click();
    let dialog = owner.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "成果链接（HTTPS）" })
      .fill("javascript:alert(1)");
    await dialog
      .getByRole("textbox", { name: "交付说明", exact: true })
      .fill("保留输入的交付说明");
    await dialog
      .getByRole("button", { name: "确认提交交付", exact: true })
      .click();
    await expect(dialog.getByText(/请输入完整 HTTPS 链接/)).toBeVisible();
    expect(
      await read(owner.request, `/change-requests/${c.id}/deliveries`),
    ).toEqual([]);
    await dialog
      .getByRole("textbox", { name: "成果链接（HTTPS）" })
      .fill("https://example.test/risk/1");
    await dialog
      .getByRole("textbox", { name: "证据链接" })
      .fill("https:///example.test");
    await dialog
      .getByRole("button", { name: "确认提交交付", exact: true })
      .click();
    await expect(
      dialog.getByText("每行须为有效 HTTPS 证据链接", { exact: true }),
    ).toBeVisible();
    await dialog.getByRole("textbox", { name: "证据链接" }).fill("");
    await dialog
      .getByRole("button", { name: "确认提交交付", exact: true })
      .click();
    await expect(owner).toHaveURL(/\/deliveries\/[\da-f-]+$/);
    const first = owner.url().split("/").at(-1)!;
    await dashboard(client, p.id);
    await expect(client.getByTestId("count-mine")).toHaveText("1");
    await client
      .getByRole("region", { name: "工作事项" })
      .getByRole("link", { name: "查看：按月份导出已确认需求", exact: true })
      .click();
    await client.getByRole("button", { name: "接受交付", exact: true }).click();
    dialog = client.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "验收评论" })
      .fill("旧窗口未提交的决定");
    // Another real request settles D1 while this browser still holds its confirmation.
    await write(
      client.request,
      "post",
      `/deliveries/${first}/review`,
      { decision: "CHANGES_REQUESTED", comment: "另一窗口已退回" },
      200,
    );
    let attempts = 0;
    client.on("request", (req) => {
      if (
        req.method() === "POST" &&
        req.url().endsWith(`/deliveries/${first}/review`)
      )
        attempts++;
    });
    await dialog.getByRole("button", { name: "确认接受", exact: true }).click();
    await expect(
      dialog.getByText("此记录已有决定，请刷新核对历史。", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "验收评论" })).toHaveValue(
      "旧窗口未提交的决定",
    );
    await expect(
      dialog.getByRole("button", { name: "确认接受", exact: true }),
    ).toBeDisabled();
    expect(attempts).toBe(1);
    await dialog.getByRole("button", { name: "关闭", exact: true }).click();
    // Next Activity preserves the previous dashboard; invalidation must update it.
    await client.goBack();
    await expect(client.getByTestId("count-mine")).toHaveText("0");
    await expect(client.getByTestId("count-waiting")).toHaveText("1");
    // Return via a Next Link to the preserved CR, rather than a full page load.
    await owner
      .getByRole("link", { name: "查看批准变更与交付入口 →", exact: true })
      .click();
    await owner.getByRole("button", { name: "刷新变更", exact: true }).click();
    await expect(
      owner.getByRole("button", { name: "提交新交付", exact: true }),
    ).toBeEnabled();
    await owner
      .getByRole("button", { name: "提交新交付", exact: true })
      .click();
    dialog = owner.getByRole("dialog");
    await expect(
      dialog.getByRole("textbox", { name: "成果链接（HTTPS）" }),
    ).toHaveValue("");
    await dialog
      .getByRole("textbox", { name: "成果链接（HTTPS）" })
      .fill("https://example.test/risk/2");
    await dialog
      .getByRole("textbox", { name: "交付说明", exact: true })
      .fill("响应丢失也保留输入");
    let createAttempts = 0;
    await owner.route(
      `**/api/v1/change-requests/${c.id}/deliveries`,
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        createAttempts++;
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        await route.abort("failed");
      },
    );
    await dialog
      .getByRole("button", { name: "确认提交交付", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "确认提交交付", exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByText(/连接失败/)).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "交付说明", exact: true }),
    ).toHaveValue("响应丢失也保留输入");
    const history = await read(
      owner.request,
      `/change-requests/${c.id}/deliveries`,
    );
    expect(history).toHaveLength(2);
    expect(history[0].deliveryNo).toBe(2);
    expect(history[1].review.comment).toBe("另一窗口已退回");
    expect(createAttempts).toBe(1);
    await owner.unrouteAll({ behavior: "wait" });
    owner.once("dialog", (d) => d.accept());
    await dialog.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(
      owner.getByText(
        "提交结果未知，请先查看交付历史核对；不会自动再次提交。",
        { exact: true },
      ),
    ).toBeVisible();
    await owner
      .getByRole("link", { name: "查看此变更的交付历史 →", exact: true })
      .click();
    await expect(
      owner.getByRole("link", {
        name: "按月份导出已确认需求 · v1 / D2",
        exact: true,
      }),
    ).toBeVisible();
    // A failed real GET is shown as an error; stale/placeholder zero statistics are never rendered.
    await client.route("**/api/v1/dashboard?**", (route) =>
      route.abort("failed"),
    );
    await client
      .getByRole("button", { name: "刷新工作概览", exact: true })
      .click();
    await expect(client.getByText(/连接失败/)).toBeVisible();
    await expect(client.getByTestId("count-mine")).toHaveCount(0);
    await client.unrouteAll({ behavior: "wait" });
    await client.getByRole("button", { name: "重新加载", exact: true }).click();
    await expect(client.getByTestId("count-mine")).toHaveText("1");
    expect(errors).toEqual([]);
  } finally {
    await cc.close();
  }
});
