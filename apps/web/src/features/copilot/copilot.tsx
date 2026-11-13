"use client";

import Link from "next/link";
import { useProposalWorkspace } from "./proposals";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Sparkles,
  ArrowUp,
  ArrowRight,
  ListChecks,
  FileSearch,
  TriangleAlert,
  BookOpen,
  Trash2,
  LoaderCircle,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useSession } from "@/features/auth/provider";
import {
  useProjectApi,
  useProjects,
  pageSize,
  type Project,
} from "@/features/projects/queries";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  historyText,
  locationContext,
  readAnswer,
  type Answer,
  type PageContext,
} from "./contract";

export function ProjectCopilot() {
  const pathname = usePathname(),
    search = useSearchParams();
  const { runtime, user } = useSession();
  const context = locationContext(pathname, search.get("projectId"));
  // Scope state also resets when leaving a project's route. No browser persistence.
  return (
    <CopilotScope
      key={`${runtime.epoch}:${user!.id}:${context.projectId ?? "picker"}`}
      context={context}
    />
  );
}

function CopilotScope({
  context,
}: {
  context: ReturnType<typeof locationContext>;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const projectId = context.projectId ?? chosen;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="copilot-trigger"
            aria-label="打开项目 Copilot"
          />
        }
      >
        <MessageCircle aria-hidden="true" />
        <span>Copilot</span>
      </DialogTrigger>
      {projectId ? (
        <Conversation
          key={projectId}
          projectId={projectId}
          page={context.projectId ? context.page : { kind: "overview" }}
          label={context.projectId ? context.label : "项目概览"}
          open={open}
          onNavigate={() => setOpen(false)}
          onChoose={context.projectId ? undefined : () => setChosen(null)}
        />
      ) : (
        <CopilotDrawer>
          <ProjectPicker onChoose={setChosen} />
        </CopilotDrawer>
      )}
    </Dialog>
  );
}

