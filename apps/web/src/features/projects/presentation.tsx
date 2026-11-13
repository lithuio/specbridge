import {
  Activity,
  FileText,
  Files,
  FolderOpen,
  GitPullRequestArrow,
  PackageCheck,
  Users,
} from "lucide-react";

// Visual identity only: deterministic across pages/sessions; never a role/status.
export function projectTone(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ["indigo", "teal", "violet", "amber", "rose", "blue"][hash % 6];
}

export const projectSections = [
  { path: "", label: "项目概览", icon: FolderOpen, tone: "indigo" },
  { path: "/documents", label: "背景资料", icon: Files, tone: "teal" },
  { path: "/members", label: "项目成员", icon: Users, tone: "violet" },
  { path: "/requirements", label: "项目需求", icon: FileText, tone: "blue" },
  {
    path: "/changes",
    label: "变更与审批",
    icon: GitPullRequestArrow,
    tone: "amber",
  },
  {
    path: "/deliveries",
    label: "交付与验收",
    icon: PackageCheck,
    tone: "teal",
  },
  { path: "/audit", label: "活动记录", icon: Activity, tone: "rose" },
] as const;
