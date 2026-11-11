"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./provider";
import { loginReturnPath } from "./return-path";
import { LoadingState, RetryState } from "@/components/shared/async-state";

export function AuthGate({
  children,
  publicOnly = false,
}: {
  children: React.ReactNode;
  publicOnly?: boolean;
}) {
  const { status, error, store, runtime } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (publicOnly && status === "authenticated")
      router.replace(loginReturnPath(window.location.search));
    if (!publicOnly && status === "anonymous")
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, publicOnly, router, pathname]);
  if (status === "logout-failed")
    return (
      <RetryState
        error={error}
        retry={() => void store.logout()}
        title="退出尚未确认，请重试"
      />
    );
  if (status === "unavailable")
    return <RetryState error={error} retry={() => void store.restore()} />;
  if (status === "restoring" || status === "signing-out")
    return (
      <LoadingState
        label={status === "signing-out" ? "正在退出…" : undefined}
      />
    );
  if (publicOnly)
    return status === "anonymous" ? (
      children
    ) : (
      <LoadingState label="正在进入工作概览…" />
    );
  return status === "authenticated" ? (
    <div key={runtime.epoch}>{children}</div>
  ) : (
    <LoadingState label="正在前往登录…" />
  );
}
