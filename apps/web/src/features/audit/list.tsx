"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useProjectApi, pageSize } from "@/features/projects/queries";
import { useCurrentProject } from "@/features/projects/project-detail";
import { QueryState, Pagination, EmptyState } from "@/features/projects/shared";
import { offsetValue } from "@/features/requirements/shared";
import type { components } from "@/lib/api/generated/schema";

type Event = components["schemas"]["AuditEvent"];
const labels: Record<Event["eventType"], string> = {
  "project.created": "创建项目",
  "project.developer_added": "分配开发成员",
  "project.client_bound": "绑定客户",
  "project.client_replaced": "更正客户",
  "requirement.created": "创建需求",
  "requirement.draft_updated": "编辑需求草稿",
  "clarification.question_added": "提出澄清问题",
  "clarification.answer_added": "回答澄清问题",
  "requirement.revision_created": "创建规格版本",
  "requirement.marked_ready": "标记需求就绪",
  "change_request.created": "创建商业草稿",
  "change_request.draft_updated": "编辑商业草稿",
  "change_request.reopened": "重开商业草稿",
  "change_request.submitted": "正式提交变更",
  "change_request.vendor_decided": "供应方审批",
  "change_request.client_decided": "客户审批",
  "delivery.submitted": "提交交付",
  "delivery.reviewed": "客户验收决定",
};
const decisions = {
  APPROVED: "批准",
  REJECTED: "拒绝",
  ACCEPTED: "接受",
  CHANGES_REQUESTED: "退回修改",
};
function targetPath(event: Event) {
  const t = event.target;
  if (!t || t.projectId !== event.projectId) return null;
  const base = `/app/projects/${t.projectId}`;
  switch (t.kind) {
    case "project":
      return base;
    case "requirement":
      return `${base}/requirements/${t.requirementId}`;
    case "revision":
      return `${base}/requirements/${t.requirementId}/revisions/${t.revisionId}`;
    case "change":
      return `${base}/changes/${t.changeRequestId}${t.versionId ? `/versions/${t.versionId}` : ""}`;
    case "delivery":
      return `${base}/deliveries/${t.deliveryId}`;
  }
}
function entityVersion(event: Event) {
  if (event.entityVersion === null) return null;
  switch (event.entityType) {
    case "delivery":
      return `交付 D${event.entityVersion}`;
    case "requirement_revision":
      return `Revision ${event.entityVersion}`;
    case "change_request":
      return `变更锁版本 ${event.entityVersion}`;
    case "requirement":
    case "clarification":
      return `需求草稿版本 ${event.entityVersion}`;
    default:
      return null;
  }
}
export function AuditList() {
  const project = useCurrentProject();
  const params = useSearchParams();
  const router = useRouter();
  const offset = offsetValue(params.get("offset"));
  const raw = params.get("eventType");
  const eventType =
    raw && Object.hasOwn(labels, raw) ? (raw as Event["eventType"]) : undefined;
  const { api, key } = useProjectApi();
  const query = useQuery({
    queryKey: key("audit", project.id, eventType, offset, pageSize),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/projects/{id}/audit-events", {
        path: { id: project.id },
        query: { eventType, offset, limit: pageSize },
        signal,
      }),
  });
  const navigate = (start: number, type = eventType ?? "") => {
    const p = new URLSearchParams();
    if (start) p.set("offset", String(start));
    if (type) p.set("eventType", type);
    router.push(`/app/projects/${project.id}/audit?${p}`, { scroll: false });
  };
  // This only trims filter options; the API performs event/metadata authorization before pagination.
  const options = Object.entries(labels).filter(
    ([type]) =>
      project.projectRole !== "CLIENT" ||
      (!type.startsWith("project.") &&
        ![
          "change_request.created",
          "change_request.draft_updated",
          "change_request.reopened",
        ].includes(type)),
  );
  return (
    <>
      <div className="page-heading heading-actions">
        <div>
          <p className="eyebrow">ACTIVITY / AUDIT</p>
          <h2>项目活动记录</h2>
          <p>按你的项目权限显示操作人、动作与版本，可返回原始记录核对。</p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          刷新活动记录
        </Button>
      </div>
      <div className="change-filters">
        <label htmlFor="audit-event">活动类型</label>
        <select
          id="audit-event"
          className="form-control"
          value={eventType ?? ""}
          onChange={(e) => navigate(0, e.target.value)}
        >
          <option value="">全部可见活动</option>
          {eventType && !options.some(([type]) => type === eventType) && (
            <option value={eventType}>当前类型筛选</option>
          )}
          {options.map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <QueryState query={query} />
      {query.data && !query.error && (
        <>
          <section className="surface-panel">
            {query.data.data.length ? (
              <ol className="audit-timeline">
                {query.data.data.map((event) => {
                  const href = targetPath(event);
                  return (
                    <li key={event.id}>
                      <div className="section-heading">
                        <h3>
                          {labels[event.eventType]}
                          {event.metadata.decision
                            ? ` · ${decisions[event.metadata.decision]}`
                            : ""}
                        </h3>
                        {href && (
                          <Link className="text-link" href={href}>
                            查看记录 →
                          </Link>
                        )}
                      </div>
                      <p className="record-meta">
                        {event.actor?.displayName ?? "未知操作人"} ·{" "}
                        <time dateTime={event.createdAt}>
                          {new Date(event.createdAt).toLocaleString("zh-CN")}
                        </time>
                      </p>
                      <p className="record-meta">
                        {entityVersion(event)}
                        {event.metadata.versionNo !== undefined
                          ? ` · 正式版本 v${event.metadata.versionNo}`
                          : ""}{" "}
                        · 对象 {event.entityId.slice(0, 8)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState>当前筛选下没有可见活动。</EmptyState>
            )}
          </section>
          <Pagination
            offset={offset}
            hasMore={query.data.meta.hasMore}
            pending={query.isFetching}
            onChange={(n) => navigate(n)}
          />
        </>
      )}
    </>
  );
}
