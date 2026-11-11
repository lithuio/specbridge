"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/components/shared/async-state";
import { useProjectApi } from "@/features/projects/queries";
import { Field, QueryState } from "@/features/projects/shared";
import { uncertain, useRequirement } from "@/features/requirements/queries";
import { ApiError } from "@/lib/api/client";
import {
  capabilityReason,
  useRefreshChange,
  type Change,
  type Draft,
} from "./queries";
import {
  assessmentSchema,
  draftBody,
  CommercialFacts,
  type Assessment,
} from "./shared";

export type Selection = {
  kind: "editDraft" | "submit" | "reopen" | "vendorDecision" | "clientDecision";
  snapshot: Change;
  decision?: "APPROVED" | "REJECTED";
};
type Props = {
  selection: Selection;
  current: Change;
  available: boolean;
  onDone: () => void;
  onCancel: () => void;
};
function useAction<T>(
  props: Props,
  write: (value: T, expectedVersion: number) => Promise<unknown>,
) {
  const [version, setVersion] = useState(props.selection.snapshot.lockVersion);
  const refresh = useRefreshChange(props.current);
  const mutation = useMutation({
    retry: false,
    mutationFn: (v: T) => write(v, version),
    onSuccess: async () => {
      await refresh();
      props.onDone();
    },
    onError: () => refresh(),
  });
  const capability = props.current.capabilities[props.selection.kind];
  const changed = version !== props.current.lockVersion;
  const conflict =
    mutation.error instanceof ApiError && mutation.error.status === 409;
  const unknown = uncertain(mutation.error);
  const disabled =
    !props.available ||
    !capability.allowed ||
    changed ||
    conflict ||
    unknown ||
    mutation.isPending ||
    mutation.isSuccess;
  return {
    ...mutation,
    version,
    changed,
    conflict,
    unknown,
    disabled,
    capability,
    submit: (value: T) => {
      if (!disabled) mutation.mutate(value);
    },
    reconcile: () => {
      setVersion(props.current.lockVersion);
      mutation.reset();
    },
  };
}
type FeedbackState = Pick<
  ReturnType<typeof useAction>,
  | "error"
  | "capability"
  | "changed"
  | "conflict"
  | "unknown"
  | "version"
  | "isPending"
  | "reconcile"
>;
function Feedback({ action, props }: { action: FeedbackState; props: Props }) {
  return (
    <>
      {action.error && <ErrorNotice error={action.error} />}
      {!action.capability.allowed && (
        <p className="notice">
          {capabilityReason(action.capability)} 输入已保留。
        </p>
      )}
      {(action.changed || action.conflict) && !action.unknown && (
        <div className="notice" role="status">
          <p>
            此操作基于锁版本 {action.version}，当前为{" "}
            {props.current.lockVersion}
            。内容或审批阶段已更新，输入已保留，未自动重放。
          </p>
          {props.selection.kind === "editDraft" ? (
            <Button
              type="button"
              variant="outline"
              disabled={
                !props.available ||
                !action.capability.allowed ||
                action.isPending
              }
              onClick={action.reconcile}
            >
              已核对最新草稿，使用当前版本
            </Button>
          ) : (
            <p>
              请关闭确认框，核对最新冻结版本、范围与审批历史，再重新发起操作。
            </p>
          )}
        </div>
      )}
      {action.unknown && (
        <p className="notice">
          操作结果未知，已停止重发。请关闭并刷新，先核对当前状态及版本／审批历史。
        </p>
      )}
    </>
  );
}

// Native unload and ordinary in-app links warn before leaving an unsaved draft.
// Activity keeps the form on back/forward; identity changes still unmount it.
function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const navigate = (e: MouseEvent) => {
      const link =
        e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0)
        return;
      if (!window.confirm("商业草稿尚未保存，确定离开当前表单？")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
}

