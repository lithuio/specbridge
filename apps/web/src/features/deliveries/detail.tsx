"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/components/shared/async-state";
import { useCurrentProject } from "@/features/projects/project-detail";
import { useProjectApi } from "@/features/projects/queries";
import { Field, QueryState } from "@/features/projects/shared";
import { textSchema } from "@/features/requirements/shared";
import { uncertain } from "@/features/requirements/queries";
import { changePath, useFrozenVersion } from "@/features/changes/queries";
import { FrozenContent, ApprovalHistory } from "@/features/changes/shared";
import { ApiError } from "@/lib/api/client";
import {
  useDelivery,
  useRefreshDelivery,
  type DeliveryDetail as DeliveryData,
} from "./queries";
import { DeliveryContent, ReviewRecord } from "./shared";

export function DeliveryDetail() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  return <Detail key={deliveryId} id={deliveryId} />;
}
function Detail({ id }: { id: string }) {
  const project = useCurrentProject();
  const query = useDelivery(project.id, id);
  if (
    !query.data ||
    (query.error instanceof ApiError &&
      [401, 403, 404].includes(query.error.status))
  )
    return <QueryState query={query} />;
  return (
    <Loaded
      delivery={query.data}
      available={!query.isFetching && !query.error}
      refresh={() => query.refetch()}
      error={query.error}
    />
  );
}
function Loaded({
  delivery,
  available,
  refresh,
  error,
}: {
  delivery: DeliveryData;
  available: boolean;
  refresh: () => unknown;
  error: unknown;
}) {
  const [selection, setSelection] = useState<{
    decision: "ACCEPTED" | "CHANGES_REQUESTED";
    snapshot: DeliveryData;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const version = useFrozenVersion(
    delivery.projectId,
    delivery.changeRequestId,
    delivery.changeRequestVersionId,
  );
  const base = changePath(delivery.projectId, delivery.changeRequestId);
  return (
    <>
      <Link
        className="text-link"
        href={`/app/projects/${delivery.projectId}/deliveries?changeRequestId=${delivery.changeRequestId}`}
      >
        ← 此变更全部交付
      </Link>
      <div className="page-heading heading-actions">
        <div>
          <p className="eyebrow">
            CR {delivery.changeRequestId.slice(0, 8)} / v{delivery.versionNo} /
            D{delivery.deliveryNo}
          </p>
          <h2>交付详情 · D{delivery.deliveryNo}</h2>
          <p>{delivery.requirementTitle}</p>
        </div>
        <Button
          variant="outline"
          disabled={!available && !error}
          ref={refreshButton}
          onClick={() => void refresh()}
        >
          刷新交付
        </Button>
      </div>
      {error ? <ErrorNotice error={error} /> : null}
      {saved && (
        <p className="notice success" role="status">
          验收决定已保存，交付与活动记录已更新。
        </p>
      )}
      {delivery.status === "ACCEPTED" && (
        <p className="notice success">
          此批准版本已验收，流程完成。不能重复验收或继续交付。
        </p>
      )}
      {delivery.status === "CHANGES_REQUESTED" && (
        <p className="notice">
          本次已退回。供应方需在原批准变更下提交新交付，本次内容与意见保持只读。
        </p>
      )}
      <div className="requirement-detail-grid">
        <div className="stack-panels">
          <DeliveryContent delivery={delivery} />
          <QueryState query={version} />
          {version.data && !version.error && (
            <>
              <FrozenContent
                version={version.data}
                projectId={delivery.projectId}
              />
              <section className="surface-panel">
                <h3>关联版本批准记录</h3>
                <ApprovalHistory version={version.data} />
              </section>
            </>
          )}
        </div>
        <aside className="stack-panels">
          <ReviewRecord delivery={delivery} />
          <section className="surface-panel">
            <h3>下一步</h3>
            {delivery.capabilities.review.allowed && (
              <>
                <Button
                  disabled={
                    !available ||
                    !version.data ||
                    !!version.error ||
                    !!selection
                  }
                  onClick={(event) => {
                    opener.current = event.currentTarget;
                    setSaved(false);
                    setSelection({ decision: "ACCEPTED", snapshot: delivery });
                  }}
                >
                  接受交付
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    !available ||
                    !version.data ||
                    !!version.error ||
                    !!selection
                  }
                  onClick={(event) => {
                    opener.current = event.currentTarget;
                    setSaved(false);
                    setSelection({
                      decision: "CHANGES_REQUESTED",
                      snapshot: delivery,
                    });
                  }}
                >
                  退回修改
                </Button>
              </>
            )}
            <p className="field-hint">
              验收决定对双方可见，每次交付只能终审一次。
            </p>
            <Link className="text-link" href={base}>
              查看批准变更与交付入口 →
            </Link>
            <br />
            <Link
              className="text-link"
              href={`${base}/versions/${delivery.changeRequestVersionId}`}
            >
              独立批准版本详情 →
            </Link>
          </section>
        </aside>
      </div>
      {selection && (
        <ReviewDialog
          finalFocus={() =>
            opener.current?.isConnected ? opener.current : refreshButton.current
          }
          selection={selection}
          current={delivery}
          available={available}
          onClose={() => setSelection(null)}
          onDone={() => {
            setSelection(null);
            setSaved(true);
          }}
        />
      )}
    </>
  );
}
function ReviewDialog({
  finalFocus,
  selection,
  current,
  available,
  onClose,
  onDone,
}: {
  finalFocus: () => HTMLElement | null;
  selection: {
    decision: "ACCEPTED" | "CHANGES_REQUESTED";
    snapshot: DeliveryData;
  };
  current: DeliveryData;
  available: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useProjectApi();
  const refresh = useRefreshDelivery(
    current.projectId,
    current.changeRequestId,
  );
  const returned = selection.decision === "CHANGES_REQUESTED";
  const form = useForm<{ comment: string }>({
    resolver: zodResolver(
      z.object({
        comment: returned
          ? textSchema("退回意见", 10_000)
          : z.union([z.literal(""), textSchema("验收评论", 10_000)]),
      }),
    ),
    defaultValues: { comment: "" },
  });
  const mutation = useMutation({
    retry: false,
    mutationFn: ({ comment }: { comment: string }) =>
      api("post", "/api/v1/deliveries/{id}/review", {
        path: { id: selection.snapshot.id },
        body:
          selection.decision === "CHANGES_REQUESTED"
            ? { decision: "CHANGES_REQUESTED", comment }
            : { decision: "ACCEPTED", ...(comment ? { comment } : {}) },
      }),
    onSuccess: async () => {
      await refresh();
      onDone();
    },
    onError: () => refresh(),
  });
  const conflict =
    mutation.error instanceof ApiError && mutation.error.status === 409;
  const blocked =
    !available ||
    !current.capabilities.review.allowed ||
    current.status !== selection.snapshot.status ||
    conflict ||
    uncertain(mutation.error) ||
    mutation.isPending ||
    mutation.isSuccess;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent
        className="change-confirmation"
        showCloseButton={false}
        finalFocus={finalFocus}
      >
        <DialogTitle>
          {returned ? "退回修改" : "接受交付"} · D
          {selection.snapshot.deliveryNo}
        </DialogTitle>
        <DialogDescription>
          CR {current.changeRequestId.slice(0, 8)} / 批准版本 v
          {selection.snapshot.versionNo}。请核对本次交付；保存后不可撤销此决定。
        </DialogDescription>
        <DeliveryContent delivery={selection.snapshot} />
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => {
            if (!blocked) mutation.mutate(v);
          })}
        >
          <Field
            id="review-comment"
            label={
              returned
                ? "退回意见（必填，双方可见）"
                : "验收评论（可选，双方可见）"
            }
            error={form.formState.errors.comment?.message}
          >
            <textarea
              id="review-comment"
              className="form-control"
              rows={3}
              {...form.register("comment")}
            />
          </Field>
          {mutation.error && <ErrorNotice error={mutation.error} />}
          {(conflict ||
            uncertain(mutation.error) ||
            !current.capabilities.review.allowed) && (
            <p className="notice">
              输入已保留，当前决定不能再次提交。请关闭并刷新核对验收记录。
            </p>
          )}
          <div className="form-actions">
            <Button type="submit" disabled={blocked}>
              {mutation.isPending
                ? "正在保存…"
                : returned
                  ? "确认退回"
                  : "确认接受"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              关闭
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
