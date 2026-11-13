"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/shared/async-state";
import { useProjectApi } from "@/features/projects/queries";
import { Field } from "@/features/projects/shared";
import { ApiError } from "@/lib/api/client";
import {
  capabilityReason,
  uncertain,
  type Capability,
  type Requirement,
} from "./queries";
import { draftSchema, textSchema } from "./shared";

export type Selection = {
  kind: "draft" | "question" | "answer" | "revision" | "ready";
  snapshot: Requirement;
  parentId?: string;
  // Human-reviewed values only seed a new form; never reset an open editor.
  aiDraft?: {
    analysisId: string;
    sourceVersion: number;
    content?: string;
    acceptanceCriteria?: string[];
    question?: string;
  };
};
export type EditorProps = {
  selection: Selection;
  current: Requirement;
  available: boolean;
  refresh: () => Promise<unknown>;
  onDone: () => void;
  onCancel: () => void;
};

function useAction<T>(
  props: EditorProps,
  capability: Capability,
  write: (value: T, expectedVersion: number) => Promise<unknown>,
) {
  const [version, setVersion] = useState(props.selection.snapshot.draftVersion);
  const { queryClient, key } = useProjectApi();
  const mutation = useMutation({
    retry: false,
    mutationFn: (value: T) => write(value, version),
    onSuccess: async () => {
      await Promise.all([
        props.refresh(),
        queryClient.invalidateQueries({ queryKey: key("dashboard") }),
        queryClient.invalidateQueries({ queryKey: key("audit", props.current.projectId) }),
        queryClient.invalidateQueries({
          queryKey: key("requirements", props.current.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: key("revisions", props.current.projectId, props.current.id),
        }),
      ]);
      props.onDone();
    },
    // Never replace form values or replay the write when updating capabilities.
    onError: () => props.refresh(),
  });
  const changed = version !== props.current.draftVersion;
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
    submit: (v: T) => {
      if (!disabled) mutation.mutate(v);
    },
    reconcile: () => {
      setVersion(props.current.draftVersion);
      mutation.reset();
    },
  };
}

type ActionState = Pick<
  ReturnType<typeof useAction>,
  | "error"
  | "version"
  | "changed"
  | "conflict"
  | "unknown"
  | "disabled"
  | "capability"
  | "reconcile"
  | "isPending"
>;
function ActionFooter({
  action,
  props,
  label,
}: {
  action: ActionState;
  props: EditorProps;
  label: string;
}) {
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
            输入基于编辑版本 {action.version}，当前为{" "}
            {props.current.draftVersion}
            。请对照页面中的最新原文、问答和规格，核对输入后再提交。
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={
              !props.available || !action.capability.allowed || action.isPending
            }
            onClick={action.reconcile}
          >
            已核对最新内容，使用当前版本
          </Button>
        </div>
      )}
      {action.unknown && (
        <p className="notice">
          操作结果未知，输入已保留。请先刷新并核对问答、版本历史及当前状态，确认实际结果后再决定后续操作。
        </p>
      )}
      <div className="form-actions">
        <Button type="submit" disabled={action.disabled}>
          {action.isPending ? "正在保存…" : label}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={action.isPending}
          onClick={props.onCancel}
        >
          关闭表单
        </Button>
      </div>
    </>
  );
}

function DraftEditor(props: EditorProps) {
  const { api } = useProjectApi();
  const { title, originalText } = props.selection.snapshot;
  const form = useForm<z.infer<typeof draftSchema>>({
    resolver: zodResolver(draftSchema),
    defaultValues: { title, originalText },
  });
  const action = useAction(
    props,
    props.current.capabilities.editDraft,
    (value: z.infer<typeof draftSchema>, expectedVersion) =>
      api("patch", "/api/v1/requirements/{id}", {
        path: { id: props.current.id },
        body: { ...value, expectedVersion },
      }),
  );
  return (
    <form noValidate onSubmit={form.handleSubmit(action.submit)}>
      <h3>编辑需求草稿</h3>
      <Field
        id="edit-title"
        label="需求标题"
        error={form.formState.errors.title?.message}
      >
        <Input
          id="edit-title"
          {...form.register("title")}
          aria-invalid={!!form.formState.errors.title}
          aria-describedby="edit-title-error"
        />
      </Field>
      <Field
        id="edit-original"
        label="需求原文"
        error={form.formState.errors.originalText?.message}
      >
        <textarea
          className="form-control"
          id="edit-original"
          rows={7}
          {...form.register("originalText")}
          aria-invalid={!!form.formState.errors.originalText}
          aria-describedby="edit-original-error"
        />
      </Field>
      <ActionFooter action={action} props={props} label="保存草稿" />
    </form>
  );
}

