"use client";

import { useQuery } from "@tanstack/react-query";
import { useProjectApi, pageSize } from "@/features/projects/queries";
import { ApiError } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

export type Requirement = components["schemas"]["RequirementDetail"];
export type Revision = components["schemas"]["Revision"];
export type Capability = Requirement["capabilities"]["editDraft"];
export const statusLabel = {
  DRAFT: "草稿",
  CLARIFYING: "澄清中",
  READY: "已就绪",
};
export const requirementPath = (projectId: string, id: string) =>
  `/app/projects/${projectId}/requirements/${id}`;

export function useRequirements(projectId: string, offset: number) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("requirements", projectId, offset, pageSize),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/projects/{id}/requirements", {
        path: { id: projectId },
        query: { limit: pageSize, offset },
        signal,
      }),
  });
}

export function useRequirement(projectId: string, id: string) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("requirement", projectId, id),
    queryFn: async ({ signal }) => {
      const { data } = await api("get", "/api/v1/requirements/{id}", {
        path: { id },
        signal,
      });
      // Both IDs may be accessible individually. Never render a mismatched parent URL.
      if (data.projectId !== projectId) throw new ApiError(404, "NOT_FOUND");
      return data;
    },
  });
}

export function useRevisionHistory(
  projectId: string,
  id: string,
  offset: number,
) {
  const { api, key } = useProjectApi();
  // Mounted only after the requirement's real project has been checked.
  return useQuery({
    queryKey: key("revisions", projectId, id, offset, pageSize),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/requirements/{id}/revisions", {
        path: { id },
        query: { limit: pageSize, offset },
        signal,
      }),
  });
}

export function useRevision(projectId: string, id: string, revisionId: string) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("revision", projectId, id, revisionId),
    queryFn: async ({ signal }) => {
      const { data } = await api(
        "get",
        "/api/v1/requirements/{id}/revisions/{revisionId}",
        {
          path: { id, revisionId },
          signal,
        },
      );
      if (data.projectId !== projectId || data.requirementId !== id)
        throw new ApiError(404, "NOT_FOUND");
      return data;
    },
  });
}

export function capabilityReason(capability: Capability): string | null {
  if (capability.allowed) return null;
  const reasons: Record<string, string> = {
    ROLE_FORBIDDEN: "当前身份无权执行此操作。",
    INVALID_TRANSITION: "当前状态不允许此操作。",
    REVIEW_IN_PROGRESS: "此需求有审批中的变更，审批结束前不能创建新 Revision。",
    VERSION_EXHAUSTED: "版本编号已达上限，不能继续写入。",
    REVISION_NOT_READY: "请先创建包含非空正文与验收标准的 Revision。",
    UNANSWERED_QUESTIONS: "还有未回答的问题，请先完成澄清。",
  };
  return reasons[capability.reasonCode] ?? "当前条件不满足操作要求。";
}

export function uncertain(error: unknown) {
  return !!error && (!(error instanceof ApiError) || error.status >= 500);
}
