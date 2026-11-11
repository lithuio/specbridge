import { Suspense } from "react";
import { AuthGate } from "@/features/auth/guard";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/shared/async-state";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </Suspense>
  );
}
