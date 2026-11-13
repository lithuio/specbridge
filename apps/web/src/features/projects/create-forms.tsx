"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/shared/async-state";
import { ApiError } from "@/lib/api/client";
import { useProjectApi, useWorkspaces } from "./queries";
import { Field, nameSchema } from "./shared";
import { WorkspacePicker } from "./workspace-picker";

const workspaceSchema = z.object({ name: nameSchema });
const projectSchema = z.object({
  workspaceId: z.uuid("请选择工作空间"),
  name: nameSchema,
  baselineScope: z
    .string()
    .trim()
    .min(1, "请填写初始范围")
    .refine(
      (v) => Array.from(v).length <= 20_000,
      "初始范围最多 20,000 个字符",
    ),
});
// A lost response or server failure may have happened after commit. Creation is
// not idempotent: require checking the list rather than resending the same form.
function uncertain(error: unknown) {
  return !!error && (!(error instanceof ApiError) || error.status >= 500);
}

export function CreateWorkspace() {
  const { api, queryClient, key } = useProjectApi();
  const router = useRouter();
  const form = useForm<z.infer<typeof workspaceSchema>>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "" },
  });
  const resetAfterSuccess = useRef(false);
  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof workspaceSchema>) =>
      api("post", "/api/v1/workspaces", { body }),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: key("workspaces") }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key("dashboard") }),
        queryClient.invalidateQueries({ queryKey: key("audit") }),
      ]);
      await queryClient.invalidateQueries({ queryKey: key("workspaces") });
      resetAfterSuccess.current = true;
      router.push(`/app/projects?workspaceId=${result.data.id}`);
    },
  });
  const resetForm = form.reset;
  const resetMutation = mutation.reset;
  useLayoutEffect(
    () => () => {
      if (resetAfterSuccess.current) {
        resetAfterSuccess.current = false;
        resetForm({ name: "" });
        resetMutation();
      }
    },
    [resetForm, resetMutation],
  );
  const disabled =
    mutation.isPending || mutation.isSuccess || uncertain(mutation.error);
  return (
    <div className="narrow-page">
      <Link className="text-link" href="/app/projects">
        ← 我的项目
      </Link>
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / 供应方协作</p>
        <h1>创建工作空间</h1>
        <p>你将成为此空间的负责人，管理项目与供应方成员。</p>
      </div>
      <form
        className="surface-panel"
        noValidate
        onSubmit={form.handleSubmit((v) => {
          if (!disabled) mutation.mutate(v);
        })}
      >
        <Field
          id="name"
          label="空间名称"
          error={form.formState.errors.name?.message}
        >
          <Input
            id="name"
            {...form.register("name")}
            aria-invalid={!!form.formState.errors.name}
            aria-describedby="name-error"
          />
        </Field>
        {mutation.error && <ErrorNotice error={mutation.error} />}
        {uncertain(mutation.error) && (
          <p className="notice">
            创建结果未知。请先
            <Link className="text-link" href="/app/projects">
              返回列表核对
            </Link>
            ，避免重复创建。
          </p>
        )}
        <Button type="submit" disabled={disabled}>
          {mutation.isPending ? "正在创建…" : "创建工作空间"}
        </Button>
      </form>
    </div>
  );
}

export function CreateProject() {
  const params = useSearchParams();
  const pathname = usePathname();
  const target = params.get("workspaceId") ?? "";
  const [workspace, setWorkspace] = useState(target);
  // Hidden Activity pages also receive URL updates. Only a navigation to this
  // creation page can change its scope; another route must not erase its draft.
  if (pathname === "/app/projects/new" && target !== workspace)
    setWorkspace(target);
  return <ProjectForm key={workspace} initialWorkspace={workspace} />;
}

function ProjectForm({ initialWorkspace }: { initialWorkspace: string }) {
  const { api, queryClient, key } = useProjectApi();
  const router = useRouter();
  const spaces = useWorkspaces();
  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      workspaceId: initialWorkspace,
      name: "",
      baselineScope: "",
    },
  });
  const workspaceId = useWatch({ control: form.control, name: "workspaceId" });
  const owner = spaces.data?.pages.some((p) =>
    p.data.some((w) => w.id === workspaceId && w.workspaceRole === "OWNER"),
  );
  const resetAfterSuccess = useRef(false);
  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof projectSchema>) =>
      api("post", "/api/v1/projects", { body }),
    onError: () => queryClient.invalidateQueries({ queryKey: key("projects") }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key("dashboard") }),
        queryClient.invalidateQueries({ queryKey: key("audit") }),
      ]);
      await queryClient.invalidateQueries({ queryKey: key("projects") });
      resetAfterSuccess.current = true;
      router.push(`/app/projects/${result.data.id}`);
    },
  });
  const resetForm = form.reset;
  const resetMutation = mutation.reset;
  // Activity preserves unfinished drafts and uncertain outcomes. Only a known
  // successful creation should become a fresh form when the page is hidden.
  useLayoutEffect(
    () => () => {
      if (resetAfterSuccess.current) {
        resetAfterSuccess.current = false;
        resetForm({
          workspaceId: initialWorkspace,
          name: "",
          baselineScope: "",
        });
        resetMutation();
      }
    },
    [initialWorkspace, resetForm, resetMutation],
  );
  const disabled =
    !owner ||
    mutation.isPending ||
    mutation.isSuccess ||
    uncertain(mutation.error);
  return (
    <div className="narrow-page">
      <Link className="text-link" href="/app/projects">
        ← 我的项目
      </Link>
      <div className="page-heading">
        <p className="eyebrow">PROJECT / 明确协作范围</p>
        <h1>创建项目</h1>
        <p>
          第一步记录初始范围。创建成功后可选上传背景文件，也可继续添加成员与需求。
        </p>
      </div>
      <form
        className="surface-panel"
        noValidate
        onSubmit={form.handleSubmit((v) => {
          if (!disabled) mutation.mutate(v);
        })}
      >
        <WorkspacePicker
          value={workspaceId}
          ownerOnly
          onChange={(id) =>
            form.setValue("workspaceId", id, { shouldValidate: true })
          }
        />
        {!owner && (
          <p className="field-hint">仅能在你担任负责人的工作空间中创建项目。</p>
        )}
        <Field
          id="name"
          label="项目名称"
          error={form.formState.errors.name?.message}
        >
          <Input
            id="name"
            {...form.register("name")}
            aria-invalid={!!form.formState.errors.name}
            aria-describedby="name-error"
          />
        </Field>
        <Field
          id="baselineScope"
          label="初始范围"
          hint="创建后固定，仅作为项目参考，不代表客户已签署或批准。客户可稍后绑定，正式提交变更前必须完成绑定。"
          error={form.formState.errors.baselineScope?.message}
        >
          <textarea
            className="form-control"
            rows={7}
            id="baselineScope"
            {...form.register("baselineScope")}
            aria-invalid={!!form.formState.errors.baselineScope}
            aria-describedby="baselineScope-hint baselineScope-error"
          />
        </Field>
        {mutation.error && <ErrorNotice error={mutation.error} />}
        {uncertain(mutation.error) && (
          <p className="notice">
            创建结果未知。请先
            <Link
              className="text-link"
              href={`/app/projects?workspaceId=${workspaceId}`}
            >
              返回项目列表核对
            </Link>
            ，避免重复创建。
          </p>
        )}
        <Button type="submit" disabled={disabled}>
          {mutation.isPending ? "正在创建…" : "创建项目"}
        </Button>
      </form>
    </div>
  );
}
