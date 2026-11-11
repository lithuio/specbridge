"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { roleLabel, useProject, type Project } from "./queries";
import { QueryState } from "./shared";

const ProjectContext = createContext<Project | null>(null);
export function useCurrentProject() {
  const project = useContext(ProjectContext);
  if (!project) throw new Error("Project boundary required");
  return project;
}

export function ProjectBoundary({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const query = useProject(projectId);
  const project = query.data;
  if (!project || query.error)
    return (
      <>
        <Link className="text-link" href="/app/projects">
          ← 我的项目
        </Link>
        <QueryState query={query} />
      </>
    );
  const base = `/app/projects/${project.id}`;
  return (
    <ProjectContext.Provider value={project} key={project.id}>
      <Link className="text-link" href="/app/projects">
        ← 我的项目
      </Link>
      <div className="page-heading heading-actions project-heading">
        <div>
          <p className="eyebrow">PROJECT / 项目空间</p>
          <h1>{project.name}</h1>
          <p>
            你在此项目：
            <strong data-testid="project-role">
              {roleLabel[project.projectRole]}
            </strong>
            <span className="role-separator">·</span>
            {project.status === "ACTIVE" ? "进行中" : "已归档"}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          刷新项目
        </Button>
      </div>
      <nav className="project-nav" aria-label="项目导航">
        <Link href={base} aria-current={pathname === base ? "page" : undefined}>
          项目概览
        </Link>
        <Link
          href={`${base}/members`}
          aria-current={pathname === `${base}/members` ? "page" : undefined}
        >
          项目成员
        </Link>
        <Link
          href={`${base}/requirements`}
          aria-current={pathname.startsWith(`${base}/requirements`) ? "page" : undefined}
        >
          项目需求
        </Link>
      </nav>
      {children}
    </ProjectContext.Provider>
  );
}

export function ProjectOverview() {
  const project = useCurrentProject();
  const client = project.members.find((m) => m.role === "CLIENT");
  const developers = project.members.filter((m) => m.role === "DEVELOPER");
  return (
    <div className="project-detail-grid">
      <section className="surface-panel" aria-labelledby="scope-title">
        <p className="panel-kicker">BASELINE SCOPE</p>
        <h2 id="scope-title">初始范围</h2>
        <p className="muted-copy">创建后固定 · 项目参考，不代表客户正式签署</p>
        <div className="scope-content">{project.baselineScope}</div>
      </section>
      <aside className="stack-panels">
        <section className="surface-panel">
          <h2>协作成员</h2>
          <dl className="facts-list">
            <dt>供应方负责人</dt>
            <dd>{project.owner.displayName}</dd>
            <dt>开发成员</dt>
            <dd>
              {developers.length
                ? developers.map((m) => m.displayName).join("、")
                : "尚未分配"}
            </dd>
            <dt>唯一客户</dt>
            <dd>{client?.displayName ?? "尚未绑定"}</dd>
          </dl>
          <Link
            className="text-link"
            href={`/app/projects/${project.id}/members`}
          >
            {project.projectRole === "OWNER" ? "管理项目成员" : "查看项目成员"}{" "}
            →
          </Link>
        </section>
        <section className="surface-panel guidance-panel">
          <h2>
            {project.clientAssignmentLocked
              ? "客户绑定已锁定"
              : client
                ? "协作账号已就绪"
                : "下一步：绑定客户"}
          </h2>
          <p>
            {project.clientAssignmentLocked
              ? "此项目已有正式提交历史，为保留审批身份与历史一致性，不可更换客户账号。"
              : client
                ? "正式提交前，负责人可更正客户账号；首次提交后绑定将锁定。"
                : "负责人需绑定一个已注册客户账号，之后才能正式提交变更。"}
          </p>
        </section>
      </aside>
    </div>
  );
}
