import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect, login, writeHeaders } from "./fixtures";
const evidence = resolve(process.cwd(), "../../docs/ux/evidence/ai-workflow-b");
test.skip(
  process.env.R08_REAL_PROVIDER !== "1" || !!process.env.CI,
  "Explicit isolated paid smoke only",
);
test("真实 DeepSeek 读取共享背景与 Copilot 来源，业务记录不变", async ({
  page,
  accounts,
}) => {
  test.setTimeout(90000);
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const w = await page.request.post("/api/v1/workspaces", {
    headers: writeHeaders,
    data: { name: "青禾 · 真实背景联调" },
  });
  const p = await page.request.post("/api/v1/projects", {
    headers: writeHeaders,
    data: {
      workspaceId: (await w.json()).data.id,
      name: "会员积分背景",
      baselineScope: "第一期查询积分，不含支付。",
    },
  });
  const project = (await p.json()).data.id;
  const upload = async (name: string, text: string) => {
    const r = await page.request.post(`/api/v1/projects/${project}/documents`, {
      headers: writeHeaders,
      multipart: {
        file: { name, mimeType: "text/plain", buffer: Buffer.from(text) },
      },
    });
    expect(r.status()).toBe(201);
    expect((await r.json()).data.status).toBe("READY");
    return (await r.json()).data;
  };
  await upload(
    "内部估算.txt",
    "仅内部讨论：通知通道尚无报价，不能自动承诺交付日期。",
  );
  const shared = await upload(
    "客户背景.txt",
    "访谈记录：会员积分有效期一年，用户希望到期前收到提醒。\n尚未确认：提前几天提醒、通过短信还是站内通知、失败是否重试。",
  );
  expect(
    (
      await page.request.put(
        `/api/v1/projects/${project}/documents/${shared.documentId}`,
        {
          headers: writeHeaders,
          data: { expectedVersion: 2, sharedVersionId: shared.versionId },
        },
      )
    ).status(),
  ).toBe(200);
  const r = await page.request.post(
    `/api/v1/projects/${project}/requirements`,
    {
      headers: writeHeaders,
      data: {
        title: "积分到期提醒",
        originalText: "希望系统提醒即将过期的积分。",
      },
    },
  );
  const requirement = (await r.json()).data.id;
  const snapshot = async () => {
    const value = await page.request.get(`/api/v1/requirements/${requirement}`);
    return (await value.json()).data;
  };
  const before = await snapshot();
  await page.goto(`/app/projects/${project}/requirements/${requirement}`);
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/ai-assistance"),
  );
  await page.getByRole("button", { name: "生成澄清建议", exact: true }).click();
  const analyzed = await response;
  expect(analyzed.status()).toBe(200);
  const analysis = (await analyzed.json()).data;
  expect(analysis.source.background.length).toBeGreaterThan(0);
  expect(
    analysis.source.background.every(
      (s: { documentId: string }) => s.documentId === shared.documentId,
    ),
  ).toBe(true);
  await expect(page.getByRole("region", { name: "AI 建议预览" })).toBeVisible();
  await page.screenshot({
    path: resolve(evidence, "real-background-analysis.png"),
    fullPage: true,
  });
  // Exercise the real orchestrator; use the same bounded smoke transport (max 4 calls / 8192 reserved output tokens).
  const chat = await page.request.post(
    `/api/v1/projects/${project}/copilot/messages`,
    {
      headers: writeHeaders,
      data: {
        message:
          "请用 search_project_background 检索会员积分背景，说明现有记录与仍待确认的问题，附真实背景版本来源。不要执行任何操作。",
        page: { kind: "requirement", id: requirement },
      },
    },
  );
  expect(chat.status()).toBe(200);
  const answer = (await chat.json()).data;
  expect(
    answer.sources.some((s: { type: string }) => s.type === "document"),
  ).toBe(true);
  expect(await snapshot()).toEqual(before);
  await writeFile(
    resolve(evidence, "real-background-result.json"),
    JSON.stringify(
      {
        status: "PASS",
        mode: analysis.mode,
        sharedBackgroundSources: analysis.source.background.length,
        copilotToolCalls: answer.context.toolCalls,
        sourceTypes: answer.sources.map((s: { type: string }) => s.type),
        requirementUnchanged: true,
        result: answer.result,
      },
      null,
      2,
    ) + "\n",
  );
});
