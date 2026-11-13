"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useProjectApi, type Project } from "@/features/projects/queries";
import { ApiError, errorMessage, type ApiResult } from "@/lib/api/client";
import type { PageContext } from "./contract";

type Proposal = ApiResult<
  "/api/v1/requirements/{id}/copilot-proposals/{proposalId}",
  "get"
>["data"];
type Requirement = ApiResult<"/api/v1/requirements/{id}", "get">["data"];
type WorkDraft = ApiResult<
  "/api/v1/requirements/{id}/working-drafts",
  "get"
>["data"][number];
type Item = ApiResult<
  "/api/v1/projects/{id}/requirements",
  "get"
>["data"][number];
type Change = ApiResult<
  "/api/v1/projects/{id}/change-requests",
  "get"
>["data"][number];
type Kind = Proposal["kind"];
const labels: Record<Kind, string> = {
  publish_questions: "发布澄清问题",
  create_revision: "创建 Revision",
  create_change_draft: "创建商业草稿",
  update_change_draft: "更新商业草稿",
};
const collection = "/api/v1/requirements/{id}/copilot-proposals" as const;
const detail =
  "/api/v1/requirements/{id}/copilot-proposals/{proposalId}" as const;
const terminal = (e: unknown) =>
  e instanceof ApiError && [401, 403, 404].includes(e.status);
const unknownResult = (e: unknown) =>
  !(e instanceof ApiError) || e.status >= 500;
