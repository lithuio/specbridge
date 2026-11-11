"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/shared/async-state";
import { useCurrentProject } from "@/features/projects/project-detail";
import { useProjectApi } from "@/features/projects/queries";
import { EmptyState, Pagination, QueryState } from "@/features/projects/shared";
import { uncertain, type Requirement } from "@/features/requirements/queries";
import { offsetValue } from "@/features/requirements/shared";
import {
  capabilityReason,
  changePath,
  statusLabel,
  useChanges,
  type ChangeStatus,
} from "./queries";

export function ChangeList() {
  const project = useCurrentProject();
  const params = useSearchParams();
  const router = useRouter();
  const offset = offsetValue(params.get("offset"));
  const rawStatus = params.get("status") ?? "";
  const status = Object.hasOwn(statusLabel, rawStatus)
    ? (rawStatus as ChangeStatus)
    : undefined;
  const requirementId = params.get("requirementId") || undefined;
  const query = useChanges(project.id, offset, status, requirementId);
  const base = `/app/projects/${project.id}/changes`;
  function navigate(start: number, filter = status ?? "") {
    const next = new URLSearchParams();
    if (start) next.set("offset", String(start));
    if (filter) next.set("status", filter);
    if (requirementId) next.set("requirementId", requirementId);
    router.push(`${base}${next.size ? `?${next}` : ""}`);
  }
  return (
    <>
      <div className="page-heading heading-actions">
        <div>
          <p className="eyebrow">CHANGES / 商业确认</p>
          <h2>变更与审批</h2>
          <p>从已就绪需求发起评估，负责人先审，再由客户确认同一冻结版本。</p>
        </div>
        {project.projectRole !== "CLIENT" && (
          <Link
            className="primary-link"
            href={`/app/projects/${project.id}/requirements`}
          >
            从需求发起评估
          </Link>
        )}
      </div>
      <div className="change-filters">
        <label htmlFor="change-status">审批状态</label>
        <select
          id="change-status"
          className="form-control"
          value={status ?? ""}
          onChange={(e) => navigate(0, e.target.value)}
        >
          <option value="">全部状态</option>
          {Object.entries(statusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {requirementId && (
          <Link className="text-link" href={base}>
            清除需求筛选
          </Link>
        )}
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          刷新列表
        </Button>
      </div>
      <QueryState query={query} />
      {query.data && !query.error && (
        <>
          {!query.data.data.length ? (
            <EmptyState>
              <h3>暂无符合条件的变更</h3>
              <p>需求就绪后，供应方可从需求详情创建商业评估。</p>
            </EmptyState>
          ) : (
            <div className="surface-panel requirement-list">
              {query.data.data.map((c) => (
                <Link
                  className="requirement-row"
                  key={c.id}
                  href={changePath(project.id, c.id)}
                >
                  <div>
                    <h3>{c.requirementTitle}</h3>
                    <p className="record-meta">
                      CR {c.id.slice(0, 8)} ·{" "}
                      {c.activeVersionNo
                        ? `${c.status === "DRAFT" ? "上一轮 " : "冻结版本 "}v${c.activeVersionNo}`
                        : "尚未正式提交"}
                    </p>
                  </div>
                  <span className="status-badge" data-state={c.status}>
                    {statusLabel[c.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Pagination
            offset={offset}
            hasMore={query.data.meta.hasMore}
            pending={query.isFetching}
            onChange={(start) => navigate(start)}
          />
        </>
      )}
    </>
  );
}

export function CreateChange({
  requirement,
  available,
}: {
  requirement: Requirement;
  available: boolean;
}) {
  const { api, queryClient, key } = useProjectApi();
  const router = useRouter();
  const resetAfterSuccess = useRef(false);
  const mutation = useMutation({
    retry: false,
    mutationFn: () =>
      api("post", "/api/v1/requirements/{id}/change-requests", {
        path: { id: requirement.id },
        body: {},
      }),
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: key("requirement", requirement.projectId, requirement.id),
      }),
    onSuccess: async ({ data }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key("dashboard") }),
        queryClient.invalidateQueries({
          queryKey: key("audit", requirement.projectId),
        }),
      ]);
      await queryClient.invalidateQueries({
        queryKey: key("changes", requirement.projectId),
      });
      resetAfterSuccess.current = true;
      router.push(changePath(requirement.projectId, data.id));
    },
  });
  const reset = mutation.reset;
  useLayoutEffect(
    () => () => {
      if (resetAfterSuccess.current) {
        resetAfterSuccess.current = false;
        reset();
      }
    },
    [reset],
  );
  const disabled =
    !available ||
    !requirement.capabilities.createChangeRequest.allowed ||
    mutation.isPending ||
    mutation.isSuccess ||
    uncertain(mutation.error);
  return (
    <section className="surface-panel guidance-panel" aria-label="商业评估入口">
      <h3>商业评估</h3>
      <p>
        新建供应方草稿，保存完整评估后再正式提交审批。同一需求可以有多份变更。
      </p>
      <Button
        disabled={disabled}
        onClick={() => {
          if (!disabled) mutation.mutate();
        }}
      >
        创建商业评估
      </Button>
      {!requirement.capabilities.createChangeRequest.allowed && (
        <p className="field-hint">
          {capabilityReason(requirement.capabilities.createChangeRequest)}
        </p>
      )}
      {mutation.error && <ErrorNotice error={mutation.error} />}
      {uncertain(mutation.error) && (
        <p className="notice">
          创建结果未知，请先查看变更列表核对；不会自动再次创建。
        </p>
      )}
      <Link
        className="text-link"
        href={`/app/projects/${requirement.projectId}/changes?requirementId=${requirement.id}`}
      >
        查看此需求的变更 →
      </Link>
    </section>
  );
}