function CopilotDrawer({ children }: { children: React.ReactNode }) {
  return (
    <DialogContent
      placement="drawer"
      className="copilot-drawer"
      showCloseButton={false}
    >
      <div className="copilot-heading">
        <div>
          <DialogTitle className="feature-title">
            <span className="copilot-mark">
              <Sparkles aria-hidden="true" />
            </span>
            项目 Copilot
          </DialogTitle>
          <DialogDescription>
            了解状态、核对阻塞点，规划下一步。
          </DialogDescription>
        </div>
        <DialogClose
          render={<Button variant="ghost" aria-label="关闭 Copilot" />}
        >
          <X />
        </DialogClose>
      </div>
      {children}
    </DialogContent>
  );
}
function ProjectPicker({ onChoose }: { onChoose: (id: string) => void }) {
  const [offset, setOffset] = useState(0);
  const query = useProjects("", offset);
  return (
    <div className="copilot-scroll">
      <h3>选择当前项目</h3>
      <p className="field-hint">Copilot 每次只读取一个已授权项目。</p>
      {query.isPending ? (
        <p role="status">正在读取项目…</p>
      ) : query.error ? (
        <p role="alert">{errorMessage(query.error)}</p>
      ) : (
        <>
          {!query.data.data.length && (
            <p>暂无可访问项目。创建项目或取得项目授权后即可开始。</p>
          )}
          <div className="copilot-projects">
            {query.data.data.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                onClick={() => onChoose(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <div className="copilot-actions">
            <Button
              variant="ghost"
              disabled={!offset}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
            >
              上一页
            </Button>
            <Button
              variant="ghost"
              disabled={!query.data.meta.hasMore}
              onClick={() => setOffset(offset + pageSize)}
            >
              下一页
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

type Turn = { question: string; answer: Answer };
function failureMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "TimeoutError")
    return "Copilot 等待超时，输入已保留。请稍后重试。";
  if (error instanceof ApiError) {
    if (error.status === 503)
      return "Copilot 暂时不可用或响应超时，输入已保留。请稍后重试。";
    if (error.status === 413)
      return "项目资料或对话过长。请清空对话，针对一个具体对象重新提问。";
    if (error.code === "INVALID_RESPONSE")
      return "Copilot 返回的内容或来源无法验证，输入已保留。请重试。";
    return errorMessage(error);
  }
  return "连接中断，输入已保留。请重试。";
}

function Conversation({
  projectId,
  page,
  label,
  open,
  onNavigate,
  onChoose,
}: {
  projectId: string;
  page: PageContext;
  label: string;
  open: boolean;
  onNavigate: () => void;
  onChoose?: () => void;
}) {
  const { api } = useProjectApi();
  const fieldId = useId();
  const [project, setProject] = useState<Project | null>(null);
  const [verified, setVerified] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [check, setCheck] = useState(0);
  const request = useRef<AbortController | null>(null);
  const role = useRef<string | null>(null);
  const pageKey = JSON.stringify(page);
  const tasks = useProposalWorkspace({
    projectId,
    project,
    open: open && verified,
    page,
    onNavigate,
  });
  // These states live outside the portalled drawer, so close/reopen keeps a conversation.
  // Activity, account/project change, close and page navigation abort pending work.
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setVerified(false);
      setPending(false);
      setFailure(null);
      if (!open) return;
      try {
        const response = await api("get", "/api/v1/projects/{id}", {
          path: { id: projectId },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (role.current && role.current !== response.data.projectRole) {
          setTurns([]);
          setDraft("");
        }
        role.current = response.data.projectRole;
        setProject(response.data);
        setDenied(false);
        setVerified(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (
          error instanceof ApiError &&
          [401, 403, 404].includes(error.status)
        ) {
          setTurns([]);
          setDraft("");
          setProject(null);
          setDenied(true);
        }
        setFailure(errorMessage(error));
      }
    };
    void load();
    return () => {
      controller.abort();
      request.current?.abort();
      request.current = null;
    };
  }, [api, projectId, open, pageKey, check]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!verified || pending || !question || question.length > 4000) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = AbortSignal.timeout(65_000);
    setPending(true);
    setFailure(null);
    try {
      const response = await api(
        "post",
        "/api/v1/projects/{id}/copilot/messages",
        {
          path: { id: projectId },
          body: {
            message: question,
            page,
            history: turns.slice(-10).map((t) => ({
              user: t.question,
              assistant: historyText(t.answer),
            })),
          },
          signal: AbortSignal.any([controller.signal, timeout]),
        },
      );
      const answer = readAnswer(response.data, projectId);
      if (!answer) throw new ApiError(502, "INVALID_RESPONSE");
      if (request.current !== controller || controller.signal.aborted) return;
      setTurns((current) => [...current.slice(-9), { question, answer }]);
      setDraft("");
    } catch (error) {
      if (request.current !== controller || controller.signal.aborted) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        setTurns([]);
        setDraft("");
        setVerified(false);
        setDenied(true);
        setProject(null);
      }
      setFailure(
        timeout.aborted
          ? "Copilot 等待超时，输入已保留。请稍后重试。"
          : failureMessage(error),
      );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }
  return (
    <CopilotDrawer>
      <div className="copilot-context">
        <strong>
          <FolderOpen aria-hidden="true" />
          {verified ? project?.name : "正在核验项目"}
        </strong>
        <span>当前页面：{label}</span>
        {onChoose && (
          <Button variant="ghost" onClick={onChoose}>
            切换项目
          </Button>
        )}
      </div>
      <div className="copilot-scroll" aria-busy={pending}>
        <p className="copilot-notice">
          AI 建议不是已批准的业务事实。请打开来源核实；审批与验收仍需人工操作。
        </p>
        {!verified && !failure && <p role="status">正在核验项目权限…</p>}
        {verified && tasks.view}
        {verified && !tasks.expanded && !turns.length && (
          <div className="copilot-empty">
            <span className="copilot-welcome-icon">
              <Sparkles aria-hidden="true" />
            </span>
            <p className="eyebrow">YOUR PROJECT, IN CONTEXT</p>
            <h3>从当前项目开始</h3>
            <p>一起理清现状，让下一步更明确。</p>
            <div className="copilot-suggestions" aria-label="提问建议">
              {[
                {
                  icon: FileSearch,
                  title: "了解项目现状",
                  text: "请总结当前项目状态，并附真实业务来源。",
                },
                {
                  icon: TriangleAlert,
                  title: "找出阻塞点",
                  text: "当前项目有哪些阻塞点和待澄清问题？请附来源。",
                },
                {
                  icon: ListChecks,
                  title: "梳理下一步",
                  text: "当前页面对应的业务下一步应该做什么？请区分事实和建议并附来源。",
                },
              ].map(({ icon: Icon, title, text }) => (
                <Button
                  key={title}
                  variant="outline"
                  onClick={() => {
                    setDraft(text);
                    document.getElementById(fieldId)?.focus();
                  }}
                >
                  <Icon aria-hidden="true" />
                  <span>{title}</span>
                  <ArrowRight aria-hidden="true" />
                </Button>
              ))}
            </div>
            <p className="field-hint">
              提问会将必要的已授权项目资料发送给
              DeepSeek。对话仅保存在当前页面内存中，刷新、切换项目或账号会清空；最多保留最近
              10 轮。
            </p>
          </div>
        )}
        {verified &&
          !tasks.expanded &&
          turns.map((t) => (
            <article className="copilot-turn" key={t.answer.conversationTurnId}>
              <div className="copilot-question">
                <strong>你</strong>
                <p>{t.question}</p>
              </div>
              <div className="copilot-answer">
                <strong className="copilot-author">
                  <Sparkles aria-hidden="true" />
                  Copilot <span>待核实建议</span>
                </strong>
                <div className="copilot-answer-text">
                  {t.answer.result.answer
                    .split(/\n\s*\n/)
                    .map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                </div>
                {!!t.answer.result.blockers.length && (
                  <section className="copilot-blockers">
                    <h4>
                      <TriangleAlert aria-hidden="true" />
                      可能的阻塞点
                    </h4>
                    <ul>
                      {t.answer.result.blockers.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {!!t.answer.result.nextSteps.length && (
                  <>
                    <h4 className="feature-title">
                      <ListChecks aria-hidden="true" />
                      建议下一步
                    </h4>
                    <ol className="copilot-steps">
                      {t.answer.result.nextSteps.map((s, i) => (
                        <li key={i}>
                          {s.text}{" "}
                          <span className="field-hint">
                            [{s.sourceIds.join(", ")}]
                          </span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                <h4 className="feature-title">
                  <BookOpen aria-hidden="true" />
                  本轮业务来源
                </h4>
                <ul className="copilot-sources">
                  {t.answer.sources.map((s) => (
                    <li key={s.key}>
                      <Link href={s.href} onClick={onNavigate}>
                        [{s.key}] {s.title} · {s.version}
                      </Link>
                      {s.type === "requirement" && (
                        <Button
                          variant="ghost"
                          onClick={() => tasks.openTarget(s.id)}
                        >
                          为此需求准备操作
                        </Button>
                      )}
                      <span>
                        读取于 {new Date(s.readAt).toLocaleString("zh-CN")}
                      </span>
                    </li>
                  ))}
                </ul>
                {(t.answer.context.truncated ||
                  t.answer.context.historyDropped > 0) && (
                  <p className="field-hint">
                    本轮部分资料或较早对话已裁剪，请打开来源查看完整内容。
                  </p>
                )}
              </div>
            </article>
          ))}
        {pending && (
          <p role="status" className="copilot-loading">
            <LoaderCircle aria-hidden="true" className="refresh-spinning" />
            正在读取已授权资料并整理回答…
          </p>
        )}
        {failure && (
          <p role="alert" className="form-error">
            {failure}
          </p>
        )}
        {!verified && failure && (
          <Button variant="outline" onClick={() => setCheck((v) => v + 1)}>
            {denied ? "重新核验权限" : "重试连接"}
          </Button>
        )}
      </div>
      {verified && !tasks.expanded && (
        <form className="copilot-composer" onSubmit={send}>
          <label htmlFor={fieldId}>询问当前项目</label>
          <textarea
            id={fieldId}
            rows={3}
            maxLength={4000}
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="描述你想了解的状态或问题…"
          />
          <div className="copilot-actions">
            <span className="field-hint">{draft.length} / 4000</span>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || !turns.length}
              onClick={() => {
                setTurns([]);
                setFailure(null);
              }}
            >
              <Trash2 aria-hidden="true" />
              清空对话
            </Button>
            <Button type="submit" disabled={pending || !draft.trim()}>
              {pending ? (
                <LoaderCircle aria-hidden="true" className="refresh-spinning" />
              ) : (
                <ArrowUp aria-hidden="true" />
              )}
              {pending ? "正在回答…" : failure ? "重试发送" : "发送"}
            </Button>
          </div>
        </form>
      )}
    </CopilotDrawer>
  );
}
