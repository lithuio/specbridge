import { ProjectBoundary } from "@/features/projects/project-detail";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProjectBoundary>{children}</ProjectBoundary>;
}
