"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrentProject } from "@/features/projects/project-detail";
import { EmptyState, Pagination, QueryState } from "@/features/projects/shared";
import { offsetValue, PersonTime } from "@/features/requirements/shared";
import {
  deliveryPath,
  statusLabel,
  useDeliveries,
  type Delivery,
} from "./queries";

export function DeliveryList() {
  const project = useCurrentProject();
  const params = useSearchParams();
  const router = useRouter();
  const offset = offsetValue(params.get("offset"));
  const raw = params.get("status");
  const status =
    raw && Object.hasOwn(statusLabel, raw)
      ? (raw as Delivery["status"])
      : undefined;
  const changeId = params.get("changeRequestId") || undefined;
  const query = useDeliveries(project.id, offset, status, changeId);
  const navigate = (start: number, filter = status ?? "") => {
    const p = new URLSearchParams();
    if (start) p.set("offset", String(start));
    if (filter) p.set("status", filter);
    if (changeId) p.set("changeRequestId", changeId);
    router.push(`/app/projects/${project.id}/deliveries?${p}`, {
      scroll: false,
    });
  };
  return (
    <>
      <div className="page-heading heading-actions">
        <div>
          <p className="eyebrow">DELIVERY / HISTORY</p>
          <h2>项目交付</h2>
          <p>每次交付独立留档，始终关联双方批准的规格。</p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          刷新交付列表
        </Button>
      </div>
      <div className="change-filters">
        <label htmlFor="delivery-status">交付状态</label>
        <select
          id="delivery-status"
          className="form-control"
          value={status ?? ""}
          onChange={(e) => navigate(0, e.target.value)}
        >
          <option value="">全部状态</option>
          {Object.entries(statusLabel).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        {changeId && (
          <Link
            className="text-link"
            href={`/app/projects/${project.id}/deliveries`}
          >
            清除变更筛选
          </Link>
        )}
        <Link
          className="text-link"
          href={`/app/projects/${project.id}/changes?status=APPROVED`}
        >
          从已批准变更提交交付 →
        </Link>
      </div>
      <QueryState query={query} />
      {query.data && !query.error && (
        <>
          <div className="stack-panels">
            {query.data.data.length ? (
              query.data.data.map((d) => (
                <article className="surface-panel" key={d.id}>
                  <div className="section-heading">
                    <Link
                      className="text-link"
                      href={deliveryPath(project.id, d.id)}
                    >
                      {d.requirementTitle} · v{d.versionNo} / D{d.deliveryNo}
                    </Link>
                    <span className="status-badge" data-state={d.status}>
                      {statusLabel[d.status]}
                    </span>
                  </div>
                  <p className="record-meta">
                    CR {d.changeRequestId.slice(0, 8)}
                  </p>
                  <PersonTime userId={d.createdBy} time={d.createdAt} />
                </article>
              ))
            ) : (
              <EmptyState>当前筛选下没有交付记录。</EmptyState>
            )}
          </div>
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
