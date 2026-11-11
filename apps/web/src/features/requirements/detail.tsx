"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/shared/async-state";
import { useCurrentProject } from "@/features/projects/project-detail";
import { EmptyState, Pagination, QueryState } from "@/features/projects/shared";
import { ApiError } from "@/lib/api/client";
import {
  capabilityReason,
  requirementPath,
  statusLabel,
  useRequirement,
  useRevision,
  useRevisionHistory,
  type Requirement,
} from "./queries";
import { offsetValue, PersonTime, RevisionContent } from "./shared";
import { RequirementEditor, type Selection } from "./editor";
import { CreateChange } from "@/features/changes/list-create";

export function RequirementDetail() {
  const { requirementId } = useParams<{ requirementId: string }>();
  return <Detail key={requirementId} id={requirementId} />;
}
function Detail({ id }: { id: string }) {
  const project = useCurrentProject();
  const query = useRequirement(project.id, id);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [saved, setSaved] = useState(false);
  const r = query.data;
  // Keep unsaved inputs through transient read failures, but remove private UI on lost access.
  if (
    !r ||
    (query.error instanceof ApiError &&
      [401, 403, 404].includes(query.error.status))
  )
    return <QueryState query={query} />;
  const base = requirementPath(project.id, id);
  const questions = r.clarifications.filter((q) => q.kind === "QUESTION");
  const unanswered = questions.filter(
    (q) =>
      !r.clarifications.some((a) => a.kind === "ANSWER" && a.parentId === q.id),
  ).length;
  const supplier = project.projectRole !== "CLIENT";
  const available = !query.isFetching && !query.error;
  function open(kind: Selection["kind"], parentId?: string) {
    setSaved(false);
    setSelection({ kind, snapshot: r!, parentId });
  }
  return (
    <>
      <Link
        className="text-link"
        href={`/app/projects/${project.id}/requirements`}
      >
        ← 项目需求
      </Link>
      <div className="page-heading heading-actions requirement-heading">
        <div>
          <p className="eyebrow">REQUIREMENT / {r.id.slice(0, 8)}</p>
          <h2>{r.title}</h2>
          <p>
            <span className="status-badge" data-state={r.status}>
              {statusLabel[r.status]}
            </span>{" "}
            · 编辑版本 {r.draftVersion}
          </p>
        </div>
        <RefreshButton
          label="刷新需求"
          busy={query.isFetching}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        />
      </div>
      {query.error && <ErrorNotice error={query.error} />}
      {saved && (
        <p className="notice success" role="status">
          已保存，当前需求已更新。
        </p>
      )}
      <div className="requirement-detail-grid">
        <div className="stack-panels">
          <section className="surface-panel" aria-label="需求原文">
            <div className="section-heading">
              <h3>需求原文</h3>
              {r.capabilities.editDraft.allowed && (
                <Button
                  variant="outline"
                  disabled={!!selection || !available}
                  onClick={() => open("draft")}
                >
                  编辑草稿
                </Button>
              )}
            </div>
            <PersonTime userId={r.createdBy} time={r.createdAt} />
            <div className="record-text">{r.originalText}</div>
            <p className="field-hint">原文仅在草稿阶段由作者或负责人编辑。</p>
          </section>
          <section className="surface-panel" aria-label="澄清问答">
            <div className="section-heading">
              <h3>
                澄清问答{" "}
                <span className="record-meta">
                  {questions.length} 个问题 · {unanswered} 个待回答
                </span>
              </h3>
              {r.capabilities.askQuestion.allowed && (
                <Button
                  variant="outline"
                  disabled={!!selection || !available}
                  onClick={() => open("question")}
                >
                  提出问题
                </Button>
              )}
            </div>
            {!questions.length && (
              <p className="muted-copy">
                暂无问题。需要补充范围、边界或验收方式时，在这里发起澄清。
              </p>
            )}
            <div className="clarification-list">
              {questions.map((question, i) => {
                const answers = r.clarifications.filter(
                  (a) => a.kind === "ANSWER" && a.parentId === question.id,
                );
                return (
                  <article className="clarification" key={question.id}>
                    <div className="section-heading">
                      <h4>问题 {i + 1}</h4>
                      <span
                        className="status-badge"
                        data-state={answers.length ? "READY" : "CLARIFYING"}
                      >
                        {answers.length ? "已回答" : "待回答"}
                      </span>
                    </div>
                    <PersonTime
                      userId={question.authorId}
                      time={question.createdAt}
                    />
                    <p className="record-text">{question.body}</p>
                    {answers.map((answer) => (
                      <div className="clarification-answer" key={answer.id}>
                        <span className="panel-kicker">回答</span>
                        <p className="record-text">{answer.body}</p>
                        <PersonTime
                          userId={answer.authorId}
                          time={answer.createdAt}
                        />
                      </div>
                    ))}
                    {r.capabilities.answerQuestion.allowed && (
                      <Button
                        variant="outline"
                        disabled={!!selection || !available}
                        onClick={() => open("answer", question.id)}
                        aria-label={`回答问题 ${i + 1}`}
                      >
                        {answers.length ? "追加回答" : "回答问题"}
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
            {r.status === "READY" && (
              <p className="notice">
                需求已就绪，问答已关闭。后续澄清须由供应方先创建新 Revision。
              </p>
            )}
          </section>
          <section className="surface-panel" aria-label="最新规格">
            <div className="section-heading">
              <h3>
                {r.latestRevision
                  ? `最新规格 · Revision ${r.latestRevision.revisionNo}`
                  : "尚无规格版本"}
              </h3>
              {r.latestRevision && (
                <Link
                  className="text-link"
                  href={`${base}/revisions/${r.latestRevision.id}`}
                >
                  只读详情 →
                </Link>
              )}
            </div>
            {r.latestRevision ? (
              <RevisionContent revision={r.latestRevision} />
            ) : (
              <p className="muted-copy">
                由供应方将澄清结论与验收标准整理为不可变版本。
              </p>
            )}
          </section>
        </div>
        <aside className="stack-panels">
          <section
            className="surface-panel guidance-panel"
            aria-label="就绪检查"
          >
            <p className="panel-kicker">NEXT STEP</p>
            <h3>{r.status === "READY" ? "规格已就绪" : "确认需求规格"}</h3>
            <dl className="facts-list">
              <dt>最新规格</dt>
              <dd>
                {r.latestRevision
                  ? `Revision ${r.latestRevision.revisionNo}`
                  : "尚未创建"}
              </dd>
              <dt>未答问题</dt>
              <dd>{unanswered}</dd>
              <dt>验收标准</dt>
              <dd>{r.latestRevision?.acceptanceCriteria.length ?? 0} 条</dd>
            </dl>
            {supplier ? (
              <>
                <Button
                  disabled={
                    !available ||
                    !!selection ||
                    !r.capabilities.createRevision.allowed
                  }
                  onClick={() => open("revision")}
                >
                  创建新 Revision
                </Button>
                {!r.capabilities.createRevision.allowed && (
                  <p className="notice">
                    {capabilityReason(r.capabilities.createRevision)}
                  </p>
                )}
                {r.status !== "READY" && (
                  <>
                    <Button
                      variant="outline"
                      disabled={
                        !available ||
                        !!selection ||
                        !r.capabilities.markReady.allowed
                      }
                      onClick={() => open("ready")}
                    >
                      标记就绪
                    </Button>
                    {!r.capabilities.markReady.allowed && (
                      <p className="field-hint">
                        {capabilityReason(r.capabilities.markReady)}
                      </p>
                    )}
                  </>
                )}
              </>
            ) : (
              <p>
                规格版本由供应方整理并标记就绪；你可以查看历史、提出问题和回答澄清。
              </p>
            )}
            {r.status === "READY" && (
              <p className="field-hint">
                就绪确认不代表商业批准；后续评估与审批须另行完成。
              </p>
            )}
          </section>
          {supplier ? (
            <CreateChange requirement={r} available={available && !selection} />
          ) : (
            <Link
              className="text-link"
              href={`/app/projects/${project.id}/changes?requirementId=${r.id}`}
            >
              查看此需求的变更 →
            </Link>
          )}
          <RevisionHistory requirement={r} />
        </aside>
      </div>
      {selection && (
        <RequirementEditor
          key={`${selection.kind}:${selection.parentId ?? ""}`}
          selection={selection}
          current={r}
          available={available}
          refresh={() => query.refetch()}
          onCancel={() => setSelection(null)}
          onDone={() => {
            setSelection(null);
            setSaved(true);
          }}
        />
      )}
    </>
  );
}

function RevisionHistory({ requirement }: { requirement: Requirement }) {
  const params = useSearchParams();
  const router = useRouter();
  const offset = offsetValue(params.get("revisionOffset"));
  const query = useRevisionHistory(
    requirement.projectId,
    requirement.id,
    offset,
  );
  const base = requirementPath(requirement.projectId, requirement.id);
  return (
    <section className="surface-panel" aria-label="版本历史">
      <h3>版本历史</h3>
      <p className="muted-copy">按版本倒序 · 保存后不可修改</p>
      <QueryState query={query} />
      {query.data && !query.error && (
        <>
          {!query.data.data.length && <EmptyState>尚无 Revision</EmptyState>}
          <ol className="revision-history">
            {query.data.data.map((revision) => (
              <li key={revision.id}>
                <Link
                  className="text-link"
                  href={`${base}/revisions/${revision.id}`}
                >
                  Revision {revision.revisionNo}
                  {revision.id === requirement.latestRevisionId
                    ? " · 最新"
                    : ""}
                </Link>
                <PersonTime
                  userId={revision.createdBy}
                  time={revision.createdAt}
                />
              </li>
            ))}
          </ol>
          <Pagination
            offset={offset}
            hasMore={query.data.meta.hasMore}
            pending={query.isFetching}
            onChange={(start) =>
              router.push(`${base}${start ? `?revisionOffset=${start}` : ""}`, {
                scroll: false,
              })
            }
          />
        </>
      )}
    </section>
  );
}

export function RevisionDetail() {
  const project = useCurrentProject();
  const { requirementId, revisionId } = useParams<{
    requirementId: string;
    revisionId: string;
  }>();
  const query = useRevision(project.id, requirementId, revisionId);
  return (
    <>
      <Link
        className="text-link"
        href={requirementPath(project.id, requirementId)}
      >
        ← 当前需求与全部版本
      </Link>
      <QueryState query={query} />
      {query.data && !query.error && (
        <div className="narrow-page">
          <div className="page-heading">
            <p className="eyebrow">IMMUTABLE REVISION</p>
            <h2>Revision {query.data.revisionNo}</h2>
            <p>历史规格 · 只读快照，不随后续问答或修订改变。</p>
          </div>
          <section className="surface-panel" aria-label="历史规格">
            <RevisionContent revision={query.data} />
          </section>
        </div>
      )}
    </>
  );
}
