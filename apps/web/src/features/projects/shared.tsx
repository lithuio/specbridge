"use client";

import type { ReactNode } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/shared/async-state";
import { pageSize } from "./queries";

export const nameSchema = z
  .string()
  .trim()
  .min(1, "请输入名称")
  .refine((v) => Array.from(v).length <= 100, "名称最多 100 个字符");
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("请输入有效的已注册邮箱").max(254, "邮箱地址过长"));

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function QueryState({
  query,
}: {
  query: { isPending: boolean; error: unknown; refetch: () => unknown };
}) {
  if (query.error)
    return (
      <div className="query-state">
        <ErrorNotice error={query.error} />
        <Button variant="outline" onClick={() => void query.refetch()}>
          重新加载
        </Button>
      </div>
    );
  if (query.isPending)
    return (
      <div className="query-state" role="status" aria-busy="true">
        正在加载…
      </div>
    );
  return null;
}

export function Pagination({
  offset,
  hasMore,
  pending,
  onChange,
}: {
  offset: number;
  hasMore: boolean;
  pending: boolean;
  onChange: (offset: number) => void;
}) {
  if (offset === 0 && !hasMore) return null;
  return (
    <nav className="pagination" aria-label="列表分页">
      <Button
        variant="outline"
        disabled={!offset || pending}
        onClick={() => onChange(Math.max(0, offset - pageSize))}
      >
        上一页
      </Button>
      <span>第 {Math.floor(offset / pageSize) + 1} 页</span>
      <Button
        variant="outline"
        disabled={!hasMore || pending}
        onClick={() => onChange(offset + pageSize)}
      >
        下一页
      </Button>
    </nav>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
