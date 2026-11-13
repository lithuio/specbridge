import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect, login, writeHeaders } from "./fixtures";
import { accessibility } from "./accessibility";

test.skip(
  process.env.R08_REAL_PROVIDER !== "1",
  "Paid provider smoke is explicit local opt-in only",
);
test.beforeAll(() => {
  if (process.env.CI) throw new Error("Real provider smoke is forbidden in CI");
});

test("真实 DeepSeek：Draft 分析 → 人工审阅保存 → Copilot 工具来源；桌面/手机", async ({
  page,
  accounts,
}) => {
  test.setTimeout(150_000);
  const evidence = process.env.R07_EVIDENCE_ROOT
    ? resolve(process.cwd(), process.env.R07_EVIDENCE_ROOT, "ai-workflow-a")
    : resolve("../../test-results/r08-f/browser-real");
  await mkdir(evidence, { recursive: true });
  await login(page, accounts.a);
  const create = async (path: string, data: object) => {
    const r = await page.request.post(`/api/v1${path}`, {
      headers: writeHeaders,
      data,
    });
    expect(r.status()).toBe(201);
    return (await r.json()).data;
  };
  const w = await create("/workspaces", { name: "合成验收 · AI 联调" });
  const p = await create("/projects", {
    workspaceId: w.id,
    name: "青禾 · 状态筛选验证",
    baselineScope: "仅用于联调的合成项目；当前项目的待办状态筛选。",
  });
  const original =
    "用户可按状态筛选当前项目的待办列表。筛选后只显示选中状态，清除筛选恢复列表，没有匹配项时显示空状态。需要澄清默认状态与权限边界。";
  await page.goto(`/app/projects/${p.id}/requirements/new`);
  await page
    .getByRole("textbox", { name: "需求标题", exact: true })
    .fill("按状态筛选项目待办");
  await page
    .getByRole("textbox", { name: "需求原文", exact: true })
    .fill(original);
  await page.getByRole("button", { name: "创建需求", exact: true }).click();
  await expect(page).toHaveURL(/requirements\/[\da-f-]+$/);
  const id = page.url().split("/").at(-1)!;
  const read = async () => {
    const r = await page.request.get(`/api/v1/requirements/${id}`);
    expect(r.status()).toBe(200);
    return (await r.json()).data;
  };
  const audit = async () =>
    (
      await (
        await page.request.get(`/api/v1/projects/${p.id}/audit-events`)
      ).json()
    ).data;
  const before = await read(),
    auditBefore = await audit();
  await page.getByRole("button", { name: "帮我整理规格", exact: true }).click();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/ai-assistance"),
    { timeout: 40_000 },
  );
  await page.getByRole("button", { name: "生成规格建议", exact: true }).click();
  const analysisResponse = await response;
  expect(analysisResponse.status()).toBe(200);
  const analysis = (await analysisResponse.json()).data;
  expect(analysis.mode).toBe("specification");
  expect(Object.keys(analysis.result).sort()).toEqual([
    "acceptanceCriteria",
    "assumptions",
    "content",
    "openQuestions",
    "risks",
  ]);
  expect(analysis.source.requirementId).toBe(id);
  expect(await read()).toEqual(before);
  expect(await audit()).toEqual(auditBefore);
  const panel = page.getByRole("region", { name: "需求工作台", exact: true });
  await expect(page.getByRole("region", { name: "AI 建议预览" })).toBeVisible();
  const checks = [await accessibility(page, "real-analysis-desktop")];
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: resolve(evidence, "analysis-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "采用到当前工作稿" }).click();
  const reviewed = `${analysis.result.content}\n人工确认：只处理当前项目可见待办；默认状态由负责人确认。`;
  await panel
    .getByRole("textbox", { name: "规格工作稿正文", exact: true })
    .fill(reviewed);
  if (!analysis.result.acceptanceCriteria.length)
    await panel.getByRole("button", { name: "添加验收标准" }).click();
  await panel
    .getByRole("textbox", { name: "验收标准 1", exact: true })
    .fill("按所选状态过滤当前项目可见待办；无匹配项显示空状态。");
  await panel.getByRole("button", { name: "保存个人工作稿" }).click();
  await expect(
    page.getByText("个人工作稿已保存。项目问答、Revision 和业务状态未改变。"),
  ).toBeVisible();
  expect(await read()).toEqual(before);
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.getByRole("button", { name: "预览创建 Revision" }).click();
  checks.push(await accessibility(page, "real-human-review-mobile"));
  await page
    .getByRole("region", { name: "人工发布确认" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(evidence, "human-review-mobile.png") });
  const saved = page.waitForRequest(
    (r) =>
      r.method() === "POST" &&
      r.url().endsWith("/working-drafts/specification/publish"),
  );
  await panel.getByRole("button", { name: "确认创建 Revision" }).click();
  expect((await saved).postDataJSON().expectedVersion).toBe(
    before.draftVersion,
  );
  await expect(
    page.getByText("已由你确认创建正式 Revision。仍需在原流程中人工标记就绪。"),
  ).toBeVisible();
  const after = await read();
  expect(after.originalText).toBe(original);
  expect(after.latestRevision.content).toBe(reviewed);
  expect(after.status).toBe("CLARIFYING");
  const revision = after.latestRevision;
  const historyBefore = (
    await (
      await page.request.get(
        `/api/v1/requirements/${id}/revisions/${revision.id}`,
      )
    ).json()
  ).data;
  const beforeCopilot = await audit();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "打开项目 Copilot" }).click();
  const drawer = page.getByRole("dialog", {
    name: "项目 Copilot",
    exact: true,
  });
  await expect(drawer.getByText(p.name, { exact: true })).toBeVisible();
  await drawer
    .getByLabel("询问当前项目")
    .fill(
      "请用 get_requirement 读取当前需求和 Revision，说明状态、待核实阻塞点和下一步人工操作。最终引用需求和 Revision 来源，不执行状态变更。",
    );
  const answerResponse = page.waitForResponse(
    (r) => r.url().endsWith("/copilot/messages"),
    { timeout: 65_000 },
  );
  await drawer.getByRole("button", { name: "发送", exact: true }).click();
  const answer = await answerResponse;
  expect(answer.status()).toBe(200);
  const copilot = (await answer.json()).data;
  expect(copilot.context.toolCalls).toBeGreaterThan(0);
  expect(copilot.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id }),
      expect.objectContaining({ id: revision.id }),
    ]),
  );
  expect(
    copilot.sources.every((s: { projectId: string }) => s.projectId === p.id),
  ).toBe(true);
  await expect(
    drawer.getByRole("link", { name: /Revision 1/ }),
  ).toHaveAttribute(
    "href",
    `/app/projects/${p.id}/requirements/${id}/revisions/${revision.id}`,
  );
  await expect(
    drawer.getByRole("button", { name: "清空对话", exact: true }),
  ).toHaveCSS("opacity", "1");
  checks.push(await accessibility(page, "real-copilot-desktop"));
  await page.screenshot({ path: resolve(evidence, "copilot-desktop.png") });
  for (const key of ["Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect
      .poll(() => drawer.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  checks.push(await accessibility(page, "real-copilot-mobile"));
  await drawer
    .locator(".copilot-scroll")
    .evaluate((el) =>
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" }),
    );
  await expect(drawer.getByLabel("询问当前项目")).toBeInViewport();
  await page.screenshot({ path: resolve(evidence, "copilot-mobile.png") });
  await page.setViewportSize({ width: 320, height: 740 });
  checks.push(await accessibility(page, "real-copilot-320"));
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole("button", { name: "打开项目 Copilot" }),
  ).toBeFocused();
  expect(await read()).toEqual(after);
  expect(await audit()).toEqual(beforeCopilot);
  expect(
    (
      await (
        await page.request.get(
          `/api/v1/requirements/${id}/revisions/${revision.id}`,
        )
      ).json()
    ).data,
  ).toEqual(historyBefore);
  await writeFile(
    resolve(evidence, "accessibility.json"),
    JSON.stringify(checks, null, 2) + "\n",
  );
  await writeFile(
    resolve(evidence, "result.json"),
    JSON.stringify(
      {
        status: "PASS",
        realProvider: true,
        projectId: p.id,
        requirementId: id,
        revisionId: revision.id,
        toolCalls: copilot.context.toolCalls,
        sources: copilot.sources,
        originalPreserved: true,
        explicitHumanSave: true,
        expectedVersionUsed: true,
        noAutomaticReadyApprovalOrAcceptance: true,
        copilotDomainAndAuditUnchanged: true,
      },
      null,
      2,
    ) + "\n",
  );
});
