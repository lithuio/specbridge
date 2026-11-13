import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect, login, writeHeaders, origin } from "./fixtures";
import { accessibility } from "./accessibility";
const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence",
  "ai-workflow-b",
);
test("创建项目后可选上传：明确共享、内部替换、Client版本隔离、键盘和手机", async ({
  page,
  accounts,
  browser,
}) => {
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const w = await page.request.post("/api/v1/workspaces", {
    headers: writeHeaders,
    data: { name: "青禾 · 项目背景" },
  });
  expect(w.status()).toBe(201);
  await page.goto(`/app/projects/new?workspaceId=${(await w.json()).data.id}`);
  await page
    .getByLabel("项目名称", { exact: true })
    .fill("会员积分 · 背景验收");
  await page
    .getByLabel("初始范围", { exact: true })
    .fill("第一期仅处理会员积分查询，不包含支付。");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page).toHaveURL(/projects\/[\da-f-]+$/);
  const project = page.url().split("/").at(-1)!;
  await expect(
    page.getByRole("heading", { name: "第二步：补充背景" }),
  ).toBeVisible();
  await page
    .getByLabel("背景文件", { exact: true })
    .filter({ visible: true })
    .setInputFiles({
      name: "客户访谈.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("已访谈：积分有效期一年。\n尚待确认：到期通知方式。"),
    });
  await page.getByRole("button", { name: "上传背景文件", exact: true }).click();
  await expect(
    page.getByText("上传完成。默认仅内部可见；共享须由负责人确认。"),
  ).toBeVisible();
  await page.getByRole("link", { name: "查看与管理背景资料 →" }).click();
  await expect(
    page.getByRole("article", { name: "客户访谈.txt" }),
  ).toBeVisible();
  const bind = await page.request.put(`/api/v1/projects/${project}/client`, {
    headers: writeHeaders,
    data: { email: accounts.client.email },
  });
  expect(bind.status()).toBe(200);
  const clientContext = await browser.newContext({
    baseURL: origin,
    viewport: { width: 390, height: 844 },
  });
  const client = await clientContext.newPage();
  await login(client, accounts.client);
  await client.goto(`/app/projects/${project}/documents`);
  await expect(
    client.getByText("暂无当前账号可读取的背景资料。"),
  ).toBeVisible();
  const share = page.getByRole("button", { name: "共享 v1", exact: true });
  await share.focus();
  await page.keyboard.press("Enter");
  const confirm = page.getByRole("region", { name: "确认背景资料操作" });
  await expect(confirm).toBeVisible();
  const modal = page.getByRole("dialog", {
    name: "将 v1 共享给客户",
    exact: true,
  });
  await expect(modal).toBeVisible();
  await expect
    .poll(() => modal.evaluate((el) => el.contains(document.activeElement)))
    .toBe(true);
  await expect(modal).toHaveCSS("opacity", "1");
  const modalChecks = [await accessibility(page, "share-confirm-desktop")];
  await page.screenshot({
    path: resolve(evidence, "share-confirm-desktop.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 320, height: 740 });
  modalChecks.push(await accessibility(page, "share-confirm-320"));
  await page.screenshot({
    path: resolve(evidence, "share-confirm-mobile.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(share).toBeFocused();
  await share.click();
  await expect(modal).toBeVisible();
  await client.reload();
  await expect(
    client.getByText("暂无当前账号可读取的背景资料。"),
  ).toBeVisible();
  await confirm.getByRole("button", { name: "确认操作", exact: true }).click();
  await expect(confirm).not.toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "共享给客户，已保存" }),
  ).toBeVisible();
  await client.reload();
  await client.getByRole("link", { name: "查看共享文字" }).click();
  await expect(
    client.getByText("已访谈：积分有效期一年。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "上传替换版本" }).click();
  await expect(
    page.getByLabel("背景文件", { exact: true }).filter({ visible: true }),
  ).toBeFocused();
  await page
    .getByLabel("背景文件", { exact: true })
    .filter({ visible: true })
    .setInputFiles({
      name: "内部补充.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("内部估算，尚未与客户确认。"),
    });
  await page.getByRole("button", { name: "上传新版本" }).click();
  await expect(page.getByText(/v2 · 内部补充.txt · 解析完成/)).toBeVisible();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: resolve(evidence, "documents-desktop.png"),
    fullPage: true,
  });
  const checks = [
    ...modalChecks,
    await accessibility(page, "documents-desktop"),
  ];
  await client.goto(`/app/projects/${project}/documents`);
  await expect(client.getByText("内部补充.txt", { exact: false })).toHaveCount(
    0,
  );
  await expect(
    client.getByRole("link", { name: "查看共享文字" }),
  ).toBeVisible();
  await client.screenshot({
    path: resolve(evidence, "client-shared-mobile.png"),
    fullPage: true,
  });
  checks.push(await accessibility(client, "client-shared-mobile"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: resolve(evidence, "documents-mobile.png"),
    fullPage: true,
  });
  checks.push(await accessibility(page, "documents-mobile"));
  const r = await page.request.post(
    `/api/v1/projects/${project}/requirements`,
    {
      headers: writeHeaders,
      data: { title: "到期通知", originalText: "希望通知客户积分即将到期。" },
    },
  );
  expect(r.status()).toBe(201);
  await page.goto(
    `/app/projects/${project}/requirements/${(await r.json()).data.id}`,
  );
  await page.getByRole("button", { name: "生成澄清建议", exact: true }).click();
  const preview = page.getByRole("region", { name: "AI 建议预览" });
  await expect(preview.getByText("本轮参考背景（未经批准）：")).toBeVisible();
  await expect(
    preview.getByRole("link", { name: /客户访谈.txt · v1/ }).first(),
  ).toBeVisible();
  await expect(preview.getByText(/内部补充/)).toHaveCount(0);
  await page.goto(`/app/projects/${project}/documents`);
  await page.getByRole("button", { name: "撤回共享" }).click();
  await page.getByRole("button", { name: "确认操作", exact: true }).click();
  await client.reload();
  await expect(
    client.getByText("暂无当前账号可读取的背景资料。"),
  ).toBeVisible();
  await writeFile(
    resolve(evidence, "accessibility.json"),
    JSON.stringify(checks, null, 2) + "\n",
  );
  await clientContext.close();
});

test("解析失败与未知上传结果保留文件；共享409保留操作，手动需求仍可用", async ({
  page,
  accounts,
}) => {
  await login(page, accounts.b);
  const w = await page.request.post("/api/v1/workspaces", {
    headers: writeHeaders,
    data: { name: "背景故障验收" },
  });
  const p = await page.request.post("/api/v1/projects", {
    headers: writeHeaders,
    data: {
      workspaceId: (await w.json()).data.id,
      name: "可重试项目",
      baselineScope: "合成资料",
    },
  });
  const project = (await p.json()).data.id;
  await page.goto(`/app/projects/${project}/documents`);
  await page
    .getByLabel("背景文件", { exact: true })
    .filter({ visible: true })
    .setInputFiles({
      name: "broken.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-broken"),
    });
  await page.getByRole("button", { name: "上传背景文件", exact: true }).click();
  await expect(
    page.getByText("文件损坏或内容与格式不符，请检查原件。").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "上传背景文件", exact: true }),
  ).toBeEnabled();
  await page.route(`**/api/v1/projects/${project}/documents`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByLabel("背景文件", { exact: true })
    .filter({ visible: true })
    .setInputFiles({
      name: "unknown.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("请求成功但客户端丢失响应"),
    });
  await page.getByRole("button", { name: "上传背景文件", exact: true }).click();
  await expect(
    page.getByText(
      "上传结果未知，所选文件已保留。请刷新列表核对，避免重复上传。",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "上传背景文件", exact: true }),
  ).toBeDisabled();
  await page.unrouteAll({ behavior: "wait" });
  await page
    .getByRole("button", { name: "刷新列表并核对", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "unknown.txt" }),
  ).toBeVisible();
  await page
    .getByRole("article", { name: "unknown.txt" })
    .getByRole("button", { name: "共享 v1" })
    .click();
  const list = await page.request.get(`/api/v1/projects/${project}/documents`);
  const doc = (await list.json()).data.items.find(
    (i: { title: string }) => i.title === "unknown.txt",
  );
  expect(
    (
      await page.request.put(
        `/api/v1/projects/${project}/documents/${doc.id}`,
        {
          headers: writeHeaders,
          data: { expectedVersion: doc.version, sharedVersionId: null },
        },
      )
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "确认操作", exact: true }).click();
  await expect(
    page.getByText("资料已更新，已保留所选文件。请刷新列表并重新核对。"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "确认操作", exact: true }),
  ).toBeDisabled();
  await page.goto(`/app/projects/${project}/requirements/new`);
  await page.getByLabel("需求标题", { exact: true }).fill("无 AI 仍可录入");
  await page
    .getByLabel("需求原文", { exact: true })
    .fill("上传故障后手动需求输入");
  await page.getByRole("button", { name: "创建需求", exact: true }).click();
  await expect(page).toHaveURL(/requirements\/[\da-f-]+$/);
});
