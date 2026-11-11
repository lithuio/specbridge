"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/components/shared/async-state";
import { Field } from "@/features/projects/shared";
import { useProjectApi } from "@/features/projects/queries";
import { uncertain } from "@/features/requirements/queries";
import type { Change } from "@/features/changes/queries";
import { ApiError } from "@/lib/api/client";
import { deliverySchema } from "./shared";
import { deliveryPath, useRefreshDelivery } from "./queries";

export function DeliveryEntry({
  change,
  available,
}: {
  change: Change;
  available: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const resetAfterSuccess = useRef(false);
  const [snapshot, setSnapshot] = useState(change);
  const { api } = useProjectApi();
  const router = useRouter();
  const refresh = useRefreshDelivery(change.projectId, change.id);
  const form = useForm<
    z.input<typeof deliverySchema>,
    unknown,
    z.output<typeof deliverySchema>
  >({
    resolver: zodResolver(deliverySchema),
    defaultValues: { artifactUrl: "", summary: "", evidence: "" },
  });
  const mutation = useMutation({
    retry: false,
    mutationFn: (value: z.output<typeof deliverySchema>) =>
      api("post", "/api/v1/change-requests/{id}/deliveries", {
        path: { id: snapshot.id },
        body: {
          artifactUrl: value.artifactUrl,
          summary: value.summary,
          evidenceLinks: value.evidence,
        },
      }),
    onSuccess: async ({ data }) => {
      await refresh();
      setOpen(false);
      form.reset();
      resetAfterSuccess.current = true;
      router.push(deliveryPath(change.projectId, data.id));
    },
    onError: () => refresh(),
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
  const cap = change.capabilities.createDelivery;
  const unknown = uncertain(mutation.error);
  const conflict =
    mutation.error instanceof ApiError && mutation.error.status === 409;
  const disabled =
    !available ||
    !cap.allowed ||
    mutation.isPending ||
    mutation.isSuccess ||
    unknown ||
    conflict ||
    snapshot.activeVersionId !== change.activeVersionId;
  const base = `/app/projects/${change.projectId}`;
  return (
    <section className="surface-panel guidance-panel" aria-label="交付入口">
      <h3>交付与验收</h3>
      <p>
        针对双方批准的版本提交 HTTPS
        成果、说明与证据。退回后创建新交付，旧记录完整保留。
      </p>
      {change.status === "APPROVED" && (
        <>
          {cap.allowed && (
            <Button
              ref={trigger}
              disabled={
                !available ||
                mutation.isPending ||
                unknown ||
                mutation.isSuccess
              }
              onClick={() => {
                setSnapshot(change);
                setOpen(true);
                mutation.reset();
              }}
            >
              提交新交付
            </Button>
          )}
          {!cap.allowed && cap.reasonCode !== "ROLE_FORBIDDEN" && (
            <p className="notice">
              {cap.reasonCode === "DELIVERY_COMPLETED"
                ? "此批准版本已验收，不能继续交付。"
                : cap.reasonCode === "DELIVERY_PENDING"
                  ? "已有待验收交付，请等待客户决定。"
                  : "当前不满足交付条件，请刷新核对。"}
            </p>
          )}
        </>
      )}
      <Link
        className="text-link"
        href={`${base}/deliveries?changeRequestId=${change.id}`}
      >
        查看此变更的交付历史 →
      </Link>
      {unknown && (
        <p className="notice">
          提交结果未知，请先查看交付历史核对；不会自动再次提交。
        </p>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (
            !next &&
            !mutation.isPending &&
            (!form.formState.isDirty ||
              window.confirm("尚有未提交的交付内容，确定关闭？"))
          )
            setOpen(false);
        }}
      >
        <DialogContent
          className="change-confirmation"
          showCloseButton={false}
          finalFocus={trigger}
        >
          <DialogTitle>
            提交新交付 · v{snapshot.activeVersion?.versionNo}
          </DialogTitle>
          <DialogDescription>
            CR {snapshot.id.slice(0, 8)} ·
            关联双方批准规格。提交后等待客户验收。
          </DialogDescription>
          <p className="record-text">{snapshot.activeVersion?.scopeSnapshot}</p>
          <ol className="criteria-list">
            {snapshot.activeVersion?.acceptanceCriteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
          <form
            noValidate
            onSubmit={form.handleSubmit((v) => {
              if (!disabled) mutation.mutate(v);
            })}
          >
            <Field
              id="artifact-url"
              label="成果链接（HTTPS）"
              error={form.formState.errors.artifactUrl?.message}
            >
              <Input id="artifact-url" {...form.register("artifactUrl")} />
            </Field>
            <Field
              id="delivery-summary"
              label="交付说明"
              error={form.formState.errors.summary?.message}
            >
              <textarea
                id="delivery-summary"
                className="form-control"
                rows={4}
                {...form.register("summary")}
              />
            </Field>
            <Field
              id="evidence-links"
              label="证据链接（可选，每行一个 HTTPS 链接）"
              error={form.formState.errors.evidence?.message}
            >
              <textarea
                id="evidence-links"
                className="form-control"
                rows={2}
                {...form.register("evidence")}
              />
            </Field>
            {mutation.error && <ErrorNotice error={mutation.error} />}
            {(conflict || unknown || !cap.allowed) && (
              <p className="notice">
                输入已保留。请先关闭并查看交付历史，核对实际状态后再操作。
              </p>
            )}
            <div className="form-actions">
              <Button type="submit" disabled={disabled}>
                {mutation.isPending ? "正在提交…" : "确认提交交付"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => {
                  if (
                    !form.formState.isDirty ||
                    window.confirm("尚有未提交的交付内容，确定关闭？")
                  )
                    setOpen(false);
                }}
              >
                关闭
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
