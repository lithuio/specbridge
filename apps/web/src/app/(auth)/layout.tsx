import { Suspense } from "react";
import { AuthGate } from "@/features/auth/guard";
import { LoadingState } from "@/components/shared/async-state";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuthGate publicOnly>{children}</AuthGate>
    </Suspense>
  );
}
