"use client";

import { ApiError, errorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export function ErrorNotice({ error }: { error: unknown }) {
  return (
    <div className="notice error" role="alert" aria-label="请求错误">
      <p>{errorMessage(error)}</p>
      {error instanceof ApiError && error.requestId && (
        <small>请求编号：{error.requestId}</small>
      )}
    </div>
  );
}
export function LoadingState({ label = "正在恢复会话…" }: { label?: string }) {
  return (
    <div className="session-state" role="status" aria-busy="true">
      <span className="loading-mark" />
      <p>{label}</p>
    </div>
  );
}
export function RetryState({
  error,
  retry,
  title = "暂时无法恢复会话",
}: {
  error: unknown;
  retry: () => void;
  title?: string;
}) {
  return (
    <main className="session-state">
      <h1>{title}</h1>
      <ErrorNotice error={error} />
      <Button onClick={retry}>重试</Button>
    </main>
  );
}
