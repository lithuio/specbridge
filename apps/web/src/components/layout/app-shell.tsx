"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  BookOpen,
  X,
  FolderOpen,
} from "lucide-react";
import { ProjectNavigation } from "./project-navigation";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useSession } from "@/features/auth/provider";
import { ProjectCopilot } from "@/features/copilot/copilot";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, store } = useSession();
  const pathname = usePathname();
  const section = pathname.startsWith("/app/settings")
    ? "供应方成员"
    : pathname.startsWith("/app/workspaces")
      ? "创建工作空间"
      : pathname.startsWith("/app/projects")
        ? "我的项目"
        : "工作概览";
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const navigation = (
    <nav aria-label="主导航">
      <Link
        className={`nav-item${pathname === "/app" ? " active" : ""}`}
        href="/app"
        aria-label="工作概览"
        aria-current={pathname === "/app" ? "page" : undefined}
        onClick={() => setDrawer(false)}
      >
        <LayoutDashboard size={19} aria-hidden="true" />
        <span className="nav-label">工作概览</span>
      </Link>
      <Link
        className={`nav-item${pathname.startsWith("/app/projects") ? " active" : ""}`}
        href="/app/projects"
        aria-label="我的项目"
        aria-current={pathname.startsWith("/app/projects") ? "page" : undefined}
        onClick={() => setDrawer(false)}
      >
        <FolderOpen size={19} aria-hidden="true" />
        <span className="nav-label">我的项目</span>
      </Link>
    </nav>
  );
  const account = (
    <div className="sidebar-account">
      <span className="avatar" aria-hidden="true">
        {user?.displayName.slice(0, 1)}
      </span>
      <div className="account-name">
        <strong>{user?.displayName}</strong>
        <span>个人账号</span>
      </div>
      <Button
        variant="ghost"
        aria-label="退出登录"
        onClick={() => void store.logout()}
      >
        <LogOut aria-hidden="true" />
      </Button>
    </div>
  );
  return (
    <div className={`app-shell${collapsed ? " is-collapsed" : ""}`}>
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Link
          href="/app"
          className="sidebar-brand"
          aria-label="SpecBridge 需求 · 确认 · 交付，工作概览"
        >
          <Brand compact={collapsed} />
        </Link>
        <p className="nav-caption">协作空间</p>
        <div className="sidebar-scroll">
          {navigation}
          <ProjectNavigation onNavigate={() => setDrawer(false)} />
        </div>
        <div className="sidebar-bottom">
          <Link
            className="nav-item"
            href="/app#workflow-guide"
            aria-label="使用说明"
          >
            <BookOpen size={19} aria-hidden="true" />
            <span className="nav-label">使用说明</span>
          </Link>
          {account}
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <div className="header-context">
            <Button
              className="collapse-toggle"
              variant="ghost"
              aria-label={collapsed ? "展开导航" : "折叠导航"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
            <Dialog open={drawer} onOpenChange={setDrawer}>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    className="mobile-menu"
                    aria-label="打开导航"
                  />
                }
              >
                <Menu />
              </DialogTrigger>
              <DialogContent
                className="nav-drawer"
                placement="drawer"
                showCloseButton={false}
              >
                <DialogTitle>
                  <Brand />
                </DialogTitle>
                <DialogDescription>工作空间导航</DialogDescription>
                <DialogClose
                  render={
                    <Button
                      className="drawer-close"
                      variant="ghost"
                      aria-label="关闭导航"
                    />
                  }
                >
                  <X />
                </DialogClose>
                <div className="sidebar-scroll">
                  {navigation}
                  <ProjectNavigation onNavigate={() => setDrawer(false)} />
                </div>
                <div className="drawer-account">{account}</div>
              </DialogContent>
            </Dialog>
            <span>协作空间</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{section}</strong>
          </div>
          <div className="header-actions">
            <ProjectCopilot />
            <Link
              className="header-account"
              href="/app#account-session"
              title="查看当前账号"
            >
              <span className="connection-dot" />
              {user?.displayName}
            </Link>
          </div>
        </header>
        <main id="main-content" className="app-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          SpecBridge <span>让每一次确认，都有记录。</span>
        </footer>
      </div>
    </div>
  );
}
