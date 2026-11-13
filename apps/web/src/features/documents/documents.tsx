"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  LockKeyhole,
  Users,
  FileCheck2,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { RefreshButton } from "@/components/shared/refresh-button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentProject } from "@/features/projects/project-detail";
import { useProjectApi } from "@/features/projects/queries";
import { ApiError, errorMessage, type ApiResult } from "@/lib/api/client";

type Listing = ApiResult<
  "/api/v1/projects/{projectId}/documents",
  "get"
>["data"];
type Item = Listing["items"][number];
type Internal = Extract<Item, { versions: unknown }>;
const errors: Record<string, string> = {
  UNSUPPORTED_FILE: "不支持此文件内容，请使用文本 PDF、DOCX、Markdown 或 TXT。",
  INVALID_FILE: "文件损坏或内容与格式不符，请检查原件。",
  NO_TEXT: "未找到可提取文字，扫描件暂不支持 OCR。",
  PARSE_LIMIT: "内容或解压结果超出解析限制，请精简文件。",
  PARSE_TIMEOUT: "解析超时，请精简文件后重试。",
  PARSE_FAILED: "文件处理失败，请稍后重试。",
  INTERRUPTED: "上次解析中断，请重新上传。",
};
function useDocuments() {
  const p = useCurrentProject();
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("documents", p.id),
    queryFn: async ({ signal }) =>
      (
        await api("get", "/api/v1/projects/{projectId}/documents", {
          path: { projectId: p.id },
          signal,
        })
      ).data,
    refetchInterval: (q) =>
      q.state.data?.items.some(
        (i) =>
          "versions" in i && i.versions.some((v) => v.status === "PROCESSING"),
      )
        ? 5000
        : false,
  });
}

export function DocumentUpload({
  replacement,
  onDone,
}: {
  replacement?: Internal;
  onDone?: () => void;
}) {
  const project = useCurrentProject();
  const fileLabelId = useId();
  const { api, queryClient, key } = useProjectApi();
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [unknown, setUnknown] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>();
  const active = useRef<AbortController | null>(null),
    alive = useRef(false),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (active.current) {
        setUnknown(true);
        active.current.abort();
        active.current = null;
        setBusy(false);
      }
    };
  }, []);
  const replacementId = replacement?.id;
  useEffect(() => {
    if (replacementId) {
      input.current?.scrollIntoView({ block: "center", behavior: "instant" });
      input.current?.focus({ preventScroll: true });
    }
  }, [replacementId]);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: key("documents", project.id) });
  async function send() {
    if (!file || busy || unknown) return;
    if (
      file.size < 1 ||
      file.size > 10 * 1024 * 1024 ||
      !/\.(pdf|docx|md|txt)$/i.test(file.name)
    ) {
      setMessage("请选择不超过 10 MiB 的 PDF、DOCX、MD 或 TXT 文件。");
      return;
    }
    setBusy(true);
    setError(undefined);
    setMessage("");
    const controller = new AbortController();
    active.current = controller;
    const form = new FormData();
    form.set("file", file);
    if (replacement) {
      form.set("documentId", replacement.id);
      form.set("expectedVersion", String(replacement.version));
    }
    try {
      const { data } = await api(
        "post",
        "/api/v1/projects/{projectId}/documents",
        {
          path: { projectId: project.id },
          body: form,
          signal: controller.signal,
        },
      );
      if (!alive.current || active.current !== controller) return;
      setMessage(
        data.status === "READY"
          ? "上传完成。默认仅内部可见；共享须由负责人确认。"
          : errors[data.errorCode ?? "PARSE_FAILED"],
      );
      if (data.status === "READY") {
        setFile(null);
        if (input.current) input.current.value = "";
        onDone?.();
      }
      await refresh();
    } catch (e) {
      if (alive.current && active.current === controller) {
        setError(e);
        if (!(e instanceof ApiError) || e.status >= 500) setUnknown(true);
        await refresh();
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (alive.current) setBusy(false);
      }
    }
  }
  async function check() {
    setBusy(true);
    try {
      await api("get", "/api/v1/projects/{projectId}/documents", {
        path: { projectId: project.id },
      });
      await refresh();
      setUnknown(false);
      setError(undefined);
      setMessage(
        "已刷新列表。请先核对文件与版本；如已有上传结果，无需重复上传。",
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (project.projectRole === "CLIENT" || project.status !== "ACTIVE")
    return null;
  return (
    <section
      className="document-upload"
      aria-label={replacement ? "上传替换版本" : "上传背景文件"}
    >
      <h3 className="feature-title">
        <Upload aria-hidden="true" />
        {replacement ? `替换：${replacement.title}` : "添加项目背景（可选）"}
      </h3>
      <p className="muted-copy">
        文件先保存在项目中。AI
        会按当前权限选取少量相关文字发送给模型；资料中的内容不代表已批准范围。对客澄清和规格只使用已共享版本。
      </p>
      <label className="form-field document-file-picker">
        <span id={fileLabelId}>背景文件</span>
        <span className="document-file-control">
          <span className="file-picker-caption" aria-hidden="true">
            <span>
              <Upload />
              选择文件
            </span>
            <span>{file ? file.name : "PDF、DOCX、Markdown 或 TXT"}</span>
          </span>
          <input
            ref={input}
            aria-labelledby={fileLabelId}
            type="file"
            accept=".pdf,.docx,.md,.txt"
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setMessage("");
            }}
          />
        </span>
      </label>
      <p className="field-hint">
        文本 PDF、DOCX、MD/TXT；单个 10 MiB，项目最多 20 份 / 100
        MiB（含历史原件）。不支持扫描件、图片或旧 DOC。
      </p>
      {file && (
        <p className="file-selection">
          <FileCheck2 aria-hidden="true" />
          <span>
            {file.name} · {(file.size / 1024).toFixed(1)} KiB
          </span>
        </p>
      )}
      {replacement && (
        <p className="notice">
          替换不会自动共享新版本，原共享版本保持可读，直至负责人更改或撤回。
        </p>
      )}
      {!!error && (
        <p role="alert" className="notice">
          {errorMessage(error)}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {unknown && (
        <p role="alert" className="notice">
          上传结果未知，所选文件已保留。请刷新列表核对，避免重复上传。
        </p>
      )}
      <div className="form-actions">
        <Button disabled={busy || unknown || !file} onClick={() => void send()}>
          <Upload aria-hidden="true" />
          {busy
            ? "正在上传并解析…"
            : replacement
              ? "上传新版本"
              : "上传背景文件"}
        </Button>
        {unknown && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void check()}
          >
            刷新列表并核对
          </Button>
        )}
      </div>
    </section>
  );
}

