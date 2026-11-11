"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaces, roleLabel } from "./queries";
import { QueryState } from "./shared";

export function WorkspacePicker({
  value,
  onChange,
  ownerOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ownerOnly?: boolean;
}) {
  const query = useWorkspaces();
  const spaces = query.data?.pages.flatMap((p) => p.data) ?? [];
  const options = spaces.filter(
    (w) => !ownerOnly || w.workspaceRole === "OWNER",
  );
  return (
    <div className="workspace-picker">
      <label htmlFor="workspace-picker">
        {ownerOnly ? "所属工作空间" : "工作空间"}
      </label>
      <select
        id="workspace-picker"
        className="form-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={query.isPending}
      >
        <option value="">
          {ownerOnly ? "请选择你负责的空间" : "我的全部项目（含客户项目）"}
        </option>
        {value && !options.some((w) => w.id === value) && (
          <option value={value}>当前空间筛选</option>
        )}
        {options.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} · {roleLabel[w.workspaceRole]}
          </option>
        ))}
      </select>
      <QueryState query={query} />
      {query.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          加载更多工作空间
        </Button>
      )}
      {!query.isPending && !query.error && !spaces.length && (
        <p className="field-hint">
          尚未加入供应方工作空间。客户可直接从“我的全部项目”进入。
        </p>
      )}
      <Link className="secondary-link" href="/app/workspaces/new">
        <Plus size={16} aria-hidden="true" />
        创建工作空间
      </Link>
    </div>
  );
}
