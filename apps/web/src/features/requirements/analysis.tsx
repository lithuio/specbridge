"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useProjectApi } from "@/features/projects/queries";
import { ApiError, errorMessage } from "@/lib/api/client";
import { capabilityReason, requirementPath, type Requirement } from "./queries";
import type { Selection } from "./editor";

// Validate the transport boundary too; model text is rendered only as plain text.
const items = z.array(z.string().trim().min(1).max(500)).max(10);
const analysisSchema = z.object({
  analysisId: z.uuid(),
  schemaVersion: z.literal(1),
  source: z.object({
    requirementId: z.uuid(),
    draftVersion: z.number().int().positive(),
    revisionId: z.uuid().nullable(),
    clarificationIds: z.array(z.uuid()).max(500),
    includesUnsavedDraft: z.literal(false),
    readAt: z.iso.datetime(),
  }),
  result: z.object({
    summary: z.string().trim().min(1).max(1000),
    assumptions: items,
    openQuestions: items,
    acceptanceCriteria: items,
    risks: items,
  }),
});
type Analysis = z.infer<typeof analysisSchema>;
type Group = keyof Analysis["result"];
type Suggestion = {
  id: string;
  group: Group;
  value: string;
  selected: boolean;
};
const groups: { key: Group; label: string; hint: string }[] = [
  {
    key: "summary",
    label: "需求摘要",
    hint: "选中后填入新 Revision 草稿正文。",
  },
  {
    key: "openQuestions",
    label: "澄清问题",
    hint: "每次选择一条，确认后填写问题表单。",
  },
  {
    key: "acceptanceCriteria",
    label: "验收标准",
    hint: "选中的条目追加到新 Revision 草稿的已有标准。",
  },
  {
    key: "assumptions",
    label: "待确认假设",
    hint: "AI 推断，尚非事实；仅供评估，不会自动填入规格。",
  },
  {
    key: "risks",
    label: "风险提示",
    hint: "AI 推断，请人工核实；不会自动填入规格。",
  },
];

function failureMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "TimeoutError")
    return "AI 分析等待超时。可以重试，或继续手动编辑。";
  if (error instanceof ApiError) {
    if (
      error.code === "AI_INVALID_RESPONSE" ||
      error.code === "INVALID_RESPONSE"
    )
      return "AI 返回的分析格式无效。可以重试，或继续手动编辑。";
    if (error.status === 503)
      return "AI 暂时不可用或服务响应超时。可以稍后重试，手动编辑不受影响。";
    if (error.status === 413)
      return "分析材料过长。可取消包含澄清问答后重试，或手动整理需求。";
    return errorMessage(error);
  }
  return "AI 连接中断，未获得分析结果。可以重试，或继续手动编辑。";
}

