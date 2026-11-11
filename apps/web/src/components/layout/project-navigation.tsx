"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, FolderOpen } from "lucide-react";
import { useProjects } from "@/features/projects/queries";
import { projectSections, projectTone } from "@/features/projects/presentation";
import { RefreshButton } from "@/components/shared/refresh-button";

export function ProjectNavigation({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  // Reuse the same authorized, session-scoped first page as the project list.
  const query = useProjects("", 0);
  return (
    <nav className="sidebar-projects" aria-label="项目快捷导航">
      <div className="sidebar-section-heading">
        <span>项目空间</span>
        <Link href="/app/projects" onClick={onNavigate}>
          查看全部
        </Link>
      </div>
      {query.isPending && (
        <p className="sidebar-hint" role="status">
          正在加载项目…
        </p>
      )}
      {query.error ? (
        <div className="sidebar-query-error">
          <p className="sidebar-hint">暂时无法加载项目</p>
          <RefreshButton
            label="刷新侧栏项目"
            busy={query.isFetching}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          />
        </div>
      ) : query.data?.data.length === 0 ? (
        <p className="sidebar-hint">
          参与的项目会显示在这里。从“我的项目”开始协作。
        </p>
      ) : (
        query.data?.data.map((project) => {
          const base = `/app/projects/${project.id}`;
          const active = pathname === base || pathname.startsWith(`${base}/`);
          return (
            <details
              className="sidebar-project"
              key={project.id}
              open={active}
              data-tone={projectTone(project.id)}
            >
              <summary title={project.name}>
                <span className="project-swatch">
                  <FolderOpen size={16} aria-hidden="true" />
                </span>
                <span className="sidebar-project-name">{project.name}</span>
                <ChevronRight
                  className="project-chevron"
                  size={14}
                  aria-hidden="true"
                />
              </summary>
              <div className="sidebar-project-links">
                {projectSections.map(({ path, label, icon: Icon, tone }) => {
                  const href = `${base}${path}`;
                  const current = path
                    ? pathname === href || pathname.startsWith(`${href}/`)
                    : pathname === href;
                  return (
                    <Link
                      key={path}
                      href={href}
                      aria-label={`${project.name} · ${label}`}
                      aria-current={current ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <Icon
                        size={16}
                        className="section-icon"
                        data-tone={tone}
                        aria-hidden="true"
                      />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })
      )}
      {!query.error && query.data?.meta.hasMore && (
        <Link
          className="sidebar-more"
          href="/app/projects"
          onClick={onNavigate}
        >
          更多项目 →
        </Link>
      )}
    </nav>
  );
}
