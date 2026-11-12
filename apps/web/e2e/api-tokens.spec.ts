import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { test, expect, login, writeHeaders } from "./fixtures";
import { accessibility } from "./accessibility";
const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence",
  "r08-d",
);
async function post(page: Page, path: string, data: object) {
  const res = await page.request.post("/api/v1" + path, {
    headers: writeHeaders,
    data,
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}
async function project(page: Page) {
  const w = await post(page, "/workspaces", { name: "青禾产品团队" });
  const p = await post(page, "/projects", {
    workspaceId: w.id,
    name: "青禾 · 只读项目助手",
    baselineScope: "需求协作与交付确认",
  });
  await page.goto(`/app/projects/${p.id}`);
  await page.getByRole("link", { name: "访问凭据", exact: true }).click();
  await expect(page.getByText("尚未创建访问凭据。")).toBeVisible();
  return { p, w };
}
async function create(page: Page, name: string) {
  await page.getByLabel("用途名称").fill(name);
  await page.getByRole("button", { name: "创建凭据", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "保存本次凭据",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return dialog;
}
test("Owner 真实创建、只读请求、撤销与安全列表；桌面手机和键盘", async ({
  page,
  accounts,
  playwright,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const { p } = await project(page);
  const dialog = await create(page, "本地开发助手");
  const raw = await dialog.getByLabel("访问凭据（仅显示一次）").inputValue();
  expect(/^sbp_[A-Za-z0-9_-]{43}$/.test(raw)).toBe(true);
  for (const key of ["Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect
      .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  const external = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:4000",
    extraHTTPHeaders: { Authorization: "Bearer " + raw },
  });
  try {
    const read = await external.get(`/api/v1/projects/${p.id}/approved-specs`);
    expect(read.status()).toBe(200);
    expect((await read.json()).data).toEqual([]);
    expect((await external.get("/api/v1/me")).status()).toBe(401);
    const clean = await page.evaluate(
      (raw) =>
        !JSON.stringify({ ...localStorage, ...sessionStorage }).includes(raw),
      raw,
    );
    expect(clean).toBe(true);
    await dialog.getByRole("button", { name: "我已保存，关闭" }).click();
    await expect(dialog).not.toBeVisible();
    expect(
      await page
        .locator("input")
        .evaluateAll(
          (els, raw) =>
            els.every((el) => (el as HTMLInputElement).value !== raw),
          raw,
        ),
    ).toBe(true);
    const list = await page.request.get(`/api/v1/projects/${p.id}/api-tokens`);
    expect((await list.text()).includes(raw)).toBe(false);
    await expect(page.getByText("可用", { exact: true })).toBeVisible();
    const checks = [await accessibility(page, "token-desktop")];
    await page.screenshot({
      path: resolve(evidence, "desktop-tokens.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    checks.push(await accessibility(page, "token-mobile"));
    await page
      .getByRole("button", { name: "撤销 本地开发助手", exact: true })
      .click();
    const confirm = page.getByRole("dialog", {
      name: "撤销访问凭据",
      exact: true,
    });
    await expect(confirm).toBeVisible();
    await expect(confirm).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: resolve(evidence, "mobile-revoke.png"),
      animations: "disabled",
    });
    await confirm.getByRole("button", { name: "确认撤销" }).click();
    await expect(page.getByText("已撤销", { exact: true })).toBeVisible();
    expect(
      (await external.get(`/api/v1/projects/${p.id}/approved-specs`)).status(),
    ).toBe(401);
    await expect(confirm).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 740 });
    checks.push(await accessibility(page, "token-320"));
    await writeFile(
      resolve(evidence, "accessibility.json"),
      JSON.stringify(checks, null, 2),
    );
  } finally {
    await external.dispose();
  }
});
test("明文在后台、切页、返回和刷新后销毁，迟到结果不恢复", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { p } = await project(page);
  let dialog = await create(page, "后台清除");
  const raw = await dialog.getByLabel("访问凭据（仅显示一次）").inputValue();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(dialog).not.toBeVisible();
  expect(
    await page
      .locator("input")
      .evaluateAll(
        (els, raw) => els.every((el) => (el as HTMLInputElement).value !== raw),
        raw,
      ),
  ).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  dialog = await create(page, "离页清除");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/projects/${p.id}$`));
  await page.getByRole("link", { name: "访问凭据", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${p.id}/api-tokens$`));
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByLabel("用途名称")).toBeVisible();
  await expect(dialog).not.toBeVisible();
  let received!: () => void;
  const arrived = new Promise<void>((r) => {
    received = r;
  });
  let release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  await page.route(`**/projects/${p.id}/api-tokens`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    received();
    await held;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.getByLabel("用途名称").fill("迟到响应");
  await page.getByRole("button", { name: "创建凭据", exact: true }).click();
  await expect(page.getByRole("button", { name: "处理中…" })).toBeVisible();
  await arrived;
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/projects/${p.id}$`));
  release();
  await page.getByRole("link", { name: "访问凭据", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${p.id}/api-tokens$`));
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("创建结果需要核对")).toBeVisible();
});
test("创建响应丢失时不重放；保留输入，核对撤销后才能重建", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  const { p } = await project(page);
  let posts = 0;
  await page.route(`**/projects/${p.id}/api-tokens`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    await route.fetch();
    await route.abort("failed");
  });
  await page.getByLabel("用途名称").fill("结果未知");
  await page.getByRole("button", { name: "创建凭据", exact: true }).click();
  await expect(page.getByText("创建结果需要核对")).toBeVisible();
  await expect(page.getByLabel("用途名称")).toHaveValue("结果未知");
  await expect(
    page.getByRole("button", { name: "创建凭据", exact: true }),
  ).toBeDisabled();
  expect(posts).toBe(1);
  await page
    .getByRole("button", { name: "撤销 结果未知", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "撤销访问凭据" })
    .getByRole("button", { name: "确认撤销" })
    .click();
  await expect(page.getByText("已撤销", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "已核对列表并处理本次凭据" }).click();
  await expect(
    page.getByRole("button", { name: "创建凭据", exact: true }),
  ).toBeEnabled();
  expect(posts).toBe(1);
});
test("Developer 与 Client 无管理入口，直接路由也不展示凭据", async ({
  page,
  accounts,
  browser,
}) => {
  await login(page, accounts.a);
  const { p, w } = await project(page);
  const member = await post(page, `/workspaces/${w.id}/members`, {
    email: accounts.b.email,
  });
  await post(page, `/projects/${p.id}/members`, {
    userId: member.userId,
    role: "DEVELOPER",
  });
  expect(
    (
      await page.request.put(`/api/v1/projects/${p.id}/client`, {
        headers: writeHeaders,
        data: { email: accounts.client.email },
      })
    ).status(),
  ).toBe(200);
  await create(page, "仅负责人可见");
  await page.keyboard.press("Escape");
  for (const account of [accounts.b, accounts.client]) {
    const context = await browser.newContext();
    const other = await context.newPage();
    try {
      await login(other, account);
      await other.goto(`/app/projects/${p.id}/api-tokens`);
      await expect(
        other.getByText("仅项目负责人可管理访问凭据。"),
      ).toBeVisible();
      await expect(
        other.getByRole("link", { name: "访问凭据", exact: true }),
      ).toHaveCount(0);
      expect(
        (
          await other.request.get(`/api/v1/projects/${p.id}/api-tokens`)
        ).status(),
      ).toBe(403);
      await expect(other.getByText("仅负责人可见")).toHaveCount(0);
    } finally {
      await context.close();
    }
  }
});
