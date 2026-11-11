import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect, login, writeHeaders } from "./fixtures";
import { accessibility } from "./accessibility";

const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "test-results/evidence",
  "ui-polish",
);

test("界面细化：项目导航、主题一致性、图标刷新、键盘与会话隔离", async ({
  page,
  accounts,
}) => {
  test.setTimeout(180_000);
  await mkdir(evidence, { recursive: true });
  const checks = [];
  for (const route of ["login", "register"]) {
    await page.goto(`/${route}`);
    const button = page.locator(".submit-button");
    expect(
      await button.evaluate((el) => getComputedStyle(el).justifyContent),
    ).toBe("center");
    await expect(button).toHaveAccessibleName(
      route === "login" ? "登录" : "创建账号",
    );
  }
  await page.goto("/login");
  await page.screenshot({
    path: resolve(evidence, "login-desktop.png"),
    fullPage: true,
  });
  checks.push(await accessibility(page, "login"));
  await login(page, accounts.a);
  const write = async (path: string, data: object) => {
    const res = await page.request.post(`/api/v1${path}`, {
      headers: writeHeaders,
      data,
    });
    expect(res.status()).toBe(201);
    return (await res.json()).data;
  };
  const space = await write("/workspaces", { name: "青禾设计工作室" });
  const names = [
    "青禾 · 客户协作门户",
    "山岚 · 品牌官网",
    "拾光 · 会员服务",
    "星河 · 移动应用",
    "设计规范与组件库",
    "客户支持与知识中心",
    "数据分析工作台",
    "开放平台",
    "海外业务",
    "运营门户",
    "内容管理",
    "增长实验",
    "归档参考",
  ];
  const projects = [];
  for (const name of names)
    projects.push(
      await write("/projects", {
        workspaceId: space.id,
        name,
        baselineScope: "围绕明确的需求协作；变更经双方确认后交付。",
      }),
    );
  await page.reload();
  const sidebar = page.locator(".sidebar");
  await expect(sidebar.locator(".sidebar-project")).toHaveCount(12);
  await expect(sidebar.getByRole("link", { name: "更多项目 →" })).toBeVisible();
  const first = sidebar.locator(".sidebar-project").first();
  const name = await first.locator("summary").getAttribute("title");
  const tone = await first.getAttribute("data-tone");
  await first.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("open", "");
  await first
    .getByRole("link", { name: `${name} · 项目概览`, exact: true })
    .click();
  await expect(page.locator(".project-heading")).toHaveAttribute(
    "data-tone",
    tone!,
  );
  const refresh = page.getByRole("button", { name: "刷新项目", exact: true });
  await expect(refresh).toHaveText("");
  const box = await refresh.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const read = page.waitForResponse(
    (r) =>
      /\/api\/v1\/projects\/[^/?]+$/.test(r.url()) &&
      r.request().method() === "GET",
  );
  await refresh.click();
  expect((await read).status()).toBe(200);
  await expect(refresh).toBeEnabled();
  await page.reload();
  await expect(page.locator(".project-heading")).toHaveAttribute(
    "data-tone",
    tone!,
  );
  await expect(
    sidebar.getByRole("link", { name: `${name} · 项目概览`, exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: resolve(evidence, "project-desktop.png"),
    fullPage: true,
  });
  checks.push(await accessibility(page, "project-desktop"));
  await page.getByRole("button", { name: "折叠导航" }).click();
  await expect(
    sidebar.getByRole("navigation", { name: "项目快捷导航" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "展开导航" }).click();
  await expect(
    sidebar.getByRole("navigation", { name: "项目快捷导航" }),
  ).toBeVisible();
  await page.goto("/app");
  await expect(page.getByTestId("project-count")).toHaveText("13");
  await page.screenshot({
    path: resolve(evidence, "dashboard-desktop.png"),
    fullPage: false,
    animations: "disabled",
    mask: [page.getByTestId("account-email")],
    maskColor: "#E2E6ED",
  });
  checks.push(await accessibility(page, "dashboard-desktop"));
  const account = page.locator(".account-details");
  await account.screenshot({
    path: resolve(evidence, "account-panel.png"),
    animations: "disabled",
    mask: [page.getByTestId("account-email")],
    maskColor: "#E2E6ED",
  });
  await account.locator("summary").click();
  await expect(page.getByTestId("account-email")).toBeHidden();
  await account.locator("summary").click();
  await expect(page.getByTestId("account-email")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: resolve(evidence, "dashboard-mobile.png"),
    fullPage: false,
    animations: "disabled",
    mask: [page.getByTestId("account-email")],
    maskColor: "#E2E6ED",
  });
  await page.getByRole("button", { name: "打开导航" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.locator(".sidebar-project summary").first().click();
  await page.screenshot({
    path: resolve(evidence, "projects-drawer.png"),
    fullPage: false,
    animations: "disabled",
    mask: [page.getByTestId("account-email")],
    maskColor: "#E2E6ED",
  });
  checks.push(await accessibility(page, "projects-drawer"));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "打开导航" })).toBeFocused();
  await page.getByRole("button", { name: "打开导航" }).click();
  await drawer.locator(".sidebar-project summary").first().click();
  await drawer
    .getByRole("link", { name: / · 项目需求$/ })
    .first()
    .click();
  await expect(drawer).toHaveCount(0);
  await expect(page).toHaveURL(/\/requirements$/);
  for (const width of [320, 768, 900]) {
    await page.setViewportSize({ width, height: 900 });
    checks.push(await accessibility(page, `project-${width}`));
    await page.goto("/app");
    checks.push(await accessibility(page, `dashboard-${width}`));
    await page.goto(`/app/projects/${projects[0].id}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // A failed read must hide stale private project names and offer an explicit retry.
  await page.route("**/api/v1/projects?*", (r) => r.abort("failed"));
  await page.reload();
  await expect(sidebar.getByText("暂时无法加载项目")).toBeVisible();
  await expect(sidebar.locator(".sidebar-project")).toHaveCount(0);
  await page.unrouteAll();
  await sidebar.getByRole("button", { name: "刷新侧栏项目" }).click();
  await expect(sidebar.locator(".sidebar-project")).toHaveCount(12);
  await page.getByRole("button", { name: "退出登录" }).click();
  await page.getByLabel("邮箱", { exact: true }).fill(accounts.b.email);
  await page.getByLabel("密码", { exact: true }).fill(accounts.b.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  // Login preserves the previous project return path; B has no access to A's project.
  await expect(sidebar.getByText("参与的项目会显示在这里。", { exact: false })).toBeVisible();
  expect((await page.request.get(`/api/v1/projects/${projects[0].id}`)).status()).toBe(404);
  await sidebar.getByRole("link", { name: "工作概览", exact: true }).click();
  await expect(page.getByTestId("account-email")).toHaveText(accounts.b.email);
  await expect(sidebar.locator(".sidebar-project")).toHaveCount(0);
  await expect(
    sidebar.getByText("参与的项目会显示在这里。", { exact: false }),
  ).toBeVisible();
  await writeFile(
    resolve(evidence, "accessibility.json"),
    JSON.stringify(checks, null, 2),
  );
});
