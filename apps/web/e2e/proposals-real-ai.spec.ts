import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect, login, writeHeaders } from "./fixtures";
const evidence = resolve(
  process.cwd(),
  process.env.R07_EVIDENCE_ROOT ?? "../../docs/ux/evidence",
  "ai-workflow-c",
);
test.skip(
  process.env.R08_REAL_PROVIDER !== "1" || !!process.env.CI,
  "Explicit isolated paid smoke only",
);
test("真实 Copilot 来源 → 独立共享上下文提案 → 人工确认一个问题", async ({
  page,
  accounts,
}) => {
  test.setTimeout(90000);
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const w = await page.request.post("/api/v1/workspaces", {
    headers: writeHeaders,
    data: { name: "青禾 · 真实人工确认联调" },
  });
  const project = (
    await (
      await page.request.post("/api/v1/projects", {
        headers: writeHeaders,
        data: {
          workspaceId: (await w.json()).data.id,
          name: "项目提案联调",
          baselineScope: "仅处理当前项目的需求清单导出。",
        },
      })
    ).json()
  ).data.id;
  const requirement = (
    await (
      await page.request.post(`/api/v1/projects/${project}/requirements`, {
        headers: writeHeaders,
        data: {
          title: "按月导出清单",
          originalText: "我们希望按月导出项目需求，但导出字段和格式尚未确认。",
        },
      })
    ).json()
  ).data.id;
  const snapshot = async () =>
    (
      await (
        await page.request.get(`/api/v1/requirements/${requirement}`)
      ).json()
    ).data;
  const before = await snapshot();
  await page.goto(`/app/projects/${project}/requirements/${requirement}`);
  await page.getByRole("button", { name: "打开项目 Copilot" }).click();
  const d = page.getByRole("dialog", { name: "项目 Copilot", exact: true });
  await d
    .getByLabel("询问当前项目")
    .fill(
      "请只用 get_requirement 读取当前需求，指出最重要的待澄清问题，附需求来源，并告诉我如何在准备操作与个人提案中继续；不要替我执行任何操作。",
    );
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/copilot/messages"),
  );
  await d.getByRole("button", { name: "发送", exact: true }).click();
  const chat = await response;
  expect(chat.status()).toBe(200);
  const answer = (await chat.json()).data;
  expect(
    answer.sources.some(
      (s: { type: string; id: string }) =>
        s.type === "requirement" && s.id === requirement,
    ),
  ).toBe(true);
  expect(await snapshot()).toEqual(before);
  await d.getByRole("button", { name: "为此需求准备操作" }).first().click();
  const tasks = d.getByRole("region", { name: "Copilot 人工确认任务" });
  await expect(tasks.getByLabel("选择需求")).toHaveValue(requirement);
  const proposalResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/copilot-proposals") && r.request().method() === "POST",
  );
  await tasks
    .getByRole("button", { name: "准备个人提案", exact: true })
    .click();
  const prepared = await proposalResponse;
  expect(prepared.status()).toBe(201);
  const proposal = (await prepared.json()).data;
  expect(proposal.payload.questions.length).toBeGreaterThan(0);
  expect(await snapshot()).toEqual(before);
  const options = tasks.getByRole("checkbox");
  for (let i = 0; i < (await options.count()); i++)
    if (i > 0) await options.nth(i).uncheck();
  await tasks
    .getByLabel("问题 1", { exact: true })
    .fill("人工核对：本期导出需要哪些字段和文件格式？");
  await tasks.getByRole("button", { name: "保存预览修改" }).click();
  await expect(tasks.getByRole("button", { name: "核对并继续" })).toBeEnabled();
  await tasks.getByRole("button", { name: "核对并继续" }).click();
  await expect(
    tasks.getByRole("region", { name: "确认提案执行" }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(evidence, "real-proposal-preview.png"),
  });
  expect(await snapshot()).toEqual(before);
  await tasks.getByRole("button", { name: "确认执行此提案" }).click();
  await expect(
    tasks.getByText("已完成人工确认操作，回执已保存。"),
  ).toBeVisible();
  const after = await snapshot();
  expect(after.draftVersion).toBe(before.draftVersion + 1);
  expect(after.latestRevision).toBeNull();
  expect(after.originalText).toBe(before.originalText);
  await writeFile(
    resolve(evidence, "real-proposal-result.json"),
    JSON.stringify(
      {
        status: "PASS",
        copilotToolCalls: answer.context.toolCalls,
        sourceTypes: answer.sources.map((s: { type: string }) => s.type),
        result: answer.result,
        generatedQuestionCount: proposal.payload.questions.length,
        unchangedBeforeConfirmation: true,
        publishedQuestionCount: 1,
        revisionCreated: false,
        requirementVersion: after.draftVersion,
      },
      null,
      2,
    ) + "\n",
  );
});
