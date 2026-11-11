"use client";

import Link from "next/link";
import { z } from "zod";
import {
  PersonTime,
  RevisionContent,
  textSchema,
} from "@/features/requirements/shared";
import { requirementPath } from "@/features/requirements/queries";
import type { Draft, FrozenVersion } from "./queries";

// Input remains text until lexical and integer-range validation has succeeded.
// Never parseFloat, multiply money by 100, round, or coerce an empty value to zero.
const integerText = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" ||
        (/^-?(0|[1-9]\d*)$/.test(v) &&
          Number.isSafeInteger(Number(v)) &&
          Number(v) >= min &&
          Number(v) <= max),
      message,
    );
export const assessmentSchema = z.object({
  requirementRevisionId: z.uuid("请选择需求版本"),
  scopeSummary: z.union([z.literal(""), textSchema("范围说明", 20_000)]),
  estimateHours: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(v),
      "工时须为 0～999999.99，最多两位小数，不接受指数",
    ),
  costDeltaMinor: integerText(
    -Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    "费用须为 ±9007199254740991 内的整数最小单位，不接受小数或指数",
  ),
  currency: z
    .string()
    .refine(
      (v) => !v || (Intl.supportedValuesOf("currency") as string[]).includes(v),
      "请选择有效币种",
    ),
  scheduleDeltaDays: integerText(
    -2147483648,
    2147483647,
    "工期须为 -2147483648～2147483647 的整数天数",
  ),
  criteria: z
    .array(z.object({ value: textSchema("验收标准", 1000) }))
    .max(100, "最多 100 条验收标准"),
});
export type Assessment = z.infer<typeof assessmentSchema>;
export function draftBody(value: Assessment): Draft {
  return {
    requirementRevisionId: value.requirementRevisionId,
    scopeSummary: value.scopeSummary || null,
    estimateHours: value.estimateHours || null,
    costDeltaMinor:
      value.costDeltaMinor === "" ? null : Number(value.costDeltaMinor),
    currency: value.currency || null,
    scheduleDeltaDays:
      value.scheduleDeltaDays === "" ? null : Number(value.scheduleDeltaDays),
    acceptanceCriteria: value.criteria.map((c) => c.value),
  };
}
export function money(minor: number, currency: string) {
  // String placement preserves every safe integer unit, including at MAX_SAFE_INTEGER.
  const digits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const raw = String(Math.abs(minor)).padStart(digits + 1, "0");
  const whole = digits ? raw.slice(0, -digits) : raw;
  const fraction = digits ? `.${raw.slice(-digits)}` : "";
  return `${currency} ${minor < 0 ? "−" : "+"}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction}`;
}
export function CommercialFacts({
  value,
}: {
  value: Pick<
    Draft,
    "estimateHours" | "costDeltaMinor" | "currency" | "scheduleDeltaDays"
  >;
}) {
  return (
    <dl className="commercial-facts">
      <div>
        <dt>评估工时</dt>
        <dd>
          {value.estimateHours === null
            ? "未填写"
            : `${value.estimateHours} 小时`}
        </dd>
      </div>
      <div>
        <dt>费用变化</dt>
        <dd>
          {value.costDeltaMinor !== null && value.currency
            ? money(value.costDeltaMinor, value.currency)
            : "未完整填写"}
        </dd>
        {value.costDeltaMinor !== null && (
          <small>{value.costDeltaMinor} 最小单位</small>
        )}
      </div>
      <div>
        <dt>工期变化</dt>
        <dd>
          {value.scheduleDeltaDays === null
            ? "未填写"
            : `${value.scheduleDeltaDays > 0 ? "+" : ""}${value.scheduleDeltaDays} 天`}
        </dd>
      </div>
    </dl>
  );
}
export function versionOutcome(version: FrozenVersion) {
  if (version.approvals.some((a) => a.decision === "REJECTED"))
    return "本轮已拒绝";
  if (
    version.approvals.some(
      (a) => a.step === "CLIENT" && a.decision === "APPROVED",
    )
  )
    return "双方已批准";
  if (
    version.approvals.some(
      (a) => a.step === "VENDOR" && a.decision === "APPROVED",
    )
  )
    return "负责人已批准 · 客户尚未决定";
  return "负责人尚未决定";
}
export function ApprovalHistory({ version }: { version: FrozenVersion }) {
  const rejected = version.approvals.some((a) => a.decision === "REJECTED");
  return (
    <ol
      className="approval-steps"
      aria-label={`v${version.versionNo} 审批记录`}
    >
      {(["VENDOR", "CLIENT"] as const).map((step, index) => {
        const approval = version.approvals.find((a) => a.step === step);
        return (
          <li key={step} data-decision={approval?.decision}>
            <span className="approval-step-number">{index + 1}</span>
            <div>
              <h4>
                {step === "VENDOR" ? "供应方负责人" : "项目客户"} ·{" "}
                {approval
                  ? approval.decision === "APPROVED"
                    ? "已批准"
                    : "已拒绝"
                  : "尚未决定"}
              </h4>
              {approval ? (
                <>
                  <PersonTime
                    userId={approval.actorId}
                    time={approval.createdAt}
                  />
                  <p className="record-text">
                    {approval.comment ?? "未附评论"}
                  </p>
                </>
              ) : (
                <p className="record-meta">
                  {rejected
                    ? "本轮已结束，不再接收决定。"
                    : step === "CLIENT"
                      ? "仅在负责人批准同一版本后确认。"
                      : "等待负责人核对冻结评估。"}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
export function FrozenContent({
  version,
  projectId,
}: {
  version: FrozenVersion;
  projectId: string;
}) {
  return (
    <>
      <section className="surface-panel" aria-label="冻结商业评估">
        <div className="section-heading">
          <h3>冻结版本 v{version.versionNo}</h3>
          <span className="status-badge">只读快照</span>
        </div>
        <PersonTime userId={version.submittedBy} time={version.submittedAt} />
        <CommercialFacts value={version} />
        <h4>范围说明</h4>
        <p className="record-text">{version.scopeSnapshot}</p>
        <h4>商业验收标准</h4>
        <ol className="criteria-list">
          {version.acceptanceCriteria.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
      </section>
      <section className="surface-panel" aria-label="冻结需求规格">
        <div className="section-heading">
          <h3>引用规格 · Revision {version.requirementRevision.revisionNo}</h3>
          <Link
            className="text-link"
            href={`${requirementPath(projectId, version.requirementRevision.requirementId)}/revisions/${version.requirementRevisionId}`}
          >
            规格历史 →
          </Link>
        </div>
        <RevisionContent revision={version.requirementRevision} />
      </section>
    </>
  );
}
