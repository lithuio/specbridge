"use client";

import { useQuery } from "@tanstack/react-query";
import { pageSize, useProjectApi } from "@/features/projects/queries";
import { ApiError } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

export type Delivery = components["schemas"]["Delivery"];
export type DeliveryDetail = components["schemas"]["DeliveryDetail"];
export const deliveryPath = (projectId: string, id: string) =>
  `/app/projects/${projectId}/deliveries/${id}`;
export const statusLabel: Record<Delivery["status"], string> = {
  SUBMITTED: "待客户验收",
  CHANGES_REQUESTED: "已退回修改",
  ACCEPTED: "已验收",
};
export function useDeliveries(
  projectId: string,
  offset: number,
  status?: Delivery["status"],
  changeRequestId?: string,
) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key(
      "deliveries",
      projectId,
      changeRequestId,
      status,
      offset,
      pageSize,
    ),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/projects/{id}/deliveries", {
        path: { id: projectId },
        query: { offset, limit: pageSize, status, changeRequestId },
        signal,
      }),
  });
}
export function useDelivery(projectId: string, id: string) {
  const { api, key } = useProjectApi();
  return useQuery({
    queryKey: key("delivery", projectId, id),
    queryFn: async ({ signal }) => {
      const { data } = await api("get", "/api/v1/deliveries/{id}", {
        path: { id },
        signal,
      });
      if (data.projectId !== projectId) throw new ApiError(404, "NOT_FOUND");
      return data;
    },
  });
}
export function useRefreshDelivery(projectId: string, changeId: string) {
  const { queryClient, key } = useProjectApi();
  return () =>
    Promise.all(
      [
        ["delivery", projectId],
        ["deliveries", projectId],
        ["change", projectId, changeId],
        ["dashboard"],
        ["audit", projectId],
      ].map((parts) =>
        queryClient.invalidateQueries({ queryKey: key(...parts) }),
      ),
    );
}