export function RequirementAnalysis({
  requirement: r,
  available,
  editorOpen,
  refresh,
  onAdopt,
}: {
  requirement: Requirement;
  available: boolean;
  editorOpen: boolean;
  refresh: () => Promise<unknown>;
  onAdopt: (selection: Selection) => void;
}) {
  const { api } = useProjectApi();
  // Activity may keep another requirement's controls in the same document.
  const fieldPrefix = useId();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reviewedVersion, setReviewedVersion] = useState(0);
  const [includeClarifications, setIncludeClarifications] = useState(true);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      // Activity/session/project boundaries cancel hidden work, preserving review edits.
      request.current?.abort();
      request.current = null;
      setPending(false);
    },
    [],
  );
  useEffect(() => {
    const update = () =>
      setCooldown(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    if (!retryAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  async function analyze() {
    if (
      !available ||
      editorOpen ||
      pending ||
      analysis ||
      Date.now() < retryAt ||
      request.current
    )
      return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setFailure(null);
    try {
      const response = await api(
        "post",
        "/api/v1/requirements/{id}/ai-analysis",
        {
          path: { id: r.id },
          body: { expectedVersion: r.draftVersion, includeClarifications },
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(35_000),
          ]),
        },
      );
      const parsed = analysisSchema.safeParse(response.data);
      if (!parsed.success || parsed.data.source.requirementId !== r.id)
        throw new ApiError(502, "INVALID_RESPONSE");
      // Re-read after inference; the source version may already be outdated.
      await refresh();
      if (request.current !== controller || controller.signal.aborted) return;
      const data = parsed.data;
      setAnalysis(data);
      setReviewedVersion(data.source.draftVersion);
      setSuggestions(
        groups.flatMap(({ key }) => {
          const values = data.result[key];
          return (typeof values === "string" ? [values] : values).map(
            (value, i) => ({
              id: `${key}-${i}`,
              group: key,
              value,
              selected: false,
            }),
          );
        }),
      );
    } catch (error) {
      if (request.current !== controller || controller.signal.aborted) return;
      setFailure(failureMessage(error));
      if (error instanceof ApiError && error.status === 429)
        setRetryAt(Date.now() + Math.min(error.retryAfter ?? 30, 86400) * 1000);
      if (error instanceof ApiError && [403, 404, 409].includes(error.status))
        await refresh();
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  const stale = !!analysis && reviewedVersion !== r.draftVersion;
  const locked = !available || editorOpen || stale;
  const selected = suggestions.filter((s) => s.selected);
  const summary = selected.find((s) => s.group === "summary");
  const criteria = selected.filter((s) => s.group === "acceptanceCriteria");
  const question = selected.find((s) => s.group === "openQuestions");
  const valid = (s: Suggestion) =>
    !!s.value.trim() && s.value.length <= (s.group === "summary" ? 1000 : 500);
  const revisionValid =
    (!!summary || criteria.length > 0) &&
    (!summary || valid(summary)) &&
    criteria.every(valid);
  function adopt(kind: "revision" | "question") {
    if (!analysis || locked) return;
    if (
      kind === "revision" &&
      (!r.capabilities.createRevision.allowed || !revisionValid)
    )
      return;
    if (
      kind === "question" &&
      (!r.capabilities.askQuestion.allowed || !question || !valid(question))
    )
      return;
    onAdopt({
      kind,
      snapshot: r,
      aiDraft: {
        analysisId: analysis.analysisId,
        sourceVersion: analysis.source.draftVersion,
        ...(kind === "revision"
          ? {
              content: summary?.value.trim(),
              // Keep existing criteria; the normal R04 editor validates the combined limit.
              acceptanceCriteria: [
                ...new Set([
                  ...(r.latestRevision?.acceptanceCriteria ?? []),
                  ...criteria.map((s) => s.value.trim()),
                ]),
              ],
            }
          : { question: question!.value.trim() }),
      },
    });
  }

  return (
    <section className="surface-panel ai-analysis" aria-label="AI 需求分析">
      <div className="section-heading">
        <div>
          <p className="panel-kicker">AI ASSISTANCE</p>
          <h3>AI 需求分析</h3>
        </div>
        <span className="status-badge" data-state="DRAFT">
          AI 草稿 · 待人工确认
        </span>
      </div>
      <p className="muted-copy">
        基于已保存的需求原文、最新规格与可选问答分析。内容将发送至
        DeepSeek；请先确认适合分享。 AI
        建议可能有误，不代表已确认事实。原文保留在上方，分析不会修改需求。
      </p>
      {editorOpen && (
        <p className="field-hint">
          请先保存或关闭当前表单，再分析或采用建议。已有输入不受分析结果影响。
        </p>
      )}
      {!analysis && (
        <>
          <label className="ai-choice">
            <input
              type="checkbox"
              checked={includeClarifications}
              disabled={pending}
              onChange={(e) => setIncludeClarifications(e.target.checked)}
            />
            包含已保存的澄清问答
          </label>
          <Button
            variant="outline"
            disabled={!available || editorOpen || pending || cooldown > 0}
            onClick={() => void analyze()}
          >
            {pending
              ? "正在分析…"
              : cooldown > 0
                ? `${cooldown} 秒后可重试`
                : failure
                  ? "重试 AI 分析"
                  : "分析需求"}
          </Button>
        </>
      )}
      {pending && (
        <p role="status" className="notice">
          AI
          正在分析，通常需要数秒。你仍可手动编辑需求，结果不会覆盖正在填写的表单。
        </p>
      )}
      {failure && (
        <p role="alert" className="notice">
          {failure}
        </p>
      )}
      {analysis && (
        <>
          <p className="record-meta">
            来源：编辑版本 {analysis.source.draftVersion} ·{" "}
            {analysis.source.clarificationIds.length} 条问答
            {analysis.source.revisionId && (
              <>
                {" "}
                ·{" "}
                <Link
                  className="text-link"
                  href={`${requirementPath(r.projectId, r.id)}/revisions/${analysis.source.revisionId}`}
                >
                  查看来源 Revision
                </Link>
              </>
            )}
            <br />
            读取时间：{new Date(analysis.source.readAt).toLocaleString("zh-CN")}
          </p>
          {stale && (
            <div className="notice" role="status">
              <p>
                需求已更新：建议核对版本 {reviewedVersion}，当前编辑版本{" "}
                {r.draftVersion}
                。请对照最新原文、问答和规格重新核对建议；你的修改已保留。
              </p>
              <Button
                variant="outline"
                disabled={!available || editorOpen}
                onClick={() => setReviewedVersion(r.draftVersion)}
              >
                已核对来源与最新内容，继续使用建议
              </Button>
            </div>
          )}
          {groups.map(({ key, label, hint }) => (
            <fieldset className="ai-group" key={key}>
              <legend tabIndex={-1}>{label}</legend>
              <p className="field-hint">{hint}</p>
              {!suggestions.some((s) => s.group === key) && (
                <p className="muted-copy">
                  暂无保留的建议，可在业务表单中手动补充。
                </p>
              )}
              {suggestions
                .filter((s) => s.group === key)
                .map((s, i) => {
                  const editableId = `${fieldPrefix}-ai-${s.id}`;
                  const selectable = key !== "assumptions" && key !== "risks";
                  return (
                    <div className="ai-suggestion" key={s.id}>
                      <div className="ai-suggestion-heading">
                        {selectable ? (
                          <label className="ai-choice">
                            <input
                              type={
                                key === "openQuestions" ? "radio" : "checkbox"
                              }
                              name={
                                key === "openQuestions"
                                  ? `${fieldPrefix}-ai-question`
                                  : undefined
                              }
                              checked={s.selected}
                              onChange={(e) =>
                                setSuggestions((all) =>
                                  all.map((item) =>
                                    item.id === s.id
                                      ? { ...item, selected: e.target.checked }
                                      : key === "openQuestions" &&
                                          item.group === key
                                        ? { ...item, selected: false }
                                        : item,
                                  ),
                                )
                              }
                            />
                            选择{label}
                            {key === "summary" ? "" : ` ${i + 1}`}
                          </label>
                        ) : (
                          <span>
                            {label} {i + 1}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          aria-label={`删除${label} ${i + 1}`}
                          onClick={(event) => {
                            const group =
                              event.currentTarget.closest("fieldset");
                            setSuggestions((all) =>
                              all.filter((item) => item.id !== s.id),
                            );
                            requestAnimationFrame(() => {
                              const target =
                                group?.querySelector("textarea") ??
                                group?.querySelector("legend");
                              target?.focus();
                            });
                          }}
                        >
                          删除
                        </Button>
                      </div>
                      <label className="sr-only" htmlFor={editableId}>
                        {label}
                        {key === "summary" ? "" : ` ${i + 1}`}
                      </label>
                      <textarea
                        id={editableId}
                        className="form-control"
                        rows={key === "summary" ? 3 : 2}
                        maxLength={key === "summary" ? 1000 : 500}
                        value={s.value}
                        aria-invalid={!valid(s)}
                        aria-describedby={
                          !valid(s) ? `${editableId}-error` : undefined
                        }
                        onChange={(e) =>
                          setSuggestions((all) =>
                            all.map((item) =>
                              item.id === s.id
                                ? { ...item, value: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      {!valid(s) && (
                        <p id={`${editableId}-error`} className="field-error">
                          建议不能为空，请填写或删除。
                        </p>
                      )}
                    </div>
                  );
                })}
            </fieldset>
          ))}
          <p className="notice">
            请逐条选择并确认内容。采用仅填写新表单，仍需点击保存或提交问题；假设和风险不会自动变成确认事实。
            建议与编辑只暂存于当前浏览器页面，刷新可能丢失。
          </p>
          <div className="form-actions">
            {(r.capabilities.createRevision.allowed ||
              r.capabilities.createRevision.reasonCode !==
                "ROLE_FORBIDDEN") && (
              <Button
                disabled={
                  locked ||
                  !r.capabilities.createRevision.allowed ||
                  !revisionValid
                }
                onClick={() => adopt("revision")}
              >
                确认采用，填写 Revision 草稿
              </Button>
            )}
            <Button
              variant="outline"
              disabled={
                locked ||
                !r.capabilities.askQuestion.allowed ||
                !question ||
                !valid(question)
              }
              onClick={() => adopt("question")}
            >
              确认采用，填写问题
            </Button>
          </div>
          {!r.capabilities.createRevision.allowed && (
            <p className="field-hint">
              {capabilityReason(r.capabilities.createRevision)}
            </p>
          )}
          {!r.capabilities.askQuestion.allowed && (
            <p className="field-hint">
              {capabilityReason(r.capabilities.askQuestion)}
            </p>
          )}
          <div className="form-actions">
            <Button
              variant="ghost"
              disabled={editorOpen}
              onClick={() => {
                setAnalysis(null);
                setSuggestions([]);
                setFailure(null);
              }}
            >
              清空本次建议
            </Button>
            <span className="field-hint">
              清空会删除本地修改；之后可重新分析。
            </span>
          </div>
        </>
      )}
    </section>
  );
}