function clean(p: Proposal) {
  const payload = { ...p.payload };
  for (const key of [
    "acceptanceCriteria",
    "assumptions",
    "risks",
    "openQuestions",
  ] as const) {
    if (key in payload) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value))
        (payload as Record<string, unknown>)[key] = value
          .map((x) => String(x).trim())
          .filter(Boolean);
    }
  }
  return { kind: p.kind, payload } as {
    kind: Proposal["kind"];
    payload: Proposal["payload"];
  };
}
// State stays with Conversation, outside the portalled drawer. Closing aborts IO but
// retains local edits and an uncertain execution ID until the user checks the receipt.
export function useProposalWorkspace({
  projectId,
  project,
  open,
  page,
  onNavigate,
}: {
  projectId: string;
  project: Project | null;
  open: boolean;
  page: PageContext;
  onNavigate: () => void;
}) {
  const { api, queryClient } = useProjectApi();
  const [expanded, setExpanded] = useState(false),
    [selected, setSelected] = useState("");
  const [items, setItems] = useState<Item[]>([]),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false);
  const [requirement, setRequirement] = useState<Requirement | null>(null),
    [drafts, setDrafts] = useState<WorkDraft[]>([]),
    [changes, setChanges] = useState<Change[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [history, setHistory] = useState<Proposal[]>([]),
    [historyMore, setHistoryMore] = useState(false);
  const [saved, setSaved] = useState<Proposal | null>(null),
    [editing, setEditing] = useState<Proposal | null>(null);
  const [kind, setKind] = useState<Kind>("publish_questions"),
    [source, setSource] = useState<"generate" | "working_draft">("generate"),
    [changeId, setChangeId] = useState("");
  const [busy, setBusy] = useState(false),
    [verified, setVerified] = useState(false),
    [error, setError] = useState<string | null>(null),
    [unknown, setUnknown] = useState(false),
    [stale, setStale] = useState(false),
    [confirm, setConfirm] = useState(false),
    [discard, setDiscard] = useState(false),
    [reload, setReload] = useState(0);
  const pending = useRef<{
    controller: AbortController;
    write: boolean;
  } | null>(null);
  const execution = useRef<{ proposalId: string; operationId: string } | null>(
    null,
  );
  const role = useRef<string | undefined>(undefined);
  const requirementPageId = page.kind === "requirement" ? page.id : "";
  const supplier = project?.projectRole !== "CLIENT";
  const dirty = !!(
    editing &&
    saved &&
    JSON.stringify(editing.payload) !== JSON.stringify(saved.payload)
  );
  const readOnly = project?.status !== "ACTIVE";
  const clear = () => {
    setSaved(null);
    setEditing(null);
    setConfirm(false);
    setDiscard(false);
    setError(null);
    setUnknown(false);
    setStale(false);
    execution.current = null;
  };
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setVerified(false);
      if (!open || !expanded) return;
      if (role.current && role.current !== project?.projectRole) {
        setSelected("");
        setSaved(null);
        setEditing(null);
        setHistory([]);
        setDrafts([]);
        setChanges([]);
        setKind("publish_questions");
        setSource("generate");
        execution.current = null;
      }
      role.current = project?.projectRole;
      try {
        const list = await api("get", "/api/v1/projects/{id}/requirements", {
          path: { id: projectId },
          query: { limit: 20, offset },
          signal: controller.signal,
        });
        setItems(list.data);
        setMore(list.meta.hasMore);
        const id = selected || requirementPageId;
        if (id) {
          const r = await api("get", "/api/v1/requirements/{id}", {
            path: { id },
            signal: controller.signal,
          });
          if (r.data.projectId !== projectId)
            throw new ApiError(404, "NOT_FOUND");
          const [draftList, proposalList] = await Promise.all([
            api("get", "/api/v1/requirements/{id}/working-drafts", {
              path: { id },
              signal: controller.signal,
            }),
            api("get", collection, {
              path: { id },
              query: { limit: 20, offset: historyOffset },
              signal: controller.signal,
            }),
          ]);
          const c =
            project?.projectRole !== "CLIENT"
              ? await api("get", "/api/v1/projects/{id}/change-requests", {
                  path: { id: projectId },
                  query: { requirementId: id, limit: 50, offset: 0 },
                  signal: controller.signal,
                })
              : null;
          if (controller.signal.aborted) return;
          setSelected(id);
          setRequirement(r.data);
          setDrafts(draftList.data);
          setHistory(proposalList.data.items);
          setHistoryMore(proposalList.data.hasMore);
          setChanges(
            c?.data.filter(
              (x) => x.requirementId === id && x.status === "DRAFT",
            ) ?? [],
          );
        }
        if (!controller.signal.aborted) setVerified(true);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(errorMessage(e));
        if (terminal(e)) {
          setSaved(null);
          setEditing(null);
          setHistory([]);
          setDrafts([]);
          setChanges([]);
          setItems([]);
          execution.current = null;
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      const req = pending.current;
      if (req) {
        req.controller.abort();
        pending.current = null;
        setBusy(false);
        if (req.write) {
          setUnknown(true);
          setError("操作结果尚未确认，请先核对服务器记录。");
        }
      }
    };
  }, [
    api,
    projectId,
    project?.projectRole,
    open,
    expanded,
    selected,
    offset,
    historyOffset,
    reload,
    requirementPageId,
  ]);
  const run = async (
    work: (signal: AbortSignal) => Promise<void>,
    write = true,
  ) => {
    if (busy || !verified) return;
    const controller = new AbortController();
    pending.current = { controller, write };
    setBusy(true);
    setError(null);
    setConfirm(false);
    try {
      await work(
        AbortSignal.any([controller.signal, AbortSignal.timeout(65_000)]),
      );
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(errorMessage(e));
      if (terminal(e)) {
        setVerified(false);
        setSaved(null);
        setEditing(null);
        setHistory([]);
        setDrafts([]);
        setChanges([]);
        execution.current = null;
      } else {
        if (write && unknownResult(e)) {
          setUnknown(true);
          setError(
            "操作结果尚未确认。输入已保留，请先核对服务器记录，避免重复执行。",
          );
        }
        if (e instanceof ApiError && e.status === 409) setStale(true);
      }
    } finally {
      if (pending.current?.controller === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  };
  const adopt = (p: Proposal) => {
    setSaved(p);
    setEditing(p);
    setUnknown(false);
    setStale(false);
    setConfirm(false);
    setError(null);
  };
  const prepare = () =>
    void run(async (signal) => {
      if (!requirement) return;
      const work = drafts.find(
        (d) =>
          d.kind ===
          (kind === "publish_questions" ? "clarify" : "specification"),
      );
      const change = changes.find((c) => c.id === changeId);
      const commercial =
        kind === "create_change_draft" || kind === "update_change_draft";
      const result = await api("post", collection, {
        path: { id: selected },
        body: {
          kind,
          expectedVersion: requirement.draftVersion,
          source: commercial ? "current" : source,
          ...(!commercial && source === "working_draft"
            ? { draftId: work!.id, expectedDraftVersion: work!.version }
            : {}),
          ...(kind === "update_change_draft"
            ? {
                changeRequestId: change!.id,
                expectedChangeVersion: change!.lockVersion,
              }
            : {}),
        },
        signal,
      });
      adopt(result.data);
      setHistory((v) => [result.data, ...v].slice(0, 50));
    });
  const save = () =>
    void run(async (signal) => {
      if (!editing || !saved) return;
      const r = await api("put", detail, {
        path: { id: selected, proposalId: saved.id },
        body: {
          expectedProposalVersion: saved.version,
          content: clean(editing) as ProposalEditContent,
        },
        signal,
      });
      adopt(r.data);
    });
  const check = () =>
    void run(async (signal) => {
      if (saved) {
        const r = await api("get", detail, {
          path: { id: selected, proposalId: saved.id },
          signal,
        });
        if (r.data.status === "EXECUTED") {
          if (
            execution.current &&
            r.data.operationId !== execution.current.operationId
          ) {
            setError("此提案已由其他操作执行，请核对业务结果。");
          }
          adopt(r.data);
          execution.current = null;
          await queryClient.invalidateQueries();
        } else {
          setUnknown(false);
          setStale(true);
          setError(
            "服务器尚未记录执行成功。输入已保留；请核对已保存预览及最新业务版本，再继续。若原请求仍在处理中，再次确认会沿用同一操作编号。",
          );
        }
      } else {
        setUnknown(false);
        setReload((v) => v + 1);
        setError("请检查最近提案，确认是否已经准备成功，再决定是否新建。");
      }
    }, false);
  const perform = () =>
    void run(async (signal) => {
      if (!saved || dirty || unknown || stale) return;
      const op =
        execution.current?.proposalId === saved.id
          ? execution.current
          : { proposalId: saved.id, operationId: crypto.randomUUID() };
      execution.current = op;
      const r = await api(
        "post",
        "/api/v1/requirements/{id}/copilot-proposals/{proposalId}/execute",
        {
          path: { id: selected, proposalId: saved.id },
          body: {
            expectedProposalVersion: saved.version,
            expectedVersion: saved.baseRequirementVersion,
            ...(saved.baseChangeVersion === null
              ? {}
              : { expectedChangeVersion: saved.baseChangeVersion }),
            operationId: op.operationId,
          },
          signal,
        },
      );
      adopt(r.data);
      execution.current = null;
      await queryClient.invalidateQueries();
    });
  const loadSaved = () =>
    void run(async (signal) => {
      if (!saved) return;
      const r = await api("get", detail, {
        path: { id: selected, proposalId: saved.id },
        signal,
      });
      const business = await api("get", "/api/v1/requirements/{id}", {
        path: { id: selected },
        signal,
      });
      if (business.data.projectId !== projectId)
        throw new ApiError(404, "NOT_FOUND");
      adopt(r.data);
      setRequirement(business.data);
      if (
        r.data.status === "DRAFT" &&
        r.data.baseRequirementVersion !== business.data.draftVersion
      ) {
        setStale(true);
        setError(
          "业务版本已变化。旧提案不会自动重定基线，请保留所需文字并返回任务列表重新准备。",
        );
      }
    }, false);
  const changeKind = (value: Kind) => {
    setKind(value);
    setChangeId("");
  };
  const activeDraft = drafts.find(
    (d) =>
      d.kind === (kind === "publish_questions" ? "clarify" : "specification"),
  );
  const notes = (p: Proposal) =>
    p.kind === "publish_questions" || p.kind === "create_revision"
      ? [
          ...p.payload.assumptions,
          ...p.payload.risks,
          ...(p.kind === "create_revision" ? p.payload.openQuestions : []),
        ]
      : [];
  return {
    expanded,
    openTarget: (id: string) => {
      if (saved || busy) {
        setExpanded(true);
        setError("请先处理当前提案，再切换业务对象。");
        return;
      }
      setSelected(id);
      setHistoryOffset(0);
      setExpanded(true);
    },
    view: (
      <section className="copilot-proposals" aria-label="Copilot 人工确认任务">
        <Button
          variant="outline"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          准备操作与个人提案
        </Button>
        {expanded && (
          <>
            <p className="field-hint">
              准备只保存本人可见的提案，有效期24小时。确认才写入业务；不会自动标记就绪、提交审批或验收。对话内容不会自动复制到提案。
            </p>
            {!verified && !error && <p role="status">正在核验任务权限…</p>}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {busy && <p role="status">正在处理，请稍候…</p>}
            {unknown && (
              <Button disabled={busy} variant="outline" onClick={check}>
                核对服务器记录
              </Button>
            )}
            {!verified && error && (
              <Button onClick={() => setReload((v) => v + 1)}>
                重新核验任务权限
              </Button>
            )}
            {verified && !editing && (
              <>
                <label>
                  选择需求
                  <select
                    value={selected}
                    disabled={busy || unknown}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setHistoryOffset(0);
                      setRequirement(null);
                      setChangeId("");
                      setError(null);
                    }}
                  >
                    <option value="">请选择</option>
                    {selected &&
                      !items.some((i) => i.id === selected) &&
                      requirement && (
                        <option value={selected}>{requirement.title}</option>
                      )}
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="copilot-actions">
                  <Button
                    variant="ghost"
                    disabled={busy || offset === 0}
                    onClick={() => setOffset((v) => Math.max(0, v - 20))}
                  >
                    上一页需求
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy || !more}
                    onClick={() => setOffset((v) => v + 20)}
                  >
                    下一页需求
                  </Button>
                </div>
                {requirement && (
                  <>
                    <p>
                      目标：{requirement.title} · 业务版本{" "}
                      {requirement.draftVersion} ·{" "}
                      {
                        {
                          DRAFT: "草稿",
                          CLARIFYING: "澄清中",
                          READY: "已就绪",
                        }[requirement.status]
                      }
                    </p>
                    <label>
                      准备任务
                      <select
                        value={kind}
                        disabled={busy || unknown || readOnly}
                        onChange={(e) => changeKind(e.target.value as Kind)}
                      >
                        {Object.entries(labels)
                          .filter(
                            ([k]) => supplier || k === "publish_questions",
                          )
                          .map(([k, v]) => (
                            <option value={k} key={k}>
                              {v}
                            </option>
                          ))}
                      </select>
                    </label>
                    {kind === "publish_questions" ||
                    kind === "create_revision" ? (
                      <label>
                        内容来源
                        <select
                          value={source}
                          disabled={busy || unknown}
                          onChange={(e) =>
                            setSource(e.target.value as typeof source)
                          }
                        >
                          <option value="generate">
                            重新生成建议（仅共享背景）
                          </option>
                          <option value="working_draft" disabled={!activeDraft}>
                            复制本人工作稿（无需 AI）
                          </option>
                        </select>
                      </label>
                    ) : (
                      <p className="field-hint">
                        从最新就绪规格或现有商业草稿准备；工时与金额需要人工核对，不生成商业承诺。
                      </p>
                    )}
                    {kind === "update_change_draft" && (
                      <label>
                        待更新商业草稿
                        <select
                          value={changeId}
                          disabled={busy}
                          onChange={(e) => setChangeId(e.target.value)}
                        >
                          <option value="">请选择</option>
                          {changes.map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.id.slice(0, 8)} · 版本 {c.lockVersion}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <Button
                      disabled={
                        busy ||
                        unknown ||
                        readOnly ||
                        (kind === "update_change_draft" && !changeId) ||
                        ((kind === "publish_questions" ||
                          kind === "create_revision") &&
                          source === "working_draft" &&
                          !activeDraft)
                      }
                      onClick={prepare}
                    >
                      准备个人提案
                    </Button>
                    <h4>最近的个人提案</h4>
                    {!history.length && (
                      <p className="field-hint">
                        尚无提案。原手动编辑流程始终可用。
                      </p>
                    )}
                    {history.map((p) => (
                      <Button
                        className="proposal-history"
                        key={p.id}
                        variant="ghost"
                        disabled={busy || unknown}
                        onClick={() =>
                          void run(async (signal) => {
                            const r = await api("get", detail, {
                              path: { id: selected, proposalId: p.id },
                              signal,
                            });
                            adopt(r.data);
                          }, false)
                        }
                      >
                        {labels[p.kind]} ·{" "}
                        {p.status === "EXECUTED" ? "已执行" : "待确认"} ·{" "}
                        {new Date(p.createdAt).toLocaleString("zh-CN")}
                      </Button>
                    ))}
                    <p className="field-hint">
                      未执行提案优先显示；过期提案仍可由本人删除。
                    </p>
                    <div className="copilot-actions">
                      <Button
                        variant="ghost"
                        disabled={busy || unknown || historyOffset === 0}
                        onClick={() =>
                          setHistoryOffset((v) => Math.max(0, v - 20))
                        }
                      >
                        上一页提案
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy || unknown || !historyMore}
                        onClick={() => setHistoryOffset((v) => v + 20)}
                      >
                        下一页提案
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
            {verified && editing && saved && (
              <>
                <h4>
                  {labels[editing.kind]} ·{" "}
                  {editing.status === "EXECUTED" ? "已执行" : "待人工确认"}
                </h4>
                <p className="field-hint">
                  需求 {requirement?.title} · 准备时业务版本{" "}
                  {saved.baseRequirementVersion} · 提案版本 {saved.version} ·
                  到期 {new Date(saved.expiresAt).toLocaleString("zh-CN")}
                </p>
                <ProposalEditor
                  value={editing}
                  onChange={setEditing}
                  disabled={
                    busy || unknown || readOnly || editing.status === "EXECUTED"
                  }
                />
                {!!notes(editing).length && (
                  <div className="proposal-notes">
                    <strong>仍需核对，不能当作批准事实</strong>
                    <ul>
                      {notes(editing).map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <details>
                  <summary>核对来源与版本</summary>
                  <ul>
                    {saved.sources.map((s, i) => (
                      <li key={i}>
                        {s.type === "document" ? (
                          <Link
                            onClick={onNavigate}
                            href={`/app/projects/${projectId}/documents/${s.documentId}/versions/${s.versionId}`}
                          >
                            共享背景版本 {s.versionId.slice(0, 8)}
                          </Link>
                        ) : s.type === "requirement" ? (
                          <Link
                            onClick={onNavigate}
                            href={`/app/projects/${projectId}/requirements/${s.id}`}
                          >
                            需求业务版本 {s.version}
                          </Link>
                        ) : s.type === "revision" ? (
                          <Link
                            onClick={onNavigate}
                            href={`/app/projects/${projectId}/requirements/${selected}/revisions/${s.id}`}
                          >
                            不可变规格 {s.id.slice(0, 8)}
                          </Link>
                        ) : s.type === "working_draft" ? (
                          `本人工作稿快照 v${s.version}（不修改原工作稿）`
                        ) : (
                          `商业草稿版本 ${s.version}`
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
                {saved.status === "EXECUTED" ? (
                  <div role="status">
                    <p>已完成人工确认操作，回执已保存。</p>
                    {saved.result?.changeRequestId ? (
                      <Link
                        onClick={onNavigate}
                        href={`/app/projects/${projectId}/changes/${saved.result.changeRequestId}`}
                      >
                        查看商业草稿
                      </Link>
                    ) : (
                      <Link
                        onClick={onNavigate}
                        href={`/app/projects/${projectId}/requirements/${selected}`}
                      >
                        查看需求中的发布结果
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="copilot-actions">
                      <Button
                        variant="outline"
                        disabled={busy || unknown || !dirty || readOnly}
                        onClick={save}
                      >
                        保存预览修改
                      </Button>
                      <Button
                        disabled={busy || unknown || dirty || stale || readOnly}
                        onClick={() => {
                          if (Date.parse(saved.expiresAt) <= Date.now()) {
                            setError("提案已过期，请核对最新业务后重新准备。");
                            setStale(true);
                          } else setConfirm(true);
                        }}
                      >
                        核对并继续
                      </Button>
                    </div>
                    {dirty && (
                      <p className="field-hint">
                        请先保存修改，确认会使用服务器中的预览内容。
                      </p>
                    )}
                    {stale && (
                      <>
                        <p className="field-hint">
                          输入仍保留。请人工核对最新版本，再决定是否重新准备。
                        </p>
                        <Button
                          variant="outline"
                          disabled={busy || unknown}
                          onClick={() => {
                            if (dirty) {
                              setError(
                                "请先复制或保存需要保留的编辑；此操作会加载服务器版本。",
                              );
                              setDiscard(true);
                            } else loadSaved();
                          }}
                        >
                          加载服务器预览并核对
                        </Button>
                      </>
                    )}
                    {confirm && (
                      <section
                        className="proposal-confirm"
                        aria-label="确认提案执行"
                      >
                        <h4>确认写入业务</h4>
                        <p>
                          将{labels[saved.kind]}，目标业务版本为{" "}
                          {saved.baseRequirementVersion}
                          。请核对以上正文、所选条目和待确认事项。
                        </p>
                        <Button
                          disabled={busy || dirty || unknown || stale}
                          onClick={perform}
                        >
                          确认执行此提案
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setConfirm(false)}
                        >
                          返回编辑
                        </Button>
                      </section>
                    )}
                    <Button
                      variant="ghost"
                      disabled={busy || unknown || readOnly}
                      onClick={() => setDiscard(true)}
                    >
                      删除此提案
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  disabled={busy || unknown}
                  onClick={() => {
                    if (dirty) {
                      setDiscard(true);
                    } else {
                      clear();
                      setReload((v) => v + 1);
                    }
                  }}
                >
                  返回任务列表
                </Button>
                {discard && (
                  <section aria-label="确认放弃提案编辑">
                    <p>
                      请先复制需要保留的文字。删除只影响未执行提案，正式业务历史保持。
                    </p>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        clear();
                        setReload((v) => v + 1);
                      }}
                    >
                      放弃本地编辑并返回
                    </Button>
                    {saved.status === "DRAFT" && (
                      <Button
                        disabled={busy || unknown}
                        onClick={() =>
                          void run(async (signal) => {
                            await api("delete", detail, {
                              path: { id: selected, proposalId: saved.id },
                              body: { expectedProposalVersion: saved.version },
                              signal,
                            });
                            clear();
                            setReload((v) => v + 1);
                          })
                        }
                      >
                        确认删除个人提案
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setDiscard(false)}>
                      保留编辑
                    </Button>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </section>
    ),
  };
}
// The generated API discriminates kind/payload together; clean preserves that pairing.
type ProposalEditContent = NonNullable<
  import("@/lib/api/generated/schema").paths["/api/v1/requirements/{id}/copilot-proposals/{proposalId}"]["put"]["requestBody"]
>["content"]["application/json"]["content"];
function ProposalEditor({
  value,
  onChange,
  disabled,
}: {
  value: Proposal;
  onChange: (p: Proposal) => void;
  disabled: boolean;
}) {
  const fieldPrefix = useId();
  const area = (
    label: string,
    content: string,
    change: (s: string) => void,
    maxLength = 20000,
  ) => {
    const id = `${fieldPrefix}-${encodeURIComponent(label)}`;
    return (
      <div className="proposal-field">
        <label htmlFor={id}>{label}</label>
        <textarea
          id={id}
          rows={3}
          maxLength={maxLength}
          disabled={disabled}
          value={content}
          onChange={(e) => change(e.target.value)}
        />
      </div>
    );
  };
  if (value.kind === "publish_questions")
    return (
      <div>
        {value.payload.questions.map((q, i) => (
          <div className="proposal-question" key={q.id}>
            <label>
              <input
                type="checkbox"
                checked={q.selected}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    payload: {
                      ...value.payload,
                      questions: value.payload.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, selected: e.target.checked }
                          : x,
                      ),
                    },
                  })
                }
              />
              采用问题 {i + 1}
            </label>
            {area(
              `问题 ${i + 1}`,
              q.body,
              (s) =>
                onChange({
                  ...value,
                  payload: {
                    ...value.payload,
                    questions: value.payload.questions.map((x) =>
                      x.id === q.id ? { ...x, body: s } : x,
                    ),
                  },
                }),
              10000,
            )}
            <p className="field-hint">{q.reason}</p>
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  payload: {
                    ...value.payload,
                    questions: value.payload.questions.filter(
                      (x) => x.id !== q.id,
                    ),
                  },
                })
              }
            >
              删除问题 {i + 1}
            </Button>
          </div>
        ))}
      </div>
    );
  if (value.kind === "create_revision")
    return (
      <>
        {area("规格正文", value.payload.content, (s) =>
          onChange({ ...value, payload: { ...value.payload, content: s } }),
        )}
        {area(
          "验收标准（每行一项）",
          value.payload.acceptanceCriteria.join("\n"),
          (s) =>
            onChange({
              ...value,
              payload: { ...value.payload, acceptanceCriteria: s.split("\n") },
            }),
          80000,
        )}
      </>
    );
  return (
    <>
      {area("商业范围", value.payload.scopeSummary ?? "", (s) =>
        onChange({
          ...value,
          payload: { ...value.payload, scopeSummary: s || null },
        }),
      )}
      {area(
        "商业验收标准（每行一项）",
        value.payload.acceptanceCriteria?.join("\n") ?? "",
        (s) =>
          onChange({
            ...value,
            payload: {
              ...value.payload,
              acceptanceCriteria: s ? s.split("\n") : null,
            },
          }),
        80000,
      )}
      <label>
        估算工时（未确认可留空）
        <input
          disabled={disabled}
          value={value.payload.estimateHours ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              payload: {
                ...value.payload,
                estimateHours: e.target.value || null,
              },
            })
          }
        />
      </label>
      <label>
        成本变化（最小货币单位）
        <input
          type="number"
          step="1"
          disabled={disabled}
          value={value.payload.costDeltaMinor ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              payload: {
                ...value.payload,
                costDeltaMinor:
                  e.target.value === "" ? null : Number(e.target.value),
              },
            })
          }
        />
      </label>
      <label>
        币种（如 CNY）
        <input
          maxLength={3}
          disabled={disabled}
          value={value.payload.currency ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              payload: { ...value.payload, currency: e.target.value || null },
            })
          }
        />
      </label>
      <label>
        工期变化（天）
        <input
          type="number"
          step="1"
          disabled={disabled}
          value={value.payload.scheduleDeltaDays ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              payload: {
                ...value.payload,
                scheduleDeltaDays:
                  e.target.value === "" ? null : Number(e.target.value),
              },
            })
          }
        />
      </label>
    </>
  );
}
