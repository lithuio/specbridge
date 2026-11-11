"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useCurrentProject } from "@/features/projects/project-detail";
import { useProjectApi } from "@/features/projects/queries";
import {
  EmptyState,
  Field,
  Pagination,
  QueryState,
} from "@/features/projects/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/shared/async-state";
import {
  capabilityReason,
  requirementPath,
  statusLabel,
  uncertain,
  useRequirements,
} from "./queries";
import { draftSchema, offsetValue } from "./shared";

export function RequirementList() {
  const project = useCurrentProject();
  const params = useSearchParams();
  const router = useRouter();
  const offset = offsetValue(params.get("offset"));
  const query = useRequirements(project.id, offset);
  const base = `/app/projects/${project.id}/requirements`;
  return (
    <>
      <div className="page-heading heading-actions">
        <div>
          <p className="eyebrow">REQUIREMENTS / 需求与范围</p>
          <h2>项目需求</h2>
          <p>保留原始诉求，通过问答澄清，再形成不可变的规格版本。</p>
        </div>
        {project.capabilities.createRequirement.allowed && (
          <Link className="primary-link" href={`${base}/new`}>
            创建需求
          </Link>
        )}
      </div>
      <QueryState query={query} />
      {query.data && !query.error && (
        <>
          {!query.data.data.length ? (
            <EmptyState>
              <h3>还没有需求</h3>
              <p>从一个需要解决的问题开始，记录期望的结果。</p>
            </EmptyState>
          ) : (
            <div className="surface-panel requirement-list">
              {query.data.data.map((r) => (
                <Link
                  className="requirement-row"
                  key={r.id}
                  href={requirementPath(project.id, r.id)}
                >
                  <div>
                    <h3>{r.title}</h3>
                    <p className="record-meta">
                      {r.id.slice(0, 8)} ·{" "}
                      {r.latestRevisionNo
                        ? `Revision ${r.latestRevisionNo}`
                        : "尚无规格版本"}
                    </p>
                  </div>
                  <span className="status-badge" data-state={r.status}>
                    {statusLabel[r.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Pagination
            offset={offset}
            hasMore={query.data.meta.hasMore}
            pending={query.isFetching}
            onChange={(start) =>
              router.push(`${base}${start ? `?offset=${start}` : ""}`)
            }
          />
        </>
      )}
    </>
  );
}

export function CreateRequirement() {
  const project = useCurrentProject();
  const { api, key, queryClient } = useProjectApi();
  const router = useRouter();
  const base = `/app/projects/${project.id}/requirements`;
  const form = useForm<z.infer<typeof draftSchema>>({
    resolver: zodResolver(draftSchema),
    defaultValues: { title: "", originalText: "" },
  });
  const resetAfterSuccess = useRef(false);
  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof draftSchema>) =>
      api("post", "/api/v1/projects/{id}/requirements", {
        path: { id: project.id },
        body,
      }),
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: key("requirements", project.id),
      }),
    onSuccess: async ({ data }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key("dashboard") }),
        queryClient.invalidateQueries({ queryKey: key("audit") }),
      ]);
      await queryClient.invalidateQueries({
        queryKey: key("requirements", project.id),
      });
      resetAfterSuccess.current = true;
      router.push(requirementPath(project.id, data.id));
    },
  });
  const resetForm = form.reset;
  const resetMutation = mutation.reset;
  // Next Activity retains this page. Clear only a confirmed successful creation
  // when it is hidden; keep drafts and unknown outcomes across back/forward.
  useLayoutEffect(
    () => () => {
      if (resetAfterSuccess.current) {
        resetAfterSuccess.current = false;
        resetForm({ title: "", originalText: "" });
        resetMutation();
      }
    },
    [resetForm, resetMutation],
  );
  const disabled =
    mutation.isPending ||
    mutation.isSuccess ||
    uncertain(mutation.error) ||
    !project.capabilities.createRequirement.allowed;
  return (
    <div className="narrow-page">
      <Link className="text-link" href={base}>
        ← 项目需求
      </Link>
      <div className="page-heading">
        <p className="eyebrow">NEW REQUIREMENT</p>
        <h2>创建需求</h2>
        <p>描述你想解决的问题。草稿阶段，作者和负责人可修改原文。</p>
      </div>
      <form
        className="surface-panel"
        noValidate
        onSubmit={form.handleSubmit((v) => {
          if (!disabled) mutation.mutate(v);
        })}
      >
        <Field
          id="title"
          label="需求标题"
          error={form.formState.errors.title?.message}
        >
          <Input
            id="title"
            {...form.register("title")}
            aria-invalid={!!form.formState.errors.title}
            aria-describedby="title-error"
          />
        </Field>
        <Field
          id="originalText"
          label="需求原文"
          error={form.formState.errors.originalText?.message}
        >
          <textarea
            className="form-control"
            id="originalText"
            rows={8}
            {...form.register("originalText")}
            aria-invalid={!!form.formState.errors.originalText}
            aria-describedby="originalText-error"
          />
        </Field>
        {mutation.error && <ErrorNotice error={mutation.error} />}
        {!project.capabilities.createRequirement.allowed && (
          <p className="notice">
            {capabilityReason(project.capabilities.createRequirement)}
          </p>
        )}
        {uncertain(mutation.error) && (
          <p className="notice">
            创建结果未知。请先
            <Link className="text-link" href={base}>
              返回需求列表核对
            </Link>
            ，避免重复创建。
          </p>
        )}
        <Button type="submit" disabled={disabled}>
          {mutation.isPending ? "正在创建…" : "创建需求"}
        </Button>
      </form>
    </div>
  );
}