export function DraftEditor(props: Props & { draft: Draft }) {
  const { api } = useProjectApi();
  const panel = useRef<HTMLElement>(null);
  const requirement = useRequirement(
    props.current.projectId,
    props.current.requirementId,
  );
  const draft = props.draft;
  const form = useForm<Assessment>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      requirementRevisionId: draft.requirementRevisionId,
      scopeSummary: draft.scopeSummary ?? "",
      estimateHours: draft.estimateHours ?? "",
      costDeltaMinor: draft.costDeltaMinor?.toString() ?? "",
      currency: draft.currency ?? "",
      scheduleDeltaDays: draft.scheduleDeltaDays?.toString() ?? "",
      criteria: draft.acceptanceCriteria?.map((value) => ({ value })) ?? [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criteria",
  });
  const action = useAction(props, (value: Assessment, expectedVersion) =>
    api("patch", "/api/v1/change-requests/{id}", {
      path: { id: props.current.id },
      body: { ...draftBody(value), expectedVersion },
    }),
  );
  useUnsavedWarning(form.formState.isDirty && !action.isSuccess);
  useEffect(() => {
    panel.current?.focus();
  }, []);
  const latest = requirement.data?.latestRevision;
  const close = () => {
    if (
      !form.formState.isDirty ||
      window.confirm("放弃尚未保存的商业草稿修改？")
    )
      props.onCancel();
  };
  const inputs = [
    ["estimateHours", "评估工时（小时）", "最多两位小数；留空表示未评估。"],
    [
      "costDeltaMinor",
      "费用变化（最小单位）",
      "填写有符号整数。例如 CNY 12345 表示增加 123.45 元；JPY 12345 表示增加 12345 日元。",
    ],
    [
      "scheduleDeltaDays",
      "工期变化（天）",
      "整数；正数增加、负数减少，0 表示不变。",
    ],
  ] as const;
  return (
    <section
      ref={panel}
      tabIndex={-1}
      className="surface-panel requirement-editor"
      aria-label="商业草稿编辑"
    >
      <h3>编辑商业评估草稿</h3>
      <p className="muted-copy">
        草稿仅供应方可见。可先保存部分评估；留空会清空对应字段。保存不会提交审批。
      </p>
      <form noValidate onSubmit={form.handleSubmit(action.submit)}>
        <Field
          id="assessment-revision"
          label="引用需求版本"
          error={form.formState.errors.requirementRevisionId?.message}
        >
          <select
            id="assessment-revision"
            className="form-control"
            {...form.register("requirementRevisionId")}
          >
            <option value={draft.requirementRevisionId}>
              已选版本 ·{" "}
              {latest?.id === draft.requirementRevisionId
                ? `Revision ${latest.revisionNo}`
                : draft.requirementRevisionId}
            </option>
            {latest && latest.id !== draft.requirementRevisionId && (
              <option value={latest.id}>
                最新 Revision {latest.revisionNo}
                {requirement.data?.status === "READY"
                  ? " · 已就绪"
                  : " · 尚未就绪"}
              </option>
            )}
          </select>
        </Field>
        <QueryState query={requirement} />
        {latest && (
          <details>
            <summary>核对最新需求规格 · Revision {latest.revisionNo}</summary>
            <p className="record-text">{latest.content}</p>
          </details>
        )}
        <Field
          id="assessment-scope"
          label="范围说明"
          error={form.formState.errors.scopeSummary?.message}
        >
          <textarea
            id="assessment-scope"
            className="form-control"
            rows={6}
            {...form.register("scopeSummary")}
            aria-invalid={!!form.formState.errors.scopeSummary}
            aria-describedby="assessment-scope-error"
          />
        </Field>
        <div className="assessment-inputs">
          {inputs.map(([name, label, hint]) => (
            <Field
              key={name}
              id={`assessment-${name}`}
              label={label}
              hint={hint}
              error={form.formState.errors[name]?.message}
            >
              <Input
                id={`assessment-${name}`}
                inputMode={name === "estimateHours" ? "decimal" : "text"}
                {...form.register(name)}
                aria-invalid={!!form.formState.errors[name]}
                aria-describedby={`assessment-${name}-hint assessment-${name}-error`}
              />
            </Field>
          ))}
          <Field
            id="assessment-currency"
            label="币种"
            hint="请选择币种；不自动设默认币种或换汇。"
            error={form.formState.errors.currency?.message}
          >
            <select
              id="assessment-currency"
              className="form-control"
              {...form.register("currency")}
            >
              <option value="">尚未选择</option>
              {Intl.supportedValuesOf("currency").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset className="criteria-editor">
          <legend>商业验收标准</legend>
          {fields.map((field, i) => (
            <div className="criterion-editor" key={field.id}>
              <Field
                id={`assessment-criterion-${i}`}
                label={`商业验收标准 ${i + 1}`}
                error={form.formState.errors.criteria?.[i]?.value?.message}
              >
                <textarea
                  id={`assessment-criterion-${i}`}
                  className="form-control"
                  rows={2}
                  {...form.register(`criteria.${i}.value`)}
                  aria-invalid={!!form.formState.errors.criteria?.[i]}
                  aria-describedby={`assessment-criterion-${i}-error`}
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                aria-label={`移除商业验收标准 ${i + 1}`}
                onClick={() => remove(i)}
              >
                移除
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={fields.length >= 100}
            onClick={() => append({ value: "" })}
          >
            添加商业验收标准
          </Button>
          <p className="field-hint">
            可暂存空列表；正式提交须至少一条非空标准。
          </p>
        </fieldset>
        <Feedback action={action} props={props} />
        <div className="form-actions">
          <Button type="submit" disabled={action.disabled}>
            {action.isPending ? "正在保存…" : "保存商业草稿"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={action.isPending}
            onClick={close}
          >
            关闭表单
          </Button>
        </div>
      </form>
    </section>
  );
}

const decisionSchema = z.object({
  comment: z
    .string()
    .trim()
    .refine((v) => Array.from(v).length <= 10000, "评论最多 10,000 个字符"),
});
export function ChangeConfirmation(
  props: Props & { finalFocus: () => HTMLElement | null },
) {
  const { api } = useProjectApi();
  const { kind, snapshot, decision } = props.selection;
  const isDecision = kind === "vendorDecision" || kind === "clientDecision";
  const form = useForm<z.infer<typeof decisionSchema>>({
    resolver: zodResolver(decisionSchema),
    defaultValues: { comment: "" },
  });
  const action = useAction(
    props,
    (value: z.infer<typeof decisionSchema>, expectedVersion) => {
      const path = { id: props.current.id };
      if (kind === "submit")
        return api("post", "/api/v1/change-requests/{id}/submit", {
          path,
          body: { expectedVersion },
        });
      if (kind === "reopen")
        return api("post", "/api/v1/change-requests/{id}/resubmit", {
          path,
          body: { expectedVersion },
        });
      const body = {
        expectedVersion,
        decision: decision!,
        ...(value.comment ? { comment: value.comment } : {}),
      };
      return kind === "vendorDecision"
        ? api("post", "/api/v1/change-requests/{id}/vendor-decision", {
            path,
            body,
          })
        : api("post", "/api/v1/change-requests/{id}/client-decision", {
            path,
            body,
          });
    },
  );
  const title =
    kind === "submit"
      ? "确认正式提交"
      : kind === "reopen"
        ? "确认重开评估"
        : `确认${decision === "APPROVED" ? "批准" : "拒绝"} v${snapshot.activeVersion?.versionNo}`;
  const version = snapshot.activeVersion;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.isPending) props.onCancel();
      }}
    >
      <DialogContent
        className="change-confirmation"
        showCloseButton={false}
        finalFocus={props.finalFocus}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {kind === "submit"
            ? "将已保存的评估冻结为新版本，并开始负责人 → 客户顺序审批。"
            : kind === "reopen"
              ? "仅重开供应方草稿；不生成新版本，不继承旧审批。调整并保存后须另行正式提交。"
              : "决定仅针对下列冻结版本。评论对供应方和客户双方可见。"}
        </DialogDescription>
        {isDecision && version && (
          <>
            <p>
              冻结版本 v{version.versionNo} · Revision{" "}
              {version.requirementRevision.revisionNo}
            </p>
            <p className="record-meta">
              冻结于{" "}
              <time dateTime={version.submittedAt}>
                {new Date(version.submittedAt).toLocaleString("zh-CN", {
                  hour12: false,
                })}
              </time>
            </p>
            <CommercialFacts value={version} />
            <details>
              <summary>核对范围与验收标准</summary>
              <p className="record-text">{version.scopeSnapshot}</p>
              <ol className="criteria-list">
                {version.acceptanceCriteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            </details>
          </>
        )}
        {kind === "submit" && "draft" in snapshot && (
          <CommercialFacts value={snapshot.draft} />
        )}
        <form noValidate onSubmit={form.handleSubmit(action.submit)}>
          {isDecision && (
            <Field
              id="approval-comment"
              label="审批评论（可选，双方可见）"
              error={form.formState.errors.comment?.message}
            >
              <textarea
                id="approval-comment"
                rows={3}
                className="form-control"
                {...form.register("comment")}
                aria-invalid={!!form.formState.errors.comment}
                aria-describedby="approval-comment-error"
              />
            </Field>
          )}
          <Feedback action={action} props={props} />
          <div className="form-actions">
            <Button type="submit" disabled={action.disabled}>
              {action.isPending ? "正在处理…" : title}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={action.isPending}
              onClick={props.onCancel}
            >
              关闭确认框
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
