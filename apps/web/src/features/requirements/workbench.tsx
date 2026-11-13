"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useProjectApi } from "@/features/projects/queries";
import { ApiError, errorMessage, type ApiResult } from "@/lib/api/client";
import {
  capabilityReason,
  requirementPath,
  uncertain,
  type Requirement,
} from "./queries";

type Draft = ApiResult<
  "/api/v1/requirements/{id}/working-drafts",
  "get"
>["data"][number];
type Kind = Draft["kind"];
type Body = Draft["body"];
type Publication = ApiResult<
  "/api/v1/requirements/{id}/working-drafts/{kind}/publish",
  "post"
>["data"];
type Publish =
  | {
      kind: "clarify";
      draftId: string;
      expectedDraftVersion: number;
      expectedVersion: number;
      operationId: string;
      questionIds: string[];
    }
  | {
      kind: "specification";
      draftId: string;
      expectedDraftVersion: number;
      expectedVersion: number;
      operationId: string;
    };
const notes = z.array(z.string().min(1).max(500)).max(10);
const suggestion = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("clarify"),
    result: z.object({
      questions: z
        .array(
          z.object({
            body: z.string().min(1).max(500),
            reason: z.string().max(300),
          }),
        )
        .max(10),
      assumptions: notes,
      risks: notes,
    }),
  }),
  z.object({
    mode: z.literal("specification"),
    result: z.object({
      content: z.string().min(1).max(6000),
      acceptanceCriteria: notes,
      openQuestions: notes,
      assumptions: notes,
      risks: notes,
    }),
  }),
]);
const empty = (kind: Kind): Body =>
  kind === "clarify"
    ? { questions: [], assumptions: [], risks: [] }
    : {
        content: "",
        acceptanceCriteria: [],
        openQuestions: [],
        assumptions: [],
        risks: [],
      };
type Props = {
  requirement: Requirement;
  available: boolean;
  supplier: boolean;
  refresh: () => Promise<unknown>;
};

