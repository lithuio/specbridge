"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  useProjectApi,
  useProjects,
  pageSize,
  roleLabel,
} from "@/features/projects/queries";
import { WorkspacePicker } from "@/features/projects/workspace-picker";
import { QueryState, Pagination, EmptyState } from "@/features/projects/shared";
import { offsetValue } from "@/features/requirements/shared";
import type { components } from "@/lib/api/generated/schema";

type Item = components["schemas"]["Dashboard"]["items"][number];
const bucketLabel = {
  mine: "待我处理",
  waiting: "等待他人",
  completed: "已完成交付",
};
const typeLabel: Record<Item["type"], string> = {
  BIND_CLIENT: "绑定项目客户",
  CLARIFY_REQUIREMENT: "回答澄清问题 · 项目协作待办",
  PREPARE_REVISION: "整理需求规格",
  MARK_READY: "确认需求就绪",
  PREPARE_ASSESSMENT: "准备商业评估",
  COMPLETE_ASSESSMENT: "完善商业评估",
  REVISE_ASSESSMENT: "修订被拒绝的评估",
  VENDOR_APPROVAL: "供应方负责人审批",
  CLIENT_APPROVAL: "客户确认版本",
  SUBMIT_DELIVERY: "提交交付",
  REVISE_DELIVERY: "修改后重新交付",
  REVIEW_DELIVERY: "客户验收交付",
  ACCEPTED_DELIVERY: "交付已验收",
};
function itemPath(item: Item) {
  const base = `/app/projects/${item.projectId}`;
  switch (item.action) {
    case "OPEN_PROJECT":
      return `${base}/members`;
    case "OPEN_REQUIREMENT":
      return `${base}/requirements/${item.entityId}`;
    case "OPEN_CHANGE":
      return `${base}/changes/${item.entityId}`;
    case "OPEN_DELIVERY":
      return `${base}/deliveries/${item.entityId}`;
  }
}
export function Dashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const workspaceId = params.get("workspaceId") ?? "";
  const projectId = params.get("projectId") ?? "";
  const bucket =
    params.get("bucket") === "waiting"
      ? "waiting"
      : params.get("bucket") === "completed"
        ? "completed"
        : "mine";
  const offset = offsetValue(params.get("offset"));
  const projectOffset = offsetValue(params.get("projectOffset"));
  const projects = useProjects(workspaceId, projectOffset);
  const { api, key } = useProjectApi();
  const query = useQuery({
    queryKey: key(
      "dashboard",
      workspaceId,
      projectId,
      bucket,
      offset,
      pageSize,
    ),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/dashboard", {
        query: {
          workspaceId: workspaceId || undefined,
          projectId: projectId || undefined,
          bucket,
          offset,
          limit: pageSize,
        },
        signal,
      }),
  });
  function navigate(values: Record<string, string>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(values)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`/app${p.size ? `?${p}` : ""}`, { scroll: false });
  }
  const data = query.data?.data;
  return (
    <div className="dashboard-content">
      <section className="surface-panel scope-panel" aria-label="概览范围">
        <WorkspacePicker
          value={workspaceId}
          onChange={(id) =>
            navigate({
              workspaceId: id,
              projectId: "",
              offset: "",
              projectOffset: "",
            })
          }
        />
        {projectId && (
          <div>
            <p className="muted-copy">
              当前项目：
              {projects.data?.data.find((p) => p.id === projectId)?.name ??
                projectId.slice(0, 8)}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate({ projectId: "", offset: "" })}
            >
              查看范围内全部项目
            </Button>
          </div>
        )}
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
            void projects.refetch();
          }}
        >
          刷新工作概览
        </Button>
      </section>
      <QueryState query={query} />
      {data && !query.error && (
        <>
          <dl className="metric-strip" aria-label="真实工作统计">
            <div>
              <dt>参与项目</dt>
              <dd data-testid="project-count">{data.summary.projectCount}</dd>
            </div>
            {Object.entries(bucketLabel).map(([b, label]) => (
              <div key={b}>
                <dt>{label}</dt>
                <dd data-testid={`count-${b}`}>
                  {data.summary.buckets[b as keyof typeof bucketLabel]}
                </dd>
              </div>
            ))}
          </dl>
          <div className="dashboard-grid">
            <section className="surface-panel" aria-label="工作事项">
              <div className="section-heading">
                <h2>推进中的协作</h2>
                <span className="guide-label">按项目角色可处理</span>
              </div>
              <p className="muted-copy">
                事项来自当前业务状态；澄清问题由项目成员协作处理。
              </p>
              <nav className="project-nav" aria-label="待办分类">
                {Object.entries(bucketLabel).map(([b, label]) => (
                  <Button
                    key={b}
                    variant={bucket === b ? "default" : "ghost"}
                    aria-pressed={bucket === b}
                    onClick={() => navigate({ bucket: b, offset: "" })}
                  >
                    {label} ·{" "}
                    {data.summary.buckets[b as keyof typeof bucketLabel]}
                  </Button>
                ))}
              </nav>
              {data.items.length ? (
                <ul className="work-items">
                  {data.items.map((item) => (
                    <li key={item.key}>
                      <div>
                        <p className="panel-kicker">{typeLabel[item.type]}</p>
                        <Link className="text-link" href={itemPath(item)}>
                          {item.title}
                        </Link>
                        <p className="record-meta">
                          {item.projectName} · {roleLabel[item.projectRole]}
                          {item.versionNo !== null
                            ? ` · v${item.versionNo}`
                            : ""}
                          {item.deliveryNo !== null
                            ? ` / D${item.deliveryNo}`
                            : ""}
                        </p>
                        <time
                          className="record-meta"
                          dateTime={item.occurredAt}
                        >
                          {new Date(item.occurredAt).toLocaleString("zh-CN")}
                        </time>
                      </div>
                      <Link
                        className="text-link"
                        href={itemPath(item)}
                        aria-label={`查看：${item.title}`}
                      >
                        查看 →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>当前范围暂无{bucketLabel[bucket]}事项。</EmptyState>
              )}
              <Pagination
                offset={offset}
                hasMore={query.data!.meta.hasMore}
                pending={query.isFetching}
                onChange={(n) => navigate({ offset: String(n) })}
              />
              <p className="record-meta">
                统计时间{" "}
                <time dateTime={query.data!.meta.asOf}>
                  {new Date(query.data!.meta.asOf).toLocaleString("zh-CN")}
                </time>{" "}
                · 统计涵盖所选范围全部记录
              </p>
            </section>
            <aside className="surface-panel" aria-label="状态分布">
              <h2>状态分布</h2>
              <h3>需求</h3>
              <dl className="facts-list">
                <dt>草稿 / 澄清中 / 就绪</dt>
                <dd>
                  {data.summary.requirementCounts.DRAFT} /{" "}
                  {data.summary.requirementCounts.CLARIFYING} /{" "}
                  {data.summary.requirementCounts.READY}
                </dd>
              </dl>
              <h3>变更与审批</h3>
              <dl className="facts-list">
                <dt>草稿</dt>
                <dd>{data.summary.changeCounts.DRAFT}</dd>
                <dt>待负责人 / 待客户</dt>
                <dd>
                  {data.summary.changeCounts.SUBMITTED} /{" "}
                  {data.summary.changeCounts.VENDOR_APPROVED}
                </dd>
                <dt>双方批准 / 已拒绝</dt>
                <dd>
                  {data.summary.changeCounts.APPROVED} /{" "}
                  {data.summary.changeCounts.REJECTED}
                </dd>
              </dl>
              <h3>交付记录</h3>
              <dl className="facts-list">
                <dt>待验收</dt>
                <dd>{data.summary.deliveryCounts.SUBMITTED}</dd>
                <dt>已退回</dt>
                <dd>{data.summary.deliveryCounts.CHANGES_REQUESTED}</dd>
                <dt>已验收</dt>
                <dd>{data.summary.deliveryCounts.ACCEPTED}</dd>
              </dl>
              <p className="field-hint">
                退回历史计入记录数；已完成仅统计已验收交付。
              </p>
            </aside>
          </div>
        </>
      )}
      <section className="surface-panel" aria-label="概览项目列表">
        <div className="section-heading">
          <h2>我的项目</h2>
          <Link className="text-link" href="/app/projects">
            管理与查看全部项目 →
          </Link>
        </div>
        <QueryState query={projects} />
        {projects.data && !projects.error && (
          <>
            {projects.data.data.length ? (
              <ul className="work-items">
                {projects.data.data.map((p) => (
                  <li key={p.id}>
                    <div>
                      <Link
                        className="text-link"
                        href={`/app/projects/${p.id}`}
                      >
                        {p.name}
                      </Link>
                      <p className="record-meta">
                        {roleLabel[p.projectRole]} ·{" "}
                        {p.status === "ACTIVE" ? "进行中" : "已归档"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate({ projectId: p.id, offset: "" })}
                    >
                      查看此项目统计
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>当前范围没有可见项目。</EmptyState>
            )}
            <Pagination
              offset={projectOffset}
              hasMore={projects.data.meta.hasMore}
              pending={projects.isFetching}
              onChange={(n) => navigate({ projectOffset: String(n) })}
            />
          </>
        )}
      </section>
    </div>
  );
}
