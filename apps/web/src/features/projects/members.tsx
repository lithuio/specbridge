"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/shared/async-state";
import { ApiError } from "@/lib/api/client";
import { useMembers, useProjectApi, useWorkspaces, roleLabel } from "./queries";
import { useCurrentProject } from "./project-detail";
import {
  emailSchema,
  EmptyState,
  Field,
  Pagination,
  QueryState,
} from "./shared";

const schema = z.object({ email: emailSchema });

function EmailForm({
  label,
  submitLabel,
  hint,
  save,
  afterSave,
  locked = false,
}: {
  label: string;
  submitLabel: string;
  hint: string;
  locked?: boolean;
  save: (email: string) => Promise<unknown>;
  afterSave: () => Promise<unknown>;
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const mutation = useMutation({
    mutationFn: ({ email }: z.infer<typeof schema>) => save(email),
    onSuccess: async () => {
      form.reset();
      await afterSave();
    },
    onError: async (error) => {
      // A concurrent first Submit can invalidate the loaded bind capability.
      // Keep the input while replacing it with the authoritative lock state.
      if (
        error instanceof ApiError &&
        error.code === "CLIENT_ASSIGNMENT_LOCKED"
      )
        await afterSave();
    },
  });
  return (
    <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
      <Field
        id="email"
        label={label}
        hint={hint}
        error={form.formState.errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="off"
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
          aria-describedby="email-hint email-error"
          disabled={locked || mutation.isPending}
        />
      </Field>
      {mutation.error && <ErrorNotice error={mutation.error} />}
      {mutation.isSuccess && (
        <p className="notice" role="status">
          已保存，成员信息已更新。
        </p>
      )}
      <Button type="submit" disabled={locked || mutation.isPending}>
        {mutation.isPending ? "正在保存…" : submitLabel}
      </Button>
    </form>
  );
}

export function WorkspaceMembers() {
  const params = useSearchParams();
  const workspaceId = params.get("workspaceId") ?? "";
  return <WorkspaceMemberList key={workspaceId} workspaceId={workspaceId} />;
}

function WorkspaceMemberList({ workspaceId }: { workspaceId: string }) {
  const [offset, setOffset] = useState(0);
  const query = useMembers(workspaceId, offset);
  const spaces = useWorkspaces();
  const name = spaces.data?.pages
    .flatMap((p) => p.data)
    .find((w) => w.id === workspaceId)?.name;
  const { api, queryClient, key } = useProjectApi();
  return (
    <>
      <Link
        className="text-link"
        href={`/app/projects${workspaceId ? `?workspaceId=${workspaceId}` : ""}`}
      >
        ← 返回项目列表
      </Link>
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / {name ?? "供应方协作"}</p>
        <h1>供应方成员</h1>
        <p>
          只有此工作空间的负责人可以管理成员。加入空间后，仍需单独分配项目。
        </p>
      </div>
      {!workspaceId ? (
        <EmptyState>
          请先在
          <Link className="text-link" href="/app/projects">
            项目列表选择工作空间
          </Link>
          。
        </EmptyState>
      ) : (
        <>
          <QueryState query={query} />
          {query.data && !query.error && (
            <div className="project-detail-grid">
              <section className="surface-panel">
                <h2>空间成员</h2>
                <ul className="people-list">
                  {query.data.data.map((member) => (
                    <li key={member.id}>
                      <span className="avatar" aria-hidden="true">
                        {member.displayName.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{member.displayName}</strong>
                        <p data-testid="member-email">{member.email}</p>
                      </div>
                      <span className="role-badge">
                        {roleLabel[member.role]}
                      </span>
                    </li>
                  ))}
                </ul>
                <Pagination
                  offset={offset}
                  hasMore={query.data.meta.hasMore}
                  pending={query.isFetching}
                  onChange={setOffset}
                />
              </section>
              <section className="surface-panel">
                <h2>添加开发成员</h2>
                <p className="muted-copy">
                  客户通过项目内的独立入口绑定，不加入供应方空间。
                </p>
                <EmailForm
                  label="开发成员邮箱"
                  submitLabel="添加到工作空间"
                  hint="使用已注册邮箱；此操作不会发送邮件邀请。"
                  save={(email) =>
                    api("post", "/api/v1/workspaces/{id}/members", {
                      path: { id: workspaceId },
                      body: { email },
                    })
                  }
                  afterSave={() =>
                    queryClient.invalidateQueries({
                      queryKey: key("workspace-members", workspaceId),
                    })
                  }
                />
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function ProjectMembers() {
  const project = useCurrentProject();
  const { api, queryClient, key } = useProjectApi();
  const client = project.members.find((m) => m.role === "CLIENT");
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: key("project", project.id) });
  return (
    <div className="stack-panels">
      <section className="surface-panel">
        <div className="section-heading">
          <h2>项目协作成员</h2>
          <span className="guide-label">权限仅对当前项目生效</span>
        </div>
        <ul className="people-list">
          {[
            project.owner,
            ...project.members.filter((m) => m.userId !== project.owner.userId),
          ].map((member) => (
            <li key={member.userId}>
              <span className="avatar" aria-hidden="true">
                {member.displayName.slice(0, 1)}
              </span>
              <strong>{member.displayName}</strong>
              <span className="role-badge">{roleLabel[member.role]}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="member-management-grid">
        {project.capabilities.assignDeveloper.allowed && <AssignDeveloper />}
        <section className="surface-panel" aria-labelledby="client-title">
          <p className="panel-kicker">CLIENT / 唯一审批账号</p>
          <h2 id="client-title">客户绑定</h2>
          <p className="muted-copy">
            当前客户：<strong>{client?.displayName ?? "尚未绑定"}</strong>
          </p>
          {project.clientAssignmentLocked && (
            <p className="notice" role="status">
              客户绑定已锁定：项目已有正式提交历史，不可更换客户账号，确保审批记录可追溯。
            </p>
          )}
          {!client && (
            <p className="notice">正式提交变更前，负责人必须先绑定唯一客户。</p>
          )}
          {project.projectRole === "OWNER" ? (
            <EmailForm
              label="客户邮箱"
              submitLabel={client ? "更正客户绑定" : "绑定客户"}
              hint={
                project.clientAssignmentLocked
                  ? "当前客户身份已固定。下方输入不可提交，已有审批历史保持不变。"
                  : client
                    ? "首次正式提交前可更正。保存后将替换当前客户账号，原客户将失去此项目访问权限；不会新增第二位客户。"
                    : "填写已注册客户邮箱。客户不能是本空间的供应方成员。"
              }
              locked={!project.capabilities.bindClient.allowed}
              save={(email) =>
                api("put", "/api/v1/projects/{id}/client", {
                  path: { id: project.id },
                  body: { email },
                })
              }
              afterSave={refresh}
            />
          ) : (
            <p className="field-hint">
              只有此项目的负责人可以分配开发成员或更正客户绑定。
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function AssignDeveloper() {
  const project = useCurrentProject();
  const [offset, setOffset] = useState(0);
  const query = useMembers(project.workspaceId, offset);
  const { api, queryClient, key } = useProjectApi();
  const mutation = useMutation({
    mutationFn: (userId: string) =>
      api("post", "/api/v1/projects/{id}/members", {
        path: { id: project.id },
        body: { userId, role: "DEVELOPER" },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: key("project", project.id) }),
  });
  const candidates =
    query.data?.data.filter((m) => m.role === "DEVELOPER") ?? [];
  return (
    <section className="surface-panel">
      <p className="panel-kicker">DEVELOPER / 项目分配</p>
      <h2>分配开发成员</h2>
      <p className="muted-copy">从本工作空间的开发成员中选择。</p>
      <Link
        className="text-link"
        href={`/app/settings/members?workspaceId=${project.workspaceId}`}
      >
        管理供应方成员 →
      </Link>
      <QueryState query={query} />
      {query.data && !query.error && (
        <>
          {!candidates.length && (
            <p className="field-hint">
              本页没有可分配的开发成员。可翻页查找或先添加供应方成员。
            </p>
          )}
          <ul className="people-list">
            {candidates.map((member) => {
              const assigned = project.members.some(
                (m) => m.userId === member.userId,
              );
              return (
                <li key={member.id}>
                  <div>
                    <strong>{member.displayName}</strong>
                    <p data-testid="member-email">{member.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    aria-label={`${assigned ? "已分配" : "分配"} ${member.displayName}`}
                    disabled={assigned || mutation.isPending}
                    onClick={() => mutation.mutate(member.userId)}
                  >
                    {assigned ? "已分配" : "分配"}
                  </Button>
                </li>
              );
            })}
          </ul>
          <Pagination
            offset={offset}
            hasMore={query.data.meta.hasMore}
            pending={query.isFetching}
            onChange={setOffset}
          />
        </>
      )}
      {mutation.error && <ErrorNotice error={mutation.error} />}
      {mutation.isSuccess && (
        <p className="notice" role="status">
          开发成员已分配至此项目。
        </p>
      )}
    </section>
  );
}