export function DocumentsPage() {
  const project = useCurrentProject();
  const { api, queryClient, key } = useProjectApi();
  const query = useDocuments();
  const [feedback, setFeedback] = useState("");
  const [replace, setReplace] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    doc: Internal;
    patch: { status?: "ACTIVE" | "INACTIVE"; sharedVersionId?: string | null };
    label: string;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const [uncertain, setUncertain] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      if (active.current) {
        active.current.abort();
        active.current = null;
        setBusy(false);
        setUncertain(true);
      }
    },
    [],
  );
  async function confirm() {
    if (!pending || busy || uncertain) return;
    setBusy(true);
    setError(undefined);
    const controller = new AbortController();
    active.current = controller;
    try {
      await api("put", "/api/v1/projects/{projectId}/documents/{documentId}", {
        path: { projectId: project.id, documentId: pending.doc.id },
        body: { expectedVersion: pending.doc.version, ...pending.patch },
        signal: controller.signal,
      });
      if (active.current !== controller) return;
      setFeedback(`${pending.doc.title}：${pending.label}，已保存。`);
      setPending(null);
      await queryClient.invalidateQueries({
        queryKey: key("documents", project.id),
      });
    } catch (e) {
      if (active.current === controller) {
        setError(e);
        setUncertain(true);
      }
    } finally {
      if (active.current === controller) {
        setBusy(false);
        active.current = null;
      }
    }
  }
  const replacement = query.data?.items.find(
    (i): i is Internal => i.id === replace && "versions" in i,
  );
  return (
    <div className="stack-panels document-page">
      <section className="surface-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PROJECT BACKGROUND</p>
            <h2 className="feature-title">
              <Layers aria-hidden="true" />
              项目背景资料
            </h2>
          </div>
          <RefreshButton
            label="刷新资料"
            busy={query.isFetching}
            onClick={() => void query.refetch()}
          />
        </div>
        <p className="muted-copy">
          背景资料辅助理解项目，不替代正式规格或客户批准。文件解析失败不影响手动业务流程。
        </p>
        <DocumentUpload
          key={replacement?.id ?? "new"}
          replacement={replacement}
          onDone={() => {
            if (replacement)
              setFeedback(
                `${replacement.title}：新版本已上传，请核对共享范围。`,
              );
            setReplace(null);
          }}
        />
        {replace && (
          <Button variant="outline" onClick={() => setReplace(null)}>
            取消替换
          </Button>
        )}
      </section>
      {feedback && (
        <p className="operation-feedback" role="status">
          <CheckCircle2 aria-hidden="true" />
          {feedback}
        </p>
      )}
      {query.isPending && <p role="status">正在读取资料…</p>}
      {query.error && (
        <p role="alert" className="notice">
          {errorMessage(query.error)}
        </p>
      )}
      {!query.error && query.data?.items.length === 0 && (
        <div className="feature-empty">
          <FileText aria-hidden="true" />
          <p>暂无当前账号可读取的背景资料。</p>
          <span>补充项目背景，让讨论与需求有据可循。</span>
        </div>
      )}
      {!query.error &&
        query.data?.items.map((doc) => (
          <article
            className="surface-panel document-card"
            key={doc.id}
            aria-label={doc.title}
          >
            <div className="document-card-heading">
              <span className="feature-icon">
                <FileText aria-hidden="true" />
              </span>
              <h3>{doc.title}</h3>
            </div>
            {"sharedVersion" in doc ? (
              <>
                <p className="visibility-label">
                  <Users aria-hidden="true" />
                  负责人共享版本 · v{doc.sharedVersion.versionNo}
                </p>
                <VersionLink
                  projectId={project.id}
                  documentId={doc.id}
                  versionId={doc.sharedVersion.id}
                >
                  查看共享文字
                </VersionLink>
              </>
            ) : (
              <>
                <p className="visibility-label">
                  {doc.sharedVersionId ? (
                    <Users aria-hidden="true" />
                  ) : (
                    <LockKeyhole aria-hidden="true" />
                  )}
                  {doc.status === "ACTIVE" ? "使用中" : "已停用"} · 资料版本{" "}
                  {doc.version} ·{" "}
                  {doc.sharedVersionId ? "已明确共享一个版本" : "仅内部可见"}
                </p>
                {doc.historyTruncated && (
                  <p className="field-hint">
                    仅显示最近 50 次上传及当前 /
                    共享版本。旧来源链接仍可验证访问。
                  </p>
                )}
                {doc.versions.map((v) => (
                  <div
                    className="document-version"
                    data-status={v.status}
                    key={v.id}
                  >
                    <p>
                      v{v.versionNo} · {v.originalName} ·{" "}
                      {v.status === "READY"
                        ? "解析完成"
                        : v.status === "PROCESSING"
                          ? "正在解析"
                          : "解析失败"}
                      {v.id === doc.sharedVersionId ? " · 当前共享" : ""}
                      {v.id === doc.currentVersionId ? " · 当前内部版本" : ""}
                    </p>
                    {v.errorCode && <p role="status">{errors[v.errorCode]}</p>}
                    {v.status === "PROCESSING" && (
                      <p className="field-hint">
                        刷新查看结果。如进程中断，等待两分钟后重新上传会清理旧任务。
                      </p>
                    )}
                    {v.status === "READY" && doc.status === "ACTIVE" && (
                      <div className="form-actions">
                        <VersionLink
                          projectId={project.id}
                          documentId={doc.id}
                          versionId={v.id}
                        >
                          查看 v{v.versionNo} 文字
                        </VersionLink>
                        {project.projectRole === "OWNER" &&
                          query.data?.writable &&
                          v.id !== doc.sharedVersionId && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setUncertain(false);
                                setError(undefined);
                                setPending({
                                  doc,
                                  patch: { sharedVersionId: v.id },
                                  label: `将 v${v.versionNo} 共享给客户`,
                                });
                              }}
                            >
                              共享 v{v.versionNo}
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                ))}
                {query.data?.writable && (
                  <div className="form-actions">
                    {doc.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        onClick={() => setReplace(doc.id)}
                      >
                        上传替换版本
                      </Button>
                    )}
                    {project.projectRole === "OWNER" && (
                      <>
                        {doc.sharedVersionId && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setUncertain(false);
                              setPending({
                                doc,
                                patch: { sharedVersionId: null },
                                label: "撤回客户共享",
                              });
                            }}
                          >
                            撤回共享
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setUncertain(false);
                            setPending({
                              doc,
                              patch: {
                                status:
                                  doc.status === "ACTIVE"
                                    ? "INACTIVE"
                                    : "ACTIVE",
                              },
                              label:
                                doc.status === "ACTIVE"
                                  ? "停用此资料并撤回共享"
                                  : "重新启用，仅内部可见",
                            });
                          }}
                        >
                          {doc.status === "ACTIVE" ? "停用资料" : "重新启用"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPending(null);
            void query.refetch();
          }
        }}
      >
        {pending && (
          <DialogContent className="feature-dialog" showCloseButton={false}>
            <section
              className="document-confirm"
              role="region"
              aria-label="确认背景资料操作"
            >
              <span className="feature-icon">
                <Users aria-hidden="true" />
              </span>
              <DialogTitle>{pending.label}</DialogTitle>
              <DialogDescription>
                请核对目标资料：{pending.doc.title}。共享后客户及对客 AI
                可读取该版本；撤回或停用只影响后续访问，无法收回已读内容。
              </DialogDescription>
              {!!error && <p role="alert">{errorMessage(error)}</p>}
              {uncertain && (
                <p className="notice">
                  请刷新资料并重新选择操作，核对最新状态后再确认。
                </p>
              )}
              <div className="form-actions">
                <Button
                  disabled={busy || uncertain}
                  onClick={() => void confirm()}
                >
                  {busy ? "正在保存…" : "确认操作"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setPending(null);
                    void query.refetch();
                  }}
                >
                  取消并刷新
                </Button>
              </div>
            </section>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
function VersionLink({
  projectId,
  documentId,
  versionId,
  children,
}: {
  projectId: string;
  documentId: string;
  versionId: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="text-link"
      href={`/app/projects/${projectId}/documents/${documentId}/versions/${versionId}`}
    >
      {children}
    </Link>
  );
}
export function DocumentVersionPage() {
  const { projectId, documentId, versionId } = useParams<{
    projectId: string;
    documentId: string;
    versionId: string;
  }>();
  const { api, key } = useProjectApi();
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: key("document-text", projectId, documentId, versionId, offset),
    queryFn: async ({ signal }) =>
      (
        await api(
          "get",
          "/api/v1/projects/{projectId}/documents/{documentId}/versions/{versionId}",
          {
            path: { projectId, documentId, versionId },
            query: { offset, limit: 20 },
            signal,
          },
        )
      ).data,
  });
  return (
    <section className="surface-panel document-text">
      <Link className="text-link" href={`/app/projects/${projectId}/documents`}>
        ← 项目背景资料
      </Link>
      <h2>背景文字与来源</h2>
      <p className="muted-copy">
        只展示提取文字，不执行文档内容。该资料不是已批准规格；每次读取均检查当前授权。
      </p>
      {query.isPending && <p role="status">正在读取文字…</p>}
      {query.error && <p role="alert">{errorMessage(query.error)}</p>}
      {!query.error && query.data && (
        <>
          <h3>
            {query.data.version.originalName} · v{query.data.version.versionNo}
          </h3>
          {query.data.chunks.map((c) => (
            <section key={c.id} className="document-excerpt">
              <h4>
                {c.locatorKind === "page" ? "页" : "段"} {c.locatorStart}
                {c.locatorEnd !== c.locatorStart ? `–${c.locatorEnd}` : ""}
              </h4>
              <p className="scope-content">{c.content}</p>
            </section>
          ))}
          <div className="form-actions">
            <Button
              variant="outline"
              disabled={offset === 0 || query.isFetching}
              onClick={() => setOffset((n) => Math.max(0, n - 20))}
            >
              上一组文字
            </Button>
            <Button
              variant="outline"
              disabled={!query.data.hasMore || query.isFetching}
              onClick={() => setOffset((n) => n + 20)}
            >
              下一组文字
            </Button>
            <Button variant="outline" onClick={() => void query.refetch()}>
              重新验证访问
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
