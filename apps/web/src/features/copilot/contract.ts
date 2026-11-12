import { z } from "zod";
import type { paths } from "@/lib/api/generated/schema";

type Input =
  paths["/api/v1/projects/{id}/copilot/messages"]["post"]["requestBody"]["content"]["application/json"];
export type PageContext = NonNullable<Input["page"]>;
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
export function locationContext(
  pathname: string,
  dashboardProject: string | null,
) {
  const segments = pathname.split("/").filter(Boolean);
  const id =
    segments[1] === "projects" && uuid.test(segments[2] ?? "")
      ? segments[2].toLowerCase()
      : pathname === "/app" && uuid.test(dashboardProject ?? "")
        ? dashboardProject!.toLowerCase()
        : null;
  let page: PageContext = {
    kind: pathname === "/app" ? "dashboard" : "overview",
  };
  let label = pathname === "/app" ? "工作概览" : "项目概览";
  const section = segments[3],
    resource = segments[4],
    version = segments[6];
  if (
    id &&
    ["requirements", "changes", "deliveries", "members", "audit"].includes(
      section,
    )
  ) {
    page = {
      kind: section as
        "requirements" | "changes" | "deliveries" | "members" | "audit",
    };
    label = {
      requirements: "需求",
      changes: "变更与审批",
      deliveries: "交付与验收",
      members: "项目成员",
      audit: "审计记录",
    }[section]!;
    if (uuid.test(resource ?? "")) {
      if (section === "requirements")
        page = {
          kind: "requirement",
          id: resource.toLowerCase(),
          ...(segments[5] === "revisions" && uuid.test(version ?? "")
            ? { revisionId: version.toLowerCase() }
            : {}),
        };
      if (section === "changes")
        page = {
          kind: "change",
          id: resource.toLowerCase(),
          ...(segments[5] === "versions" && uuid.test(version ?? "")
            ? { versionId: version.toLowerCase() }
            : {}),
        };
      if (section === "deliveries")
        page = { kind: "delivery", id: resource.toLowerCase() };
      label += uuid.test(version ?? "") ? " · 历史版本" : " · 详情";
    }
  }
  return { projectId: id, page, label };
}

const text = (max: number) => z.string().trim().min(1).max(max);
const refs = z
  .array(z.string().regex(/^S[1-9]\d{0,2}$/))
  .min(1)
  .max(12);
const responseSchema = z.object({
  conversationTurnId: z.uuid(),
  projectId: z.uuid(),
  result: z.object({
    answer: text(3000),
    blockers: z.array(text(500)).max(8),
    nextSteps: z.array(z.object({ text: text(500), sourceIds: refs })).max(8),
    sourceIds: refs,
  }),
  sources: z
    .array(
      z.object({
        key: z.string().regex(/^S[1-9]\d{0,2}$/),
        id: z.uuid(),
        projectId: z.uuid(),
        type: z.enum([
          "project",
          "requirement",
          "revision",
          "change_request",
          "change_version",
          "delivery",
        ]),
        title: text(200),
        version: text(100),
        href: text(500),
        readAt: z.iso.datetime(),
      }),
    )
    .min(1)
    .max(108),
  context: z.object({
    historyDropped: z.number().int().min(0).max(10),
    truncated: z.boolean(),
    toolCalls: z.number().int().min(1).max(4),
  }),
});
export type Answer = z.infer<typeof responseSchema>;
export function readAnswer(value: unknown, projectId: string): Answer | null {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success) return null;
  const data = parsed.data,
    keys = new Set(data.sources.map((s) => s.key));
  if (
    data.projectId !== projectId ||
    keys.size !== data.sources.length ||
    data.sources.some(
      (s) =>
        s.projectId !== projectId ||
        !new RegExp(`^/app/projects/${projectId}(?:/[\\w/-]+)?$`).test(s.href),
    ) ||
    [
      ...data.result.sourceIds,
      ...data.result.nextSteps.flatMap((s) => s.sourceIds),
    ].some((k) => !keys.has(k))
  )
    return null;
  return data;
}
export function historyText(answer: Answer) {
  return [
    answer.result.answer,
    ...answer.result.blockers,
    ...answer.result.nextSteps.map((s) => s.text),
  ]
    .join("\n")
    .slice(0, 6000);
}
