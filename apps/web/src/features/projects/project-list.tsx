"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, FolderOpen, Plus } from "lucide-react";
import { useProjects, useWorkspaces, roleLabel } from "./queries";
import { EmptyState, Pagination, QueryState } from "./shared";
import { WorkspacePicker } from "./workspace-picker";

export function ProjectList() {
  const params = useSearchParams();
  const router = useRouter();
  const workspaceId = params.get("workspaceId") ?? "";
  const rawOffset = Number(params.get("offset") ?? 0);
  const offset =
    Number.isSafeInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 1_000_000
      ? rawOffset
      : 0;
  const query = useProjects(workspaceId, offset);
  const spaces = useWorkspaces();
  const selected = spaces.data?.pages
    .flatMap((p) => p.data)
    .find((w) => w.id === workspaceId);
  const hasOwner = spaces.data?.pages.some((p) =>
    p.data.some((w) => w.workspaceRole === "OWNER"),
  );
  function navigate(space: string, start = 0) {
    const search = new URLSearchParams();
    if (space) search.set("workspaceId", space);
    if (start) search.set("offset", String(start));
    router.push(`/app/projects${search.size ? `?${search}` : ""}`);
  }
  return (
    <>
      <div className="page-heading heading-actions">
        <div>
          <p className="eyebrow">PROJECTS / 协作入口</p>
          <h1>我的项目</h1>
          <p>从你参与的项目开始。每个项目的身份与权限独立确定。</p>
        </div>
        {(selected?.workspaceRole === "OWNER" ||
          (!workspaceId && hasOwner)) && (
          <Link
            className="primary-link"
            href={`/app/projects/new${workspaceId ? `?workspaceId=${workspaceId}` : ""}`}
          >
            <Plus size={18} />
            创建项目
          </Link>
        )}
      </div>
      <section className="surface-panel scope-panel" aria-label="项目范围">
        <WorkspacePicker value={workspaceId} onChange={(id) => navigate(id)} />
        {selected?.workspaceRole === "OWNER" && (
          <Link
            className="text-link"
            href={`/app/settings/members?workspaceId=${selected.id}`}
          >
            管理供应方成员 →
          </Link>
        )}
      </section>
      <QueryState query={query} />
      {query.data && !query.error && (
        <>
          {!query.data.data.length ? (
            <EmptyState>
              <FolderOpen aria-hidden="true" />
              <h2>
                {workspaceId ? "当前筛选下没有项目" : "还没有获授权的项目"}
              </h2>
              <p>负责人可创建项目；开发成员和客户需由负责人分配后进入。</p>
            </EmptyState>
          ) : (
            <div className="project-grid">
              {query.data.data.map((project) => (
                <Link
                  className="project-card"
                  href={`/app/projects/${project.id}`}
                  key={project.id}
                >
                  <div className="section-heading">
                    <span className="project-icon">
                      <FolderOpen size={22} aria-hidden="true" />
                    </span>
                    <span className="status-badge">
                      {project.status === "ACTIVE" ? "进行中" : "已归档"}
                    </span>
                  </div>
                  <h2>{project.name}</h2>
                  <p>
                    你在此项目：
                    <strong>{roleLabel[project.projectRole]}</strong>
                  </p>
                  <div className="project-card-footer">
                    <span>进入项目</span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Pagination
            offset={offset}
            hasMore={query.data.meta.hasMore}
            pending={query.isFetching}
            onChange={(start) => navigate(workspaceId, start)}
          />
        </>
      )}
    </>
  );
}