export function RequirementWorkbench(props: Props) {
  const { api } = useProjectApi();
  const [loaded, setLoaded] = useState<Draft[] | null>(null);
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<Kind>("clarify");
  useEffect(() => {
    const controller = new AbortController();
    void api("get", "/api/v1/requirements/{id}/working-drafts", {
      path: { id: props.requirement.id },
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setLoaded(data);
          setError(undefined);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e);
      });
    return () => controller.abort();
  }, [api, props.requirement.id, attempt]);
  return (
    <section className="surface-panel ai-workbench" aria-label="需求工作台">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ASSISTED REVIEW</p>
          <h3>需求工作台</h3>
        </div>
        <span className="status-badge">仅本人可见</span>
      </div>
      <p className="muted-copy">
        先问清楚，或整理规格。工作稿可以单独保存；只有你确认发布的内容会进入项目记录。AI
        的推测不代表已确认事实。
      </p>
      {!loaded ? (
        <>
          {error ? (
            <p role="alert" className="notice">
              工作稿暂时无法加载。{errorMessage(error)} 下方手动问答和 Revision
              仍可使用。
            </p>
          ) : (
            <p role="status">正在读取个人工作稿…</p>
          )}
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            重新读取工作稿
          </Button>
        </>
      ) : (
        <>
          <div className="form-actions" role="group" aria-label="选择任务">
            <Button
              variant={mode === "clarify" ? "default" : "outline"}
              aria-pressed={mode === "clarify"}
              onClick={() => setMode("clarify")}
            >
              帮我问清楚
            </Button>
            {props.supplier && (
              <Button
                variant={mode === "specification" ? "default" : "outline"}
                aria-pressed={mode === "specification"}
                onClick={() => setMode("specification")}
              >
                帮我整理规格
              </Button>
            )}
          </div>
          {(
            ["clarify", ...(props.supplier ? ["specification"] : [])] as Kind[]
          ).map((kind) => (
            <div key={kind} hidden={mode !== kind}>
              <WorkingPane
                {...props}
                kind={kind}
                initial={loaded.find((d) => d.kind === kind) ?? null}
              />
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function WorkingPane({
  requirement: r,
  available,
  refresh,
  kind,
  initial,
}: Props & { kind: Kind; initial: Draft | null }) {
  const { api, queryClient, key } = useProjectApi();
  const [saved, setSaved] = useState(initial);
  const [body, setBody] = useState<Body>(() => initial?.body ?? empty(kind));
  const [baseVersion, setBaseVersion] = useState(
    initial?.baseRequirementVersion ?? r.draftVersion,
  );
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState<{
    body: Body;
    version: number;
    revisionId: string | null;
    clarificationCount: number;
    background: ApiResult<
      "/api/v1/requirements/{id}/ai-assistance",
      "post"
    >["data"]["source"]["background"];
  } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>();
  const [remote, setRemote] = useState<Draft | null | undefined>();
  const [pending, setPending] = useState<Publish | null>(null);
  const [saveUnknown, setSaveUnknown] = useState(false);
  const [denied, setDenied] = useState(false);
  const active = useRef<AbortController | null>(null);
  const activeLabel = useRef<string | null>(null);
  const alive = useRef(false);
  const previewFocus = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      active.current?.abort();
      if (activeLabel.current === "保存" || activeLabel.current === "删除")
        setSaveUnknown(true);
      active.current = null;
      activeLabel.current = null;
      setBusy(null);
    };
  }, []);
  useEffect(() => {
    if (preview || confirm) previewFocus.current?.focus();
  }, [preview, confirm]);
  const dirty =
    !saved ||
    JSON.stringify(body) !== JSON.stringify(saved.body) ||
    baseVersion !== saved.baseRequirementVersion;
  const publishedIds = saved?.publication.questions?.map((q) => q.itemId) ?? [];
  const blocked = !!busy || !!pending || saveUnknown || !available;
  const capability =
    kind === "clarify"
      ? r.capabilities.askQuestion
      : r.capabilities.createRevision;
  const canPublish =
    !!saved &&
    !dirty &&
    !blocked &&
    capability.allowed &&
    baseVersion === r.draftVersion &&
    ("questions" in body
      ? selected.length > 0
      : !!body.content.trim() &&
        saved.publication.revision?.draftVersion !== saved.version);
  async function run(
    label: string,
    work: (signal: AbortSignal) => Promise<void>,
  ) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    activeLabel.current = label;
    setBusy(label);
    setError(undefined);
    setMessage("");
    try {
      await work(
        AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(label === "AI" ? 35_000 : 15_000),
        ]),
      );
    } catch (e) {
      if (
        !alive.current ||
        controller.signal.aborted ||
        active.current !== controller
      )
        return;
      if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
        setDenied(true);
        setBody(empty(kind));
        setPreview(null);
        setSaved(null);
      }
      setError(e);
      if (e instanceof ApiError && e.status === 409) {
        setConfirm(false);
        void refresh();
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        activeLabel.current = null;
        if (alive.current) setBusy(null);
      }
    }
  }
  function generate() {
    void run("AI", async (signal) => {
      const input =
        "questions" in body
          ? {
              mode: "clarify" as const,
              expectedVersion: r.draftVersion,
              instruction,
              draft: body,
            }
          : {
              mode: "specification" as const,
              expectedVersion: r.draftVersion,
              instruction,
              draft: body,
            };
      const { data } = await api(
        "post",
        "/api/v1/requirements/{id}/ai-assistance",
        { path: { id: r.id }, body: input, signal },
      );
      const parsed = suggestion.safeParse(data);
      signal.throwIfAborted();
      if (
        !parsed.success ||
        parsed.data.mode !== kind ||
        data.source.requirementId !== r.id ||
        data.source.draftVersion !== r.draftVersion
      )
        throw new ApiError(503, "AI_INVALID_RESPONSE");
      const result = parsed.data;
      const next: Body =
        result.mode === "clarify"
          ? {
              ...result.result,
              questions: result.result.questions.map((q) => ({
                ...q,
                id: crypto.randomUUID(),
              })),
            }
          : result.result;
      if (alive.current)
        setPreview({
          body: next,
          version: data.source.draftVersion,
          revisionId: data.source.revisionId,
          clarificationCount: data.source.clarificationIds.length,
          background: data.source.background ?? [],
        });
    });
  }
  async function readOwn(signal: AbortSignal) {
    const { data } = await api(
      "get",
      "/api/v1/requirements/{id}/working-drafts",
      { path: { id: r.id }, signal },
    );
    signal.throwIfAborted();
    return data.find((d) => d.kind === kind) ?? null;
  }
  function save() {
    void run("保存", async (signal) => {
      const input = {
        draftId: saved?.id ?? null,
        expectedDraftVersion: saved?.version ?? 0,
        baseRequirementVersion: baseVersion,
      };
      try {
        const { data } = await api(
          "put",
          "/api/v1/requirements/{id}/working-drafts/{kind}",
          {
            path: { id: r.id, kind },
            body:
              "questions" in body
                ? { ...input, kind: "clarify", body }
                : { ...input, kind: "specification", body },
            signal,
          },
        );
        signal.throwIfAborted();
        if (alive.current) {
          setSaved(data);
          setBody(data.body);
          setRemote(undefined);
          setMessage("个人工作稿已保存。项目问答、Revision 和业务状态未改变。");
        }
      } catch (e) {
        if (alive.current && uncertain(e)) setSaveUnknown(true);
        throw e;
      }
    });
  }
  async function completed(result: Publication, signal: AbortSignal) {
    signal.throwIfAborted();
    // Once a receipt is known, a failed follow-up read must not make the publish uncertain again.
    setPending(null);
    setConfirm(false);
    setSelected([]);
    setSaveUnknown(true);
    setMessage("发布已成功；正在核对工作稿状态，请勿重复发布。");
    const fresh = await readOwn(signal);
    if (!alive.current) return;
    setSaved(fresh);
    setSaveUnknown(false);
    if (fresh) {
      setBody(fresh.body);
      setBaseVersion(fresh.baseRequirementVersion);
    }
    setMessage(
      result.revisionId
        ? "已由你确认创建正式 Revision。仍需在原流程中人工标记就绪。"
        : `已发布 ${result.clarificationIds?.length ?? 0} 个问题。其余工作稿已保留，可等待回答后继续。`,
    );
    void queryClient.invalidateQueries({
      queryKey: key("requirements", r.projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: key("revisions", r.projectId, r.id),
    });
    await refresh();
  }
  function publish(retry?: Publish) {
    if (!retry && (!canPublish || !saved)) return;
    const input: Publish = retry ?? {
      draftId: saved!.id,
      expectedDraftVersion: saved!.version,
      expectedVersion: r.draftVersion,
      operationId: crypto.randomUUID(),
      ...(kind === "clarify"
        ? { kind: "clarify" as const, questionIds: selected }
        : { kind: "specification" as const }),
    };
    void run("发布", async (signal) => {
      setPending(input);
      let result: Publication;
      try {
        result = (
          await api(
            "post",
            "/api/v1/requirements/{id}/working-drafts/{kind}/publish",
            { path: { id: r.id, kind }, body: input, signal },
          )
        ).data;
      } catch (e) {
        if (alive.current && !uncertain(e)) setPending(null);
        throw e;
      }
      await completed(result, signal);
    });
  }
  if (denied)
    return (
      <p className="notice" role="alert">
        已停止显示个人工作稿，请刷新页面重新核对访问权限。
      </p>
    );
  return (
    <div
      className="working-pane"
      role="region"
      aria-label={kind === "clarify" ? "澄清工作稿" : "规格工作稿"}
    >
      <p className="field-hint">
        {kind === "clarify"
          ? "准备问题并等待客户作答，无需创建 Revision。"
          : "整理正文和验收标准，可先保存未完成的工作稿，之后再创建正式 Revision。"}{" "}
        {saved ? `工作稿 v${saved.version}` : "尚未保存"} · 依据需求 v
        {baseVersion}
      </p>
      {baseVersion !== r.draftVersion && (
        <div className="notice" role="status">
          <p>
            需求现为 v{r.draftVersion}，工作稿仍基于 v{baseVersion}
            。输入已保留，请先核对上方原文、问答与最新 Revision。
          </p>
          <Button
            variant="outline"
            disabled={blocked}
            onClick={() => {
              setBaseVersion(r.draftVersion);
              setConfirm(false);
            }}
          >
            已核对最新需求，继续编辑
          </Button>
        </div>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {error != null && (
        <p className="notice" role="alert">
          {error instanceof DOMException && error.name === "TimeoutError"
            ? "等待超时，输入已保留。AI 失败不影响手动编辑。"
            : error instanceof ApiError && error.code === "AI_INVALID_RESPONSE"
              ? "AI 返回格式无效，原工作稿已保留。可以重试或继续手动编辑。"
              : error instanceof ApiError && error.status === 413
                ? "本轮材料过长，输入已保留。请减少工作稿内容，或继续手动整理。"
                : error instanceof ApiError && error.status === 503
                  ? "AI 或工作稿服务暂时不可用，输入已保留，可以稍后重试。"
                  : errorMessage(error)}
        </p>
      )}
      {pending && (
        <div className="notice">
          <p>发布结果尚待核对。请勿另建发布操作；以下重试使用同一操作编号。</p>
          <div className="form-actions">
            <Button
              disabled={!!busy}
              onClick={() =>
                void run("核对发布", async (signal) => {
                  try {
                    const { data } = await api(
                      "get",
                      "/api/v1/requirements/{id}/working-draft-publications/{operationId}",
                      {
                        path: { id: r.id, operationId: pending.operationId },
                        signal,
                      },
                    );
                    await completed(data, signal);
                  } catch (e) {
                    if (e instanceof ApiError && e.status === 404) {
                      setMessage("尚未查到回执，可重试同一发布操作。");
                      return;
                    }
                    throw e;
                  }
                })
              }
            >
              查询发布结果
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => publish(pending)}
            >
              重试同一发布
            </Button>
          </div>
        </div>
      )}
      {(saveUnknown ||
        (error instanceof ApiError &&
          error.code === "STALE_WORKING_DRAFT")) && (
        <Button
          variant="outline"
          disabled={!!busy || !!pending}
          onClick={() =>
            void run("核对工作稿", async (signal) => {
              const current = await readOwn(signal);
              if (alive.current) {
                setRemote(current);
                setSaveUnknown(false);
              }
            })
          }
        >
          核对已保存工作稿，保留当前输入
        </Button>
      )}
      {remote !== undefined && (
        <div className="notice">
          <h4>服务端工作稿{remote ? ` v${remote.version}` : "已删除"}</h4>
          {remote && <BodyPreview body={remote.body} />}
          <p>
            请核对差异。当前输入仍保留在下方，选择继续后才会使用这个版本保存。
          </p>
          <Button
            variant="outline"
            disabled={blocked}
            onClick={() => {
              setSaved(remote);
              setRemote(undefined);
              setError(undefined);
            }}
          >
            保留我的输入，基于此版本继续
          </Button>
        </div>
      )}
      <fieldset disabled={blocked} className="work-fields">
        <label className="form-field">
          本轮希望 AI 帮忙做什么（可选）
          <textarea
            className="form-control"
            rows={2}
            maxLength={2000}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </label>
        <div className="form-actions">
          <Button onClick={generate}>
            {busy === "AI"
              ? "AI 正在分析…"
              : kind === "clarify"
                ? "生成澄清建议"
                : "生成规格建议"}
          </Button>
          <p className="field-hint">
            本轮将发送需求原文、已记录问答、最新
            Revision、当前工作稿及相关的已共享背景片段。内部背景不会自动用于对客生成。
          </p>
        </div>
      </fieldset>
      {preview && (
        <section className="notice work-preview" aria-label="AI 建议预览">
          <h4 tabIndex={-1} ref={previewFocus}>
            AI 建议预览 · 需求 v{preview.version}
          </h4>
          <p className="field-hint">
            来源：需求原文、项目初始参考、{preview.clarificationCount} 条问答
            {preview.revisionId && (
              <>
                、
                <Link
                  className="text-link"
                  href={`${requirementPath(r.projectId, r.id)}/revisions/${preview.revisionId}`}
                >
                  来源 Revision
                </Link>
              </>
            )}
            ，以及当前个人工作稿。
          </p>
          {!!preview.background.length && (
            <div className="field-hint">
              <p>本轮参考背景（未经批准）：</p>
              <ul>
                {preview.background.map((source) => (
                  <li key={source.chunkId}>
                    <Link className="text-link" href={source.href}>
                      {source.title} · v{source.versionNo} ·{" "}
                      {source.locatorKind === "page" ? "页" : "段"}{" "}
                      {source.locatorStart}–{source.locatorEnd}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <BodyPreview body={preview.body} />
          <p>采用后仅替换当前未发布工作稿，不会自动保存。已发布的问题保留。</p>
          <div className="form-actions">
            <Button
              disabled={blocked || preview.version !== r.draftVersion}
              onClick={() => {
                if ("questions" in preview.body && "questions" in body) {
                  const keep = body.questions.filter((q) =>
                    publishedIds.includes(q.id),
                  );
                  if (keep.length + preview.body.questions.length > 10) {
                    setMessage(
                      "工作稿最多 10 个问题，请先删除已发布条目或减少建议后再采用。",
                    );
                    return;
                  }
                  setBody({
                    ...preview.body,
                    questions: [...keep, ...preview.body.questions],
                  });
                } else setBody(preview.body);
                setBaseVersion(preview.version);
                setSelected([]);
                setPreview(null);
                setConfirm(false);
              }}
            >
              采用到当前工作稿
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => setPreview(null)}
            >
              保留原稿，关闭建议
            </Button>
          </div>
        </section>
      )}
      <fieldset className="work-fields" disabled={blocked}>
        {"questions" in body ? (
          <>
            <h4>待澄清的问题</h4>
            {!body.questions.length && (
              <p className="muted-copy">可直接手写问题，也可以先生成建议。</p>
            )}
            {body.questions.map((q, i) => (
              <article className="clarification" key={q.id}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    disabled={publishedIds.includes(q.id)}
                    checked={selected.includes(q.id)}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids, q.id]
                          : ids.filter((id) => id !== q.id),
                      )
                    }
                  />
                  选择问题 {i + 1}
                  {publishedIds.includes(q.id) && " · 已发布"}
                </label>
                <label className="form-field">
                  问题 {i + 1}
                  <textarea
                    className="form-control"
                    rows={3}
                    maxLength={10000}
                    readOnly={publishedIds.includes(q.id)}
                    value={q.body}
                    onChange={(e) =>
                      setBody({
                        ...body,
                        questions: body.questions.map((item) =>
                          item.id === q.id
                            ? { ...item, body: e.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
                <label className="form-field">
                  提问原因 {i + 1}
                  <input
                    className="form-control"
                    maxLength={500}
                    value={q.reason}
                    onChange={(e) =>
                      setBody({
                        ...body,
                        questions: body.questions.map((item) =>
                          item.id === q.id
                            ? { ...item, reason: e.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setBody({
                      ...body,
                      questions: body.questions.filter(
                        (item) => item.id !== q.id,
                      ),
                    });
                    setSelected((ids) => ids.filter((id) => id !== q.id));
                  }}
                >
                  移除问题 {i + 1}
                </Button>
              </article>
            ))}
            <Button
              variant="outline"
              disabled={body.questions.length >= 10}
              onClick={() =>
                setBody({
                  ...body,
                  questions: [
                    ...body.questions,
                    { id: crypto.randomUUID(), body: "", reason: "" },
                  ],
                })
              }
            >
              手动添加问题
            </Button>
          </>
        ) : (
          <>
            <label className="form-field">
              规格工作稿正文
              <textarea
                className="form-control"
                rows={8}
                maxLength={20000}
                value={body.content}
                onChange={(e) => setBody({ ...body, content: e.target.value })}
              />
            </label>
            <Notes
              label="验收标准"
              items={body.acceptanceCriteria}
              max={100}
              length={1000}
              onChange={(items) =>
                setBody({ ...body, acceptanceCriteria: items })
              }
            />
            <Notes
              label="未决问题"
              items={body.openQuestions}
              onChange={(items) => setBody({ ...body, openQuestions: items })}
            />
          </>
        )}
        <Notes
          label="待确认假设"
          items={body.assumptions}
          onChange={(items) => setBody({ ...body, assumptions: items })}
        />
        <Notes
          label="风险"
          items={body.risks}
          onChange={(items) => setBody({ ...body, risks: items })}
        />
        <div className="form-actions">
          <Button variant="outline" disabled={!dirty} onClick={save}>
            保存个人工作稿
          </Button>
          <Button disabled={!canPublish} onClick={() => setConfirm(true)}>
            {kind === "clarify" ? "预览发布所选问题" : "预览创建 Revision"}
          </Button>
        </div>
      </fieldset>
      {dirty && (
        <p className="field-hint" role="status">
          有未保存的输入。先保存个人工作稿再发布；离开页面前请保存。
        </p>
      )}
      {saved && (
        <Button
          variant="ghost"
          disabled={blocked}
          onClick={() => setDeleteConfirm(true)}
        >
          删除个人工作稿
        </Button>
      )}
      {deleteConfirm && saved && (
        <div className="notice" role="group" aria-label="删除工作稿确认">
          <p>
            删除这一份个人工作稿及当前未保存的输入？已发布问题、Revision
            和发布回执会保留。
          </p>
          <div className="form-actions">
            <Button
              variant="destructive"
              disabled={blocked}
              onClick={() =>
                void run("删除", async (signal) => {
                  try {
                    await api(
                      "delete",
                      "/api/v1/requirements/{id}/working-drafts/{kind}",
                      {
                        path: { id: r.id, kind },
                        body: {
                          draftId: saved.id,
                          expectedDraftVersion: saved.version,
                        },
                        signal,
                      },
                    );
                    signal.throwIfAborted();
                    if (alive.current) {
                      setSaved(null);
                      setBody(empty(kind));
                      setBaseVersion(r.draftVersion);
                      setSelected([]);
                      setPreview(null);
                      setConfirm(false);
                      setDeleteConfirm(false);
                      setMessage("个人工作稿已删除，正式记录保持不变。");
                    }
                  } catch (e) {
                    if (alive.current && uncertain(e)) setSaveUnknown(true);
                    throw e;
                  }
                })
              }
            >
              确认删除个人工作稿
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => setDeleteConfirm(false)}
            >
              保留工作稿
            </Button>
          </div>
        </div>
      )}
      {!capability.allowed && (
        <p className="field-hint">
          {capabilityReason(capability)} 仍可保存个人工作稿。
        </p>
      )}
      {confirm && saved && (
        <section className="notice work-preview" aria-label="人工发布确认">
          <h4 ref={previewFocus} tabIndex={-1}>
            请确认正式发布内容
          </h4>
          <p>
            依据需求 v{baseVersion}、个人工作稿 v{saved.version}。
            {kind === "clarify"
              ? "所选问题将对项目成员可见；原因、假设和风险保持私有。"
              : "以下正文和验收标准将成为不可变 Revision；未决问题、假设和风险保持私有。"}
          </p>
          {"questions" in body ? (
            body.questions
              .filter((q) => selected.includes(q.id))
              .map((q) => (
                <p className="record-text" key={q.id}>
                  {q.body}
                </p>
              ))
          ) : (
            <>
              <p className="record-text">{body.content}</p>
              <ul>
                {body.acceptanceCriteria.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          <div className="form-actions">
            <Button disabled={!canPublish} onClick={() => publish()}>
              {kind === "clarify" ? "确认发布问题" : "确认创建 Revision"}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => setConfirm(false)}
            >
              返回编辑
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Notes({
  label,
  items,
  onChange,
  max = 10,
  length = 500,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  max?: number;
  length?: number;
}) {
  return (
    <fieldset className="criteria-editor">
      <legend>{label}</legend>
      {items.map((item, i) => (
        <div key={i} className="criterion-editor">
          <label className="form-field">
            {label} {i + 1}
            <textarea
              className="form-control"
              rows={2}
              maxLength={length}
              value={item}
              onChange={(e) =>
                onChange(items.map((v, n) => (n === i ? e.target.value : v)))
              }
            />
          </label>
          <Button
            variant="ghost"
            onClick={() => onChange(items.filter((_, n) => n !== i))}
          >
            移除{label} {i + 1}
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        disabled={items.length >= max}
        onClick={() => onChange([...items, ""])}
      >
        添加{label}
      </Button>
    </fieldset>
  );
}
function BodyPreview({ body }: { body: Body }) {
  const sections = [
    ["待确认假设", body.assumptions],
    ["风险", body.risks],
    ...("questions" in body
      ? []
      : [
          ["验收标准", body.acceptanceCriteria],
          ["未决问题", body.openQuestions],
        ]),
  ] as [string, string[]][];
  return (
    <div className="record-text">
      {"questions" in body ? (
        body.questions.map((q, i) => (
          <div key={q.id}>
            <strong>
              问题 {i + 1}：{q.body}
            </strong>
            <p>{q.reason}</p>
          </div>
        ))
      ) : (
        <p>{body.content}</p>
      )}
      {sections
        .filter(([, items]) => items.length)
        .map(([label, items]) => (
          <div key={label}>
            <h5>{label}</h5>
            <ul>
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