const clarificationSchema = z.object({ body: textSchema("澄清内容", 10_000) });
function ClarificationEditor(props: EditorProps) {
  const { api } = useProjectApi();
  const answer = props.selection.kind === "answer";
  const form = useForm<z.infer<typeof clarificationSchema>>({
    resolver: zodResolver(clarificationSchema),
    defaultValues: { body: props.selection.aiDraft?.question ?? "" },
  });
  const action = useAction(
    props,
    answer
      ? props.current.capabilities.answerQuestion
      : props.current.capabilities.askQuestion,
    (value: z.infer<typeof clarificationSchema>, expectedVersion) =>
      api("post", "/api/v1/requirements/{id}/clarifications", {
        path: { id: props.current.id },
        body: {
          ...value,
          expectedVersion,
          ...(answer
            ? ({ kind: "ANSWER", parentId: props.selection.parentId! } as const)
            : ({ kind: "QUESTION" } as const)),
        },
      }),
  );
  const question = props.current.clarifications.find(
    (q) => q.id === props.selection.parentId,
  );
  return (
    <form noValidate onSubmit={form.handleSubmit(action.submit)}>
      <h3>{answer ? "回答问题" : "提出问题"}</h3>
      {question && (
        <blockquote className="question-quote">{question.body}</blockquote>
      )}
      <Field
        id="clarification-body"
        label={answer ? "回答内容" : "问题内容"}
        error={form.formState.errors.body?.message}
      >
        <textarea
          className="form-control"
          id="clarification-body"
          rows={5}
          {...form.register("body")}
          aria-invalid={!!form.formState.errors.body}
          aria-describedby="clarification-body-error"
        />
      </Field>
      <ActionFooter
        action={action}
        props={props}
        label={answer ? "提交回答" : "提交问题"}
      />
    </form>
  );
}

const revisionSchema = z.object({
  content: textSchema("规格正文", 20_000),
  criteria: z
    .array(z.object({ value: textSchema("验收标准", 1000) }))
    .max(100, "最多 100 条验收标准"),
});
function RevisionEditor(props: EditorProps) {
  const { api } = useProjectApi();
  const latest = props.selection.snapshot.latestRevision;
  const form = useForm<z.infer<typeof revisionSchema>>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      content:
        props.selection.aiDraft?.content ?? latest?.content ?? props.selection.snapshot.originalText,
      criteria:
        (props.selection.aiDraft?.acceptanceCriteria ?? latest?.acceptanceCriteria)?.map((value) => ({ value })) ?? [{ value: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criteria",
  });
  const action = useAction(
    props,
    props.current.capabilities.createRevision,
    (value: z.infer<typeof revisionSchema>, expectedVersion) =>
      api("post", "/api/v1/requirements/{id}/revisions", {
        path: { id: props.current.id },
        body: {
          expectedVersion,
          content: value.content,
          acceptanceCriteria: value.criteria.map((c) => c.value),
        },
      }),
  );
  return (
    <form noValidate onSubmit={form.handleSubmit(action.submit)}>
      <h3>创建新 Revision</h3>
      <p className="muted-copy">
        请将澄清结论整理进正文。保存后不可修改；后续调整创建新版本，并重新标记就绪。
      </p>
      <Field
        id="revision-content"
        label="规格正文"
        error={form.formState.errors.content?.message}
      >
        <textarea
          className="form-control"
          id="revision-content"
          rows={8}
          {...form.register("content")}
          aria-invalid={!!form.formState.errors.content}
          aria-describedby="revision-content-error"
        />
      </Field>
      <fieldset className="criteria-editor">
        <legend>验收标准</legend>
        {fields.map((field, i) => (
          <div className="criterion-editor" key={field.id}>
            <Field
              id={`criterion-${field.id}`}
              label={`验收标准 ${i + 1}`}
              error={form.formState.errors.criteria?.[i]?.value?.message}
            >
              <textarea
                className="form-control"
                id={`criterion-${field.id}`}
                rows={2}
                {...form.register(`criteria.${i}.value`)}
                aria-invalid={!!form.formState.errors.criteria?.[i]}
                aria-describedby={`criterion-${field.id}-error`}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              aria-label={`移除验收标准 ${i + 1}`}
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
          添加验收标准
        </Button>
        <p className="field-hint">
          可暂存为无标准的 Revision；标记就绪前必须有非空验收标准。
        </p>
      </fieldset>
      <ActionFooter action={action} props={props} label="保存为新 Revision" />
    </form>
  );
}

function ReadyEditor(props: EditorProps) {
  const { api } = useProjectApi();
  const action = useAction(
    props,
    props.current.capabilities.markReady,
    (_: undefined, expectedVersion) =>
      api("post", "/api/v1/requirements/{id}/mark-ready", {
        path: { id: props.current.id },
        body: { expectedVersion },
      }),
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        action.submit(undefined);
      }}
    >
      <h3>确认标记就绪</h3>
      <p className="notice">
        你将确认当前最新 Revision {props.current.latestRevision?.revisionNo}
        。就绪后不能继续问答；后续修改须创建新 Revision。这不是商业审批。
      </p>
      <ActionFooter action={action} props={props} label="确认标记就绪" />
    </form>
  );
}

export function RequirementEditor(props: EditorProps) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus();
  }, []);
  return (
    <section
      ref={panel}
      tabIndex={-1}
      className="surface-panel requirement-editor"
      aria-label="需求操作表单"
    >
      {props.selection.aiDraft && (
        <p className="notice" role="status">
          已填入你确认采用的 AI 草稿（分析来源编辑版本 {props.selection.aiDraft.sourceVersion}）。
          尚未保存，请继续核对和编辑；保存不会自动标记就绪或提交审批。
        </p>
      )}
      {props.selection.kind === "draft" ? (
        <DraftEditor {...props} />
      ) : props.selection.kind === "revision" ? (
        <RevisionEditor {...props} />
      ) : props.selection.kind === "ready" ? (
        <ReadyEditor {...props} />
      ) : (
        <ClarificationEditor {...props} />
      )}
    </section>
  );
}
