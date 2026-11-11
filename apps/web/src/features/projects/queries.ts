"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/provider";
import { privateKey } from "@/lib/query/keys";
import type { components } from "@/lib/api/generated/schema";

export type Project = components["schemas"]["ProjectDetail"];
export const roleLabel = {
  OWNER: "负责人",
  DEVELOPER: "开发成员",
  CLIENT: "客户",
};
export const pageSize = 12;

export function useProjectApi() {
  const { runtime, user } = useSession();
  return {
    ...runtime,
    key: (...scope: readonly unknown[]) =>
      privateKey(runtime.epoch, user!.id, ...scope),
  };
}

export function useWorkspaces() {
  const { api, key } = useProjectApi();
  return useInfiniteQuery({
    queryKey: key("workspaces"),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api("get", "/api/v1/workspaces", {
        query: { limit: 50, offset: pageParam },
        signal,
      }),
    getNextPageParam: (last) =>
      last.meta.hasMore ? last.meta.offset + last.meta.limit : undefined,
  });
}

export function useProjects(workspaceId: string, offset: number) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("projects", workspaceId, offset, pageSize),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/projects", {
        query: {
          workspaceId: workspaceId || undefined,
          limit: pageSize,
          offset,
        },
        signal,
      }),
  });
}

export function useProject(projectId: string) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("project", projectId),
    queryFn: async ({ signal }) =>
      (
        await api("get", "/api/v1/projects/{id}", {
          path: { id: projectId },
          signal,
        })
      ).data,
  });
}

export function useMembers(workspaceId: string, offset: number) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("workspace-members", workspaceId, offset, pageSize),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/workspaces/{id}/members", {
        path: { id: workspaceId },
        query: { limit: pageSize, offset },
        signal,
      }),
    enabled: !!workspaceId,
  });
}
