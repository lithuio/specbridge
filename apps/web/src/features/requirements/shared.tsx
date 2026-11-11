"use client";

import { z } from "zod";
import { useCurrentProject } from "@/features/projects/project-detail";
import type { Revision } from "./queries";

export const textSchema = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `请填写${label}`)
    .refine(
      (v) => Array.from(v).length <= max,
      `${label}最多 ${max.toLocaleString("en-US")} 个字符`,
    );
export const draftSchema = z.object({
  title: textSchema("需求标题", 200),
  originalText: textSchema("需求原文", 20_000),
});
export function offsetValue(value: string | null) {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000 ? n : 0;
}
export function PersonTime({ userId, time }: { userId: string; time: string }) {
  const project = useCurrentProject();
  const person =
    project.owner.userId === userId
      ? project.owner
      : project.members.find((m) => m.userId === userId);
  return (
    <p className="record-meta">
      {person?.displayName ?? "历史项目成员"} ·{" "}
      <time dateTime={time}>
        {new Date(time).toLocaleString("zh-CN", { hour12: false })}
      </time>
    </p>
  );
}
export function RevisionContent({ revision }: { revision: Revision }) {
  return (
    <>
      <PersonTime userId={revision.createdBy} time={revision.createdAt} />
      <div className="record-text">{revision.content}</div>
      <h3>验收标准 · {revision.acceptanceCriteria.length} 条</h3>
      {revision.acceptanceCriteria.length ? (
        <ol className="criteria-list">
          {revision.acceptanceCriteria.map((criterion, i) => (
            <li key={i}>{criterion}</li>
          ))}
        </ol>
      ) : (
        <p className="notice">此版本尚无验收标准，不能标记就绪。</p>
      )}
    </>
  );
}
