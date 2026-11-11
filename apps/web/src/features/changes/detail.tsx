"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/shared/async-state";
import { useCurrentProject } from "@/features/projects/project-detail";
import { EmptyState, Pagination, QueryState } from "@/features/projects/shared";
import { requirementPath } from "@/features/requirements/queries";
import { offsetValue, PersonTime } from "@/features/requirements/shared";
import { ApiError } from "@/lib/api/client";
import {
  capabilityReason,
  changePath,
  statusLabel,
  useChange,
  useFrozenVersion,
} from "./queries";
import {
  ApprovalHistory,
  CommercialFacts,
  FrozenContent,
  versionOutcome,
} from "./shared";
import { DeliveryEntry } from "@/features/deliveries/create";
import { ChangeConfirmation, DraftEditor, type Selection } from "./editor";

export function ChangeDetail() {
  const { changeId } = useParams<{ changeId: string }>();
  return <Detail key={changeId} id={changeId} />;
}
function Detail({ id }: { id: string }) {
  const project = useCurrentProject();
  const params = useSearchParams();
  const router = useRouter();
  const offset = offsetValue(params.get("versionOffset"));
  const query = useChange(project.id, id, offset);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [saved, setSaved] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const change = query.data?.data;
  if (
    !change ||
    (query.error instanceof ApiError &&
      [401, 403, 404].includes(query.error.status))
  )
    return <QueryState query={query} />;
  const available = !query.isFetching && !query.error;
  const base = changePath(project.id, id);
  const supplier = project.projectRole !== "CLIENT";
  const active = change.activeVersion;
  const draft = "draft" in change ? change.draft : undefined;
  const canDecide =
    project.projectRole === "OWNER"
      ? "vendorDecision"
      : project.projectRole === "CLIENT"
        ? "clientDecision"
        : null;
  const open = (
    target: HTMLButtonElement,
    kind: Selection["kind"],
    decision?: Selection["decision"],
  ) => {
    opener.current = target;
    setSaved(false);
    setSelection({ kind, decision, snapshot: change });
  };
  const editorProps = selection
    ? {
        selection,
        current: change,
        available,
        onCancel: () => setSelection(null),
        onDone: () => {
          setSelection(null);
          setSaved(true);
        },
      }
    : null;
  return (
    <>
      <Link className="text-link" href={`/app/projects/${project.id}/changes`}>
        ← 变更与审批
      </Link>
      <div className="page-heading heading-actions requirement-heading">
        <div>
          <p className="eyebrow">CHANGE REQUEST / {id.slice(0, 8)}</p>
          <h2>变更评估与审批</h2>
          <p>
            <span className="status-badge" data-state={change.status}>
              {statusLabel[change.status]}
            </span>{" "}
            · 锁版本 {change.lockVersion}
          </p>
          <Link
            className="text-link"
            href={requirementPath(project.id, change.requirementId)}
          >
            关联需求 →
          </Link>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          ref={refreshButton}
          onClick={() => void query.refetch()}
        >
          刷新变更
        </Button>
      </div>
      {query.error && <ErrorNotice error={query.error} />}
      {saved && (
        <p className="notice success" role="status">
          操作已完成，当前变更与审批历史已更新。
        </p>
      )}
      {change.status === "APPROVED" && (
        <p className="notice success">
          双方已批准同一冻结版本，此变更已终结。新增范围须创建新的需求 Revision
          和新的变更。
        </p>
      )}
      {change.status === "REJECTED" && (
        <p className="notice">
          本轮审批已拒绝。旧版本与意见保持只读；供应方可重开评估，重新提交后双方须重新审批。
        </p>
      )}
      <DeliveryEntry change={change} available={available} />
      <div className="requirement-detail-grid">
        <div className="stack-panels">
          {draft && change.status === "DRAFT" && (
            <section className="surface-panel" aria-label="已保存商业草稿">
              <div className="section-heading">
                <h3>已保存的商业草稿</h3>
                <span className="status-badge">仅供应方</span>
              </div>
              <p className="muted-copy">
                保存与正式提交分开。以下为服务器已保存的评估。
              </p>
              <CommercialFacts value={draft} />
              <h4>范围说明</h4>
              <p className="record-text">
                {draft.scopeSummary ?? "尚未填写范围"}
              </p>
              <h4>商业验收标准</h4>
              {draft.acceptanceCriteria?.length ? (
                <ol className="criteria-list">
                  {draft.acceptanceCriteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ol>
              ) : (
                <p className="muted-copy">尚无验收标准</p>
              )}
              <Link
                className="text-link"
                href={`${requirementPath(project.id, change.requirementId)}/revisions/${draft.requirementRevisionId}`}
              >
                核对已选需求规格 →
              </Link>
            </section>
          )}
          {editorProps &&
            selection?.kind === "editDraft" &&
            "draft" in selection.snapshot && (
              <DraftEditor {...editorProps} draft={selection.snapshot.draft} />
            )}
          {active ? (
            <>
              {change.status === "DRAFT" && (
                <p className="notice">
                  上一轮 v{active.versionNo} ·
                  以下为历史冻结内容，当前草稿尚未重新提交。
                </p>
              )}
              <FrozenContent version={active} projectId={project.id} />
            </>
          ) : (
            <section className="surface-panel">
              <h3>尚无冻结版本</h3>
              <p className="muted-copy">
                {supplier
                  ? "完整保存评估并正式提交后，生成双方可见的不可变版本。"
                  : "供应方正在准备评估；正式提交后才能查看商业内容。"}
              </p>
            </section>
          )}
        </div>
        <aside className="stack-panels">
          <section
            className="surface-panel guidance-panel"
            aria-label="当前审批步骤"
          >
            <p className="panel-kicker">APPROVAL / 顺序确认</p>
            <h3>{statusLabel[change.status]}</h3>
            {active && (
              <>
                <p className="record-meta">
                  {change.status === "DRAFT" ? "上一轮" : "本轮"} v
                  {active.versionNo} · {versionOutcome(active)}
                </p>
                <ApprovalHistory version={active} />
              </>
            )}
            {supplier && change.status === "DRAFT" && (
              <>
                <Button
                  disabled={
                    !available ||
                    !!selection ||
                    !change.capabilities.editDraft.allowed
                  }
                  onClick={(event) => open(event.currentTarget, "editDraft")}
                >
                  编辑商业草稿
                </Button>
                {!change.capabilities.editDraft.allowed && (
                  <p className="notice">
                    {capabilityReason(change.capabilities.editDraft)}
                  </p>
                )}
                <Button
                  variant="outline"
                  disabled={
                    !available ||
                    !!selection ||
                    !change.capabilities.submit.allowed
                  }
                  onClick={(event) => open(event.currentTarget, "submit")}
                >
                  正式提交审批
                </Button>
                {!change.capabilities.submit.allowed && (
                  <p className="field-hint">
                    {capabilityReason(change.capabilities.submit)}
                  </p>
                )}
              </>
            )}
            {supplier && change.status === "REJECTED" && (
              <>
                <Button
                  disabled={
                    !available ||
                    !!selection ||
                    !change.capabilities.reopen.allowed
                  }
                  onClick={(event) => open(event.currentTarget, "reopen")}
                >
                  重开评估
                </Button>
                {!change.capabilities.reopen.allowed && (
                  <p className="notice">
                    {capabilityReason(change.capabilities.reopen)}
                  </p>
                )}
              </>
            )}
            {canDecide && change.capabilities[canDecide].allowed && (
              <>
                <Button
                  disabled={!available || !!selection}
                  onClick={(event) =>
                    open(event.currentTarget, canDecide, "APPROVED")
                  }
                >
                  批准此版本
                </Button>
                <Button
                  variant="outline"
                  disabled={!available || !!selection}
                  onClick={(event) =>
                    open(event.currentTarget, canDecide, "REJECTED")
                  }
                >
                  拒绝此版本
                </Button>
                <p className="field-hint">
                  决定前需再次核对版本。评论对双方可见。
                </p>
              </>
            )}
            {change.status === "SUBMITTED" &&
              project.projectRole !== "OWNER" && (
                <p className="field-hint">
                  等待供应方负责人审批；客户目前不能做决定。
                </p>
              )}
            {change.status === "VENDOR_APPROVED" &&
              project.projectRole !== "CLIENT" && (
                <p className="field-hint">
                  负责人已批准，等待项目客户确认同一版本。
                </p>
              )}
          </section>
          <section className="surface-panel" aria-label="冻结版本历史">
            <h3>冻结版本历史</h3>
            <p className="muted-copy">按版本倒序 · 决定归属各自版本</p>
            {!change.versions.length && (
              <EmptyState>尚无正式提交历史</EmptyState>
            )}
            <ol className="revision-history">
              {change.versions.map((version) => (
                <li key={version.id}>
                  <Link
                    className="text-link"
                    href={`${base}/versions/${version.id}`}
                  >
                    冻结版本 v{version.versionNo}
                  </Link>
                  <p className="record-meta">{versionOutcome(version)}</p>
                  <PersonTime
                    userId={version.submittedBy}
                    time={version.submittedAt}
                  />
                </li>
              ))}
            </ol>
            <Pagination
              offset={offset}
              hasMore={query.data!.meta.hasMore}
              pending={query.isFetching || !!selection}
              onChange={(start) =>
                router.push(
                  `${base}${start ? `?versionOffset=${start}` : ""}`,
                  { scroll: false },
                )
              }
            />
          </section>
        </aside>
      </div>
      {editorProps && selection?.kind !== "editDraft" && (
        <ChangeConfirmation
          {...editorProps}
          finalFocus={() =>
            opener.current?.isConnected ? opener.current : refreshButton.current
          }
        />
      )}
    </>
  );
}

export function FrozenVersionDetail() {
  const project = useCurrentProject();
  const { changeId, versionId } = useParams<{
    changeId: string;
    versionId: string;
  }>();
  const query = useFrozenVersion(project.id, changeId, versionId);
  return (
    <>
      <div className="section-heading">
        <Link className="text-link" href={changePath(project.id, changeId)}>
          ← 当前变更与全部版本
        </Link>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          刷新历史
        </Button>
      </div>
      <QueryState query={query} />
      {query.data && !query.error && (
        <>
          <div className="page-heading">
            <p className="eyebrow">IMMUTABLE CHANGE VERSION</p>
            <h2>冻结版本 v{query.data.versionNo}</h2>
            <p>历史只读 · {versionOutcome(query.data)}；本页不能执行审批。</p>
          </div>
          <div className="requirement-detail-grid">
            <div className="stack-panels">
              <FrozenContent version={query.data} projectId={project.id} />
            </div>
            <aside className="surface-panel">
              <h3>此版本的审批记录</h3>
              <ApprovalHistory version={query.data} />
            </aside>
          </div>
        </>
      )}
    </>
  );
}
