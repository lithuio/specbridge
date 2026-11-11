"use client";

import { useQuery } from "@tanstack/react-query";
import { pageSize, useProjectApi } from "@/features/projects/queries";
import { ApiError } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

export type Change = components["schemas"]["ChangeDetail"];
export type FrozenVersion = components["schemas"]["FrozenVersion"];
export type Draft = components["schemas"]["ChangeDraft"]["draft"];
export type ChangeStatus = Change["status"];
export const statusLabel: Record<ChangeStatus, string> = {
  DRAFT: "评估草稿",
  SUBMITTED: "待负责人审批",
  VENDOR_APPROVED: "待客户审批",
  APPROVED: "双方已批准",
  REJECTED: "已拒绝",
};
export const changePath = (projectId: string, id: string) =>
  `/app/projects/${projectId}/changes/${id}`;

export function useChanges(
  projectId: string,
  offset: number,
  status?: ChangeStatus,
  requirementId?: string,
) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key(
      "changes",
      projectId,
      status,
      requirementId,
      offset,
      pageSize,
    ),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/projects/{id}/change-requests", {
        path: { id: projectId },
        query: { status, requirementId, offset, limit: pageSize },
        signal,
      }),
  });
}
export function useChange(projectId: string, id: string, offset = 0) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("change", projectId, id, offset, pageSize),
    queryFn: async ({ signal }) => {
      const result = await api("get", "/api/v1/change-requests/{id}", {
        path: { id },
        query: { offset, limit: pageSize },
        signal,
      });
      if (result.data.projectId !== projectId)
        throw new ApiError(404, "NOT_FOUND");
      return result;
    },
  });
}
export function useFrozenVersion(
  projectId: string,
  id: string,
  versionId: string,
) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("change-version", projectId, id, versionId),
    queryFn: async ({ signal }) => {
      const { data } = await api(
        "get",
        "/api/v1/change-requests/{id}/versions/{versionId}",
        {
          path: { id, versionId },
          signal,
        },
      );
      if (data.projectId !== projectId || data.changeRequestId !== id)
        throw new ApiError(404, "NOT_FOUND");
      return data;
    },
  });
}

export function capabilityReason(capability: Change["capabilities"]["submit"]) {
  if (capability.allowed) return null;
  const reasons: Record<string, string> = {
    ROLE_FORBIDDEN: "当前身份无权执行此操作。",
    INVALID_TRANSITION: "当前阶段不允许此操作。",
    CLIENT_REQUIRED: "请由负责人先绑定唯一客户。",
    ROLE_CONFLICT: "项目成员身份冲突，请核对成员配置。",
    REVISION_NOT_READY: "请明确选择最新已就绪的需求版本后保存。",
    ASSESSMENT_INCOMPLETE:
      "请先完整保存范围、工时、费用、币种、工期和非空验收标准。",
    ALREADY_REVIEWED: "这一审批步骤已有决定，请查看历史。",
    VERSION_EXHAUSTED: "版本编号已达上限。",
    BUSINESS_RULE_VIOLATION:
      "当前评估不满足提交条件，请核对需求版本与商业字段。",
  };
  return reasons[capability.reasonCode] ?? "当前条件不满足操作要求。";
}

export function useRefreshChange(change: Change) {
  const { queryClient, key } = useProjectApi();
  return () =>
    Promise.all(
      [
        ["change", change.projectId, change.id],
        ["change-version", change.projectId, change.id],
        ["changes", change.projectId],
        ["requirement", change.projectId, change.requirementId],
        ["project", change.projectId],
      ].map((parts) =>
        queryClient.invalidateQueries({ queryKey: key(...parts) }),
      ),
    );
}
