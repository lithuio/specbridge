import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect, login, newAccount, writeHeaders } from "./fixtures";

const evidence = resolve(process.cwd(), process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence", "r07-c");
test("真实注册、登录错误、刷新恢复、Cookie/CSRF 与退出撤销", async ({
  page,
  context,
  accounts,
  playwright,
}) => {
  await mkdir(evidence, { recursive: true });
  await page.goto("/register");
  const registered = newAccount("新协作用户");
  await page.getByLabel("姓名", { exact: true }).fill(registered.displayName);
  await page.getByLabel("邮箱", { exact: true }).fill(registered.email);
  await page.getByLabel("密码", { exact: true }).fill("short");
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await expect(
    page.getByText("密码需为 15–128 个字符，最多 512 字节"),
  ).toBeVisible();
  await page.getByLabel("密码", { exact: true }).fill(registered.password);
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "账号创建成功" }),
  ).toBeVisible();
  expect((await context.request.get("/api/v1/me")).status()).toBe(401);
  await page.getByRole("link", { name: "前往登录" }).click();
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await page.screenshot({
    path: `${evidence}/login-desktop.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByLabel("邮箱", { exact: true }).fill(registered.email);
  await page.getByLabel("密码", { exact: true }).fill("wrong");
  const failed = page.waitForResponse((r) => r.url().endsWith("/auth/login"));
  await page.getByRole("button", { name: "登录", exact: true }).click();
  expect((await failed).status()).toBe(401); // Login accepts short passwords; server decides.
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    "邮箱或密码不正确",
  );
  await login(page, registered);
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login/);
  await login(page, accounts.a);
  const cookies = await context.cookies();
  const session = cookies.find(
    (cookie) => cookie.name === "specbridge_session",
  )!;
  expect(session.httpOnly).toBe(true);
  expect(session.sameSite).toBe("Lax");
  expect(
    await page.evaluate(() => document.cookie.includes("specbridge_session")),
  ).toBe(false);
  await page.reload();
  await expect(page.getByTestId("account-email")).toHaveText(accounts.a.email);
  // Mask generated address for stable, credential-free screenshots.
  await page.screenshot({
    path: `${evidence}/shell-desktop.png`,
    fullPage: true,
    animations: "disabled",
    mask: [page.getByTestId("account-email")],
    maskColor: "#E2E6ED",
  });
  const forbidden = await context.request.post("/api/v1/auth/logout", {
    headers: { Origin: "https://untrusted.example.test" },
  });
  expect(forbidden.status()).toBe(403);
  expect((await context.request.get("/api/v1/me")).status()).toBe(200);
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("你已安全退出。")).toBeVisible();
  const oldSession = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3000",
    extraHTTPHeaders: { Cookie: `${session.name}=${session.value}` },
  });
  expect((await oldSession.get("/api/v1/me")).status()).toBe(401);
  await oldSession.dispose();
  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId("account-email")).toHaveCount(0);
});

test("A→B 切换清理 Query 缓存，A 的延迟响应不能回填", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.a);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fetched!: () => void;
  const captured = new Promise<void>((resolve) => {
    fetched = resolve;
  });
  let intercepted = false;
  await page.route("**/api/v1/me", async (route) => {
    if (intercepted) return route.continue();
    intercepted = true;
    const response = await route.fetch(); // Genuine A response from API/test DB.
    expect((await response.json()).data.user.id).toBeTruthy();
    fetched();
    await delayed;
    await route.fulfill({ response }).catch(() => {}); // Expected if logout aborted transport.
  });
  await page.getByRole("button", { name: "刷新账号信息" }).click();
  await captured;
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login/);
  // Client-side navigation preserves the provider; a hard navigation would mask cache bugs.
  await page.getByLabel("邮箱", { exact: true }).fill(accounts.b.email);
  await page.getByLabel("密码", { exact: true }).fill(accounts.b.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByTestId("account-email")).toHaveText(accounts.b.email);
  release();
  await page.unrouteAll({ behavior: "wait" });
  await expect(page.getByTestId("account-email")).toHaveText(accounts.b.email);
  await expect(
    page.getByText(accounts.a.displayName, { exact: true }),
  ).toHaveCount(0);
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  expect(JSON.stringify(storage)).not.toContain(accounts.a.email);
  await page.reload();
  await expect(page.getByTestId("account-email")).toHaveText(accounts.b.email);
});

test("真实 401 清除私有页面；恢复网络失败可重试", async ({
  page,
  context,
  accounts,
}) => {
  await login(page, accounts.client);
  // Revoke server session outside the page, leaving its cached account mounted.
  expect(
    (
      await context.request.post("/api/v1/auth/logout", {
        headers: writeHeaders,
      })
    ).status(),
  ).toBe(204);
  await page.getByRole("button", { name: "刷新账号信息" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("会话已失效，请重新登录。")).toBeVisible();
  await expect(page.getByTestId("account-email")).toHaveCount(0);
  await page.route("**/api/v1/me", (route) => route.abort("failed"));
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "暂时无法恢复会话" }),
  ).toBeVisible();
  await page.unrouteAll();
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("手机登录、Shell、Drawer 键盘焦点与 320px 重排", async ({
  page,
  accounts,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await page.screenshot({
    path: `${evidence}/login-mobile.png`,
    fullPage: true,
    animations: "disabled",
  });
  await login(page, accounts.b);
  await page.screenshot({
    path: `${evidence}/shell-mobile.png`,
    fullPage: true,
    animations: "disabled",
    mask: [page.getByTestId("account-email")],
    maskColor: "#E2E6ED",
  });
  const trigger = page.getByRole("button", { name: "打开导航" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const drawer = await page.getByRole("dialog").boundingBox();
  expect(drawer?.x).toBe(0);
  expect(drawer?.y).toBe(0);
  expect(drawer?.height).toBe(844);
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "工作概览" }),
  ).toBeInViewport();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "退出登录" }),
  ).toBeInViewport();
  await page.screenshot({
    path: `${evidence}/drawer-mobile.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await trigger.click();
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("同浏览器其他标签切换账号，重新确认身份后恢复；退出网络失败不重新露出缓存", async ({
  page,
  context,
  accounts,
}) => {
  await login(page, accounts.a);
  // Cookies are shared by tabs. Actual API login rotates identity; focus must revalidate /me.
  const changed = await context.request.post("/api/v1/auth/login", {
    headers: writeHeaders,
    data: { email: accounts.b.email, password: accounts.b.password },
  });
  expect(changed.status()).toBe(200);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("account-email")).toHaveText(accounts.b.email);
  await page.route("**/api/v1/auth/logout", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(
    page.getByRole("heading", { name: "退出尚未确认，请重试" }),
  ).toBeVisible();
  await expect(page.getByTestId("account-email")).toHaveCount(0);
  await page.unrouteAll();
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("旧账号的延迟 401 不得退出新账号；429 显示等待时间", async ({
  page,
  context,
  accounts,
}) => {
  await login(page, accounts.a);
  expect(
    (
      await context.request.post("/api/v1/auth/logout", {
        headers: writeHeaders,
      })
    ).status(),
  ).toBe(204);
  let release!: () => void;
  let captured!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    captured = resolve;
  });
  let intercepted = false;
  await page.route("**/api/v1/me", async (route) => {
    if (intercepted) return route.continue();
    intercepted = true;
    const response = await route.fetch();
    expect(response.status()).toBe(401);
    captured();
    await hold;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.getByRole("button", { name: "刷新账号信息" }).click();
  await ready;
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("邮箱", { exact: true }).fill(accounts.b.email);
  await page.getByLabel("密码", { exact: true }).fill(accounts.b.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByTestId("account-email")).toHaveText(accounts.b.email);
  release();
  await page.unrouteAll({ behavior: "wait" });
  await expect(page.getByTestId("account-email")).toHaveText(accounts.b.email);
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login/);
  const unknown = newAccount("限流验证");
  for (let i = 0; i < 5; i++) {
    expect(
      (
        await context.request.post("/api/v1/auth/login", {
          headers: writeHeaders,
          data: { email: unknown.email, password: unknown.password },
        })
      ).status(),
    ).toBe(401);
  }
  await page.getByLabel("邮箱", { exact: true }).fill(unknown.email);
  await page.getByLabel("密码", { exact: true }).fill(unknown.password);
  const limited = page.waitForResponse((r) => r.url().endsWith("/auth/login"));
  await page.getByRole("button", { name: "登录", exact: true }).click();
  expect((await limited).status()).toBe(429);
  await expect(page.getByRole("alert", { name: "请求错误" })).toContainText(
    /等待 \d+ 秒后重试/,
  );
});
