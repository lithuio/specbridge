import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { test, expect, login, origin } from "./fixtures";
import { accessibility } from "./accessibility";

const evidence = resolve(process.cwd(), process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence", "r07-h");
const title = "按月份导出已确认需求与规格编号";
const specification =
  "按创建月份导出本项目 UTF-8 CSV。\n包含标题、状态与已确认规格编号；空月份显示无数据。\n" +
  "长内容核对：仅导出当前项目授权范围，中文与换行应完整保留。".repeat(12);
async function saved(page: Page, text: string) {
  await expect(
    page.getByRole("status").filter({ hasText: text }),
  ).toBeVisible();
}
async function submitChange(page: Page) {
  await page.getByRole("button", { name: "正式提交审批", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认正式提交", exact: true })
    .click();
  await saved(page, "操作已完成");
}
async function decide(
  page: Page,
  choice: "批准" | "拒绝",
  version: number,
  comment: string,
) {
  await page
    .getByRole("button", { name: `${choice}此版本`, exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "审批评论（可选，双方可见）" })
    .fill(comment);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: `确认${choice} v${version}`, exact: true })
    .click();
  await saved(page, "操作已完成");
}
async function deliver(page: Page, number: number) {
  if (number === 1) {
    const trigger = page.getByRole("button", {
      name: "提交新交付",
      exact: true,
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  await page.getByRole("button", { name: "提交新交付", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "成果链接（HTTPS）" })
    .fill(`https://example.test/releases/monthly-export-${number}`);
  await dialog
    .getByRole("textbox", { name: "交付说明", exact: true })
    .fill(
      number === 1
        ? "月份导出已完成，请核对中文编码。"
        : "已修复中文编码，空月份提示和版本编号均已验证。",
    );
  await dialog
    .getByRole("textbox", { name: "证据链接" })
    .fill("https://example.test/reports/monthly-export");
  await dialog
    .getByRole("button", { name: "确认提交交付", exact: true })
    .click();
  await expect(page).toHaveURL(/\/deliveries\/[\da-f-]+$/);
  await expect(
    page.getByRole("heading", { name: `交付详情 · D${number}`, exact: true }),
  ).toBeVisible();
  return new URL(page.url()).pathname;
}
async function screenshot(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: resolve(evidence, name),
    fullPage: true,
    animations: "disabled",
    mask: [page.getByTestId("account-email"), page.getByTestId("member-email")],
    maskColor: "#E2E6ED",
  });
}

test("三角色纯 UI 全链路：准备→澄清→拒绝重提→退回重交→历史与真实聚合；正式页面可访问性", async ({
  page: owner,
  browser,
  accounts,
}) => {
  test.setTimeout(180_000);
  await mkdir(evidence, { recursive: true });
  const dc = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
  });
  const cc = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
  });
  const dev = await dc.newPage();
  const client = await cc.newPage();
  const errors: string[] = [];
  const checks: Awaited<ReturnType<typeof accessibility>>[] = [];
  for (const page of [dev, client])
    page.on("pageerror", (e) => errors.push(e.name));
  try {
    await owner.goto("/login");
    await expect(
      owner.getByRole("heading", { name: "欢迎回来" }),
    ).toBeVisible();
    checks.push(await accessibility(owner, "login-desktop"));
    await login(owner, accounts.a);
    await login(dev, accounts.b);
    await login(client, accounts.client);
    // All business setup and transitions below use the production UI. API reads
    // only corroborate persisted results; no setup SQL or business API writes.
    await owner.goto("/app/projects");
    await owner
      .getByRole("link", { name: "创建工作空间", exact: true })
      .click();
    await owner.getByLabel("空间名称").fill("青禾产品团队");
    await owner
      .getByRole("button", { name: "创建工作空间", exact: true })
      .click();
    await expect(owner).toHaveURL(/projects\?workspaceId=/);
    await owner.getByRole("link", { name: "创建项目", exact: true }).click();
    await owner.getByLabel("项目名称").fill("青禾 · 客户协作门户");
    await owner
      .getByLabel("初始范围", { exact: true })
      .fill("统一客户需求入口与交付确认。范围仅作参考；商业变更必须双方确认。");
    await owner.getByRole("button", { name: "创建项目", exact: true }).click();
    await expect(owner).toHaveURL(/projects\/[\da-f-]+$/);
    const base = new URL(owner.url()).pathname;
    const projectId = base.split("/").at(-1)!;
    await owner.getByRole("link", { name: "项目成员", exact: true }).click();
    await owner.getByRole("link", { name: "管理供应方成员" }).click();
    await owner.getByLabel("开发成员邮箱").fill(accounts.b.email);
    await owner.getByRole("button", { name: "添加到工作空间" }).click();
    await saved(owner, "已保存");
    await owner.goto(`${base}/members`);
    await owner
      .getByRole("button", {
        name: `分配 ${accounts.b.displayName}`,
        exact: true,
      })
      .click();
    await expect(
      owner.getByRole("button", { name: `已分配 ${accounts.b.displayName}` }),
    ).toBeDisabled();
    await owner.getByLabel("客户邮箱").fill(accounts.client.email);
    await owner.getByRole("button", { name: "绑定客户", exact: true }).click();
    await expect(
      owner.getByText(`当前客户：${accounts.client.displayName}`),
    ).toBeVisible();
    checks.push(await accessibility(owner, "owner-members-desktop"));

    await client.goto(`${base}/requirements`);
    await client.getByRole("link", { name: "创建需求", exact: true }).click();
    await client
      .getByRole("textbox", { name: "需求标题", exact: true })
      .fill(title);
    await client
      .getByRole("textbox", { name: "需求原文", exact: true })
      .fill(
        "希望按月份导出项目需求，便于核对已确认的范围。中文与换行须完整保留。",
      );
    await client
      .getByRole("textbox", { name: "需求标题", exact: true })
      .fill("");
    await client.getByRole("button", { name: "创建需求", exact: true }).click();
    await expect(
      client.getByRole("alert").filter({ hasText: "请填写需求标题" }),
    ).toBeVisible();
    await expect(
      client.getByRole("textbox", { name: "需求标题", exact: true }),
    ).toHaveAccessibleDescription("请填写需求标题");
    await client
      .getByRole("textbox", { name: "需求标题", exact: true })
      .fill(title);
    checks.push(await accessibility(client, "client-requirement-form"));
    await client.getByRole("button", { name: "创建需求", exact: true }).click();
    await expect(client).toHaveURL(/requirements\/[\da-f-]+$/);
    const requirement = new URL(client.url()).pathname;
    await dev.goto(requirement);
    await dev.getByRole("button", { name: "提出问题", exact: true }).click();
    await dev.getByLabel("问题内容").fill("包含哪些字段？空月份应如何处理？");
    await dev.getByRole("button", { name: "提交问题" }).click();
    await saved(dev, "已保存");
    await client.reload();
    await client
      .getByRole("button", { name: "回答问题 1", exact: true })
      .click();
    await client
      .getByLabel("回答内容")
      .fill("标题、状态和规格编号；空月份显示无数据提示。");
    await client.getByRole("button", { name: "提交回答" }).click();
    await saved(client, "已保存");
    await dev.reload();
    await dev
      .getByRole("button", { name: "创建新 Revision", exact: true })
      .click();
    await dev.getByLabel("规格正文").fill(specification);
    await dev
      .getByLabel("验收标准 1", { exact: true })
      .fill("月份准确、中文完整；空月份有提示，导出保留规格编号。");
    await dev.getByRole("button", { name: "保存为新 Revision" }).click();
    await saved(dev, "已保存");
    await dev.getByRole("button", { name: "标记就绪", exact: true }).click();
    await dev
      .getByRole("button", { name: "确认标记就绪", exact: true })
      .click();
    await expect(dev.getByText("规格已就绪", { exact: true })).toBeVisible();
    checks.push(
      await accessibility(dev, "developer-ready-desktop-long-content"),
    );
    await dev.setViewportSize({ width: 320, height: 844 });
    checks.push(await accessibility(dev, "developer-ready-320"));
    for (const link of await dev
      .getByRole("navigation", { name: "项目导航", exact: true })
      .getByRole("link")
      .all()) {
      await link.focus();
      await expect(link).toBeInViewport();
    }
    await dev.setViewportSize({ width: 1440, height: 1000 });

    await dev
      .getByRole("button", { name: "创建商业评估", exact: true })
      .click();
    await expect(dev).toHaveURL(/changes\/[\da-f-]+$/);
    const change = new URL(dev.url()).pathname;
    const changeId = change.split("/").at(-1)!;
    await dev.getByRole("button", { name: "编辑商业草稿" }).click();
    await dev
      .getByRole("textbox", { name: "范围说明", exact: true })
      .fill(
        "按月份导出 UTF-8 CSV，包含标题、状态和规格编号；空月份显示无数据。",
      );
    await dev
      .getByRole("textbox", { name: "评估工时（小时）", exact: true })
      .fill("12.00");
    await dev
      .getByRole("textbox", { name: "费用变化（最小单位）", exact: true })
      .fill("120000");
    await dev.getByLabel("币种", { exact: true }).selectOption("CNY");
    await dev
      .getByRole("textbox", { name: "工期变化（天）", exact: true })
      .fill("2");
    await dev
      .getByRole("button", { name: "添加商业验收标准", exact: true })
      .click();
    await dev
      .getByRole("textbox", { name: "商业验收标准 1", exact: true })
      .fill("指定月份准确、中文无乱码且包含批准规格编号。");
    checks.push(await accessibility(dev, "developer-commercial-form"));
    await dev.getByRole("button", { name: "保存商业草稿" }).click();
    await saved(dev, "操作已完成");
    await submitChange(dev);
    await owner.goto(`/app?projectId=${projectId}`);
    await expect(owner.getByTestId("count-mine")).toHaveText("1");
    await owner
      .getByRole("link", { name: `查看：${title}`, exact: true })
      .click();
    await expect(owner).toHaveURL(change);
    await decide(owner, "批准", 1, "工时与费用已核对。");
    await client.goto(change);
    await decide(client, "拒绝", 1, "请在验收标准中明确空月份提示。");
    await dev.reload();
    await dev.getByRole("button", { name: "重开评估", exact: true }).click();
    await dev
      .getByRole("dialog")
      .getByRole("button", { name: "确认重开评估", exact: true })
      .click();
    await saved(dev, "操作已完成");
    await dev.getByRole("button", { name: "编辑商业草稿" }).click();
    await dev
      .getByRole("textbox", { name: "商业验收标准 1", exact: true })
      .fill(
        "指定月份准确、中文无乱码且包含批准规格编号；空月份显示无数据提示。",
      );
    await dev.getByRole("button", { name: "保存商业草稿" }).click();
    await saved(dev, "操作已完成");
    await submitChange(dev);
    const unreviewed = (
      await (
        await dev.request.get(`/api/v1/change-requests/${changeId}`)
      ).json()
    ).data;
    expect(unreviewed.activeVersion.versionNo).toBe(2);
    expect(unreviewed.activeVersion.approvals).toEqual([]);
    await owner.reload();
    await decide(owner, "批准", 2, "已补充空月份验收标准，重新批准 v2。");
    await client.reload();
    await expect(
      client.getByRole("button", { name: "批准此版本" }),
    ).toBeVisible();
    checks.push(await accessibility(client, "client-approval-desktop"));
    await screenshot(client, "client-approval-desktop.png");
    // Keyboard enters the commercial confirmation, traps focus, closes and returns.
    const trigger = client.getByRole("button", {
      name: "批准此版本",
      exact: true,
    });
    await trigger.focus();
    await client.keyboard.press("Enter");
    await expect(client.getByRole("dialog")).toBeVisible();
    for (let i = 0; i < 8; i++) {
      await client.keyboard.press("Tab");
      await expect
        .poll(() =>
          client
            .getByRole("dialog")
            .evaluate((el) => el.contains(document.activeElement)),
        )
        .toBe(true);
    }
    await client.keyboard.press("Escape");
    await expect(client.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await decide(client, "批准", 2, "确认 v2 范围、费用与工期。");
    const approved = (
      await (
        await client.request.get(`/api/v1/change-requests/${changeId}`)
      ).json()
    ).data;
    expect(approved).not.toHaveProperty("draft");
    expect(approved.status).toBe("APPROVED");
    expect(
      approved.activeVersion.approvals.map(
        (a: { changeRequestVersionId: string }) => a.changeRequestVersionId,
      ),
    ).toEqual([approved.activeVersionId, approved.activeVersionId]);

    await dev.reload();
    const first = await deliver(dev, 1);
    await client.goto(first);
    const reviewTrigger = client.getByRole("button", {
      name: "退回修改",
      exact: true,
    });
    await reviewTrigger.focus();
    await client.keyboard.press("Enter");
    await expect(client.getByRole("dialog")).toBeVisible();
    await client.keyboard.press("Escape");
    await expect(client.getByRole("dialog")).toHaveCount(0);
    await expect(reviewTrigger).toBeFocused();
    await client.getByRole("button", { name: "退回修改", exact: true }).click();
    await client
      .getByRole("dialog")
      .getByRole("textbox", { name: "退回意见" })
      .fill("中文编码不正确，请修复并补充验证证据。");
    await client
      .getByRole("dialog")
      .getByRole("button", { name: "确认退回", exact: true })
      .click();
    await saved(client, "验收决定已保存");
    await dev.goto(`/app?projectId=${projectId}`);
    await expect(
      dev.getByText("修改后重新交付", { exact: true }),
    ).toBeVisible();
    await dev
      .getByRole("link", { name: `查看：${title}`, exact: true })
      .click();
    const second = await deliver(dev, 2);
    expect(second).not.toBe(first);
    await client.goto(second);
    await client.setViewportSize({ width: 390, height: 844 });
    await client.getByRole("button", { name: "接受交付", exact: true }).click();
    await client
      .getByRole("dialog")
      .getByRole("textbox", { name: "验收评论" })
      .fill("月份、中文、空月份提示和规格编号均已核对。");
    checks.push(await accessibility(client, "client-accept-dialog-mobile"));
    for (let i = 0; i < 12; i++) {
      await client.keyboard.press(i < 6 ? "Tab" : "Shift+Tab");
      await expect
        .poll(() =>
          client
            .getByRole("dialog")
            .evaluate((el) => el.contains(document.activeElement)),
        )
        .toBe(true);
    }
    await client.screenshot({
      path: resolve(evidence, "client-accept-mobile.png"),
      animations: "disabled",
    });
    await client
      .getByRole("dialog")
      .getByRole("button", { name: "确认接受", exact: true })
      .click();
    await expect(
      client.getByText("此批准版本已验收，流程完成。不能重复验收或继续交付。", {
        exact: true,
      }),
    ).toBeVisible();
    await client.reload();
    await expect(
      client.getByRole("button", { name: "接受交付", exact: true }),
    ).toHaveCount(0);
    checks.push(await accessibility(client, "client-accepted-mobile"));

    await client.goto(first);
    await client.reload();
    await expect(
      client.getByText("中文编码不正确，请修复并补充验证证据。", {
        exact: true,
      }),
    ).toBeVisible();
    const old = approved.versions.find(
      (v: { versionNo: number }) => v.versionNo === 1,
    );
    await client.goto(`${change}/versions/${old.id}`);
    await client.reload();
    await expect(
      client.getByText("请在验收标准中明确空月份提示。", { exact: true }),
    ).toBeVisible();
    await client.setViewportSize({ width: 320, height: 844 });
    checks.push(await accessibility(client, "client-rejected-history-320"));
    await client.goto(
      `${requirement}/revisions/${approved.activeVersion.requirementRevisionId}`,
    );
    await client.reload();
    await expect(
      client.getByRole("heading", { name: "Revision 1", exact: true }),
    ).toBeVisible();
    await expect(client.locator(".record-text")).toHaveText(specification);

    await client.goto(`${base}/audit?eventType=delivery.reviewed`);
    await expect(client.locator(".audit-timeline > li")).toHaveCount(2);
    await expect(
      client.getByRole("heading", { name: "客户验收决定 · 接受", exact: true }),
    ).toBeVisible();
    await expect(
      client.getByRole("heading", {
        name: "客户验收决定 · 退回修改",
        exact: true,
      }),
    ).toBeVisible();
    checks.push(await accessibility(client, "client-audit-320"));
    await client.setViewportSize({ width: 1440, height: 1000 });
    checks.push(await accessibility(client, "client-audit-desktop"));
    await screenshot(client, "client-audit-desktop.png");
    await client
      .locator(".audit-timeline > li")
      .first()
      .getByRole("link", { name: "查看记录 →" })
      .click();
    await expect(client).toHaveURL(second);

    for (const actor of [owner, dev, client]) {
      await actor.goto(`/app?projectId=${projectId}&bucket=completed`);
      await expect(actor.getByTestId("count-completed")).toHaveText("1");
      await expect(actor.getByTestId("count-mine")).toHaveText("0");
      await expect(actor.getByTestId("count-waiting")).toHaveText("0");
      await expect(
        actor.getByRole("link", { name: `查看：${title}`, exact: true }),
      ).toHaveAttribute("href", second);
    }
    checks.push(await accessibility(dev, "developer-dashboard-desktop"));
    await screenshot(dev, "developer-dashboard-desktop.png");
    // 200% layout equivalent and tablet/phone use the same real completed data.
    await dev.setViewportSize({ width: 720, height: 500 });
    checks.push(
      await accessibility(dev, "dashboard-half-desktop-css-viewport"),
    );
    await dev.setViewportSize({ width: 900, height: 1000 });
    checks.push(await accessibility(dev, "dashboard-tablet"));
    await dev.setViewportSize({ width: 390, height: 844 });
    checks.push(await accessibility(dev, "dashboard-mobile"));
    await screenshot(dev, "developer-dashboard-mobile.png");
    const drawer = dev.getByRole("button", { name: "打开导航" });
    await drawer.focus();
    await dev.keyboard.press("Enter");
    checks.push(await accessibility(dev, "navigation-drawer-mobile"));
    for (let i = 0; i < 12; i++) {
      await dev.keyboard.press(i < 6 ? "Tab" : "Shift+Tab");
      await expect
        .poll(() =>
          dev
            .getByRole("dialog")
            .evaluate((el) => el.contains(document.activeElement)),
        )
        .toBe(true);
    }
    await dev.keyboard.press("Escape");
    await expect(drawer).toBeFocused();
    expect(errors).toEqual([]);
    await writeFile(
      resolve(evidence, "accessibility.json"),
      JSON.stringify(
        { engine: "axe-core", version: "4.14.0", checks },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await dc.close();
    await cc.close();
  }
});
