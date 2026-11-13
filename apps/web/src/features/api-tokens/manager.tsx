"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useCurrentProject } from "@/features/projects/project-detail";
import { pageSize, useProjectApi } from "@/features/projects/queries";
import { EmptyState, Pagination, QueryState } from "@/features/projects/shared";
import { ConnectionsPanel } from "./connections";

export function ApiTokensPage() {
  const project = useCurrentProject();
  // Unmount secrets when a previously authorized account loses its Owner role.
  return project.capabilities.manageApiTokens.allowed ? (
    <div key={project.id}>
      <TokenManager />
      <ConnectionsPanel />
    </div>
  ) : (
    <p className="notice">仅项目负责人可管理访问凭据。</p>
  );
}

function TokenManager() {
  const project = useCurrentProject();
  const { api, key } = useProjectApi();
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: key("api-tokens", project.id, offset),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/projects/{id}/api-tokens", {
        path: { id: project.id },
        query: { offset, limit: pageSize },
        signal,
      }),
  });
  const [name, setName] = useState("");
  const [days, setDays] = useState(30);
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [unknownCreation, setUnknownCreation] = useState(false);
  const [error, setError] = useState("");
  const [revoke, setRevoke] = useState<{ id: string; name: string } | null>(
    null,
  );
  const secretInput = useRef<HTMLInputElement>(null);
  const operation = useRef<AbortController | null>(null);
  const ids = useId();
  function clearSecret() {
    // Activity preserves hidden DOM; clear its value synchronously as well as state.
    if (secretInput.current) secretInput.current.value = "";
    setSecret("");
    setCopied(false);
  }
  useLayoutEffect(() => {
    const discard = () => {
      operation.current?.abort();
      operation.current = null;
      if (secretInput.current) secretInput.current.value = "";
      setSecret("");
      setCopied(false);
      setPending(false);
      setRevoke(null);
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") discard();
    };
    if (query.error) discard();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", discard);
    return () => {
      discard();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", discard);
    };
  }, [query.error]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (pending || unknownCreation || query.error) return;
    clearSecret();
    setError("");
    setPending(true);
    setUnknownCreation(true);
    const controller = new AbortController();
    operation.current = controller;
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      // Deliberately bypass mutation/query caches: only this component owns the plaintext.
      const result = await api("post", "/api/v1/projects/{id}/api-tokens", {
        path: { id: project.id },
        body: { name, expiresInDays: days },
        signal: controller.signal,
      });
      if (operation.current !== controller || controller.signal.aborted) return;
      setUnknownCreation(false);
      setSecret(result.data.token);
      setName("");
      void query.refetch();
    } catch (e) {
      if (operation.current !== controller) return;
      if (
        e instanceof ApiError &&
        [400, 403, 404, 409, 422, 429].includes(e.status)
      )
        setUnknownCreation(false);
      setError(errorMessage(e));
      void query.refetch();
    } finally {
      clearTimeout(timer);
      if (operation.current === controller) {
        operation.current = null;
        setPending(false);
      }
    }
  }
  async function confirmRevoke() {
    if (!revoke || pending) return;
    clearSecret();
    setError("");
    setPending(true);
    const controller = new AbortController();
    operation.current = controller;
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      await api("delete", "/api/v1/api-tokens/{id}", {
        path: { id: revoke.id },
        signal: controller.signal,
      });
      if (operation.current !== controller) return;
      setRevoke(null);
      void query.refetch();
    } catch (e) {
      if (operation.current === controller) {
        setError(errorMessage(e));
        void query.refetch();
      }
    } finally {
      clearTimeout(timer);
      if (operation.current === controller) {
        operation.current = null;
        setPending(false);
      }
    }
  }
  return (
    <>
      <div className="page-heading heading-actions">
        <div>
          <p className="eyebrow">PROJECT ACCESS</p>
          <h2>项目访问凭据</h2>
          <p>为外部助手提供本项目已批准规格的只读访问，可随时撤销。</p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          刷新凭据
        </Button>
      </div>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {unknownCreation && !pending && (
        <section className="surface-panel" role="alert">
          <h3>创建结果需要核对</h3>
          <p>
            请求可能已成功，但明文无法再次取回。请刷新列表，撤销这次创建的凭据后再创建。
          </p>
          <Button variant="outline" onClick={() => setUnknownCreation(false)}>
            已核对列表并处理本次凭据
          </Button>
        </section>
      )}
      <section className="surface-panel">
        <h3>创建只读凭据</h3>
        <p className="muted-copy">
          权限固定为读取已批准规格；不能修改需求、提交变更或审批。明文仅本次显示，关闭、切页、切到后台或刷新后无法恢复。
        </p>
        <form className="grid gap-3" onSubmit={(event) => void create(event)}>
          <label htmlFor={`${ids}-name`}>用途名称</label>
          <input
            id={`${ids}-name`}
            className="form-control"
            required
            maxLength={100}
            value={name}
            autoComplete="off"
            placeholder="例如：本地开发助手"
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor={`${ids}-days`}>有效天数（1–90）</label>
          <input
            id={`${ids}-days`}
            className="form-control"
            type="number"
            required
            min={1}
            max={90}
            step={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          <div>
            <Button
              type="submit"
              disabled={
                pending ||
                unknownCreation ||
                !!query.error ||
                project.status !== "ACTIVE" ||
                !name.trim()
              }
            >
              {pending ? "处理中…" : "创建凭据"}
            </Button>
          </div>
        </form>
      </section>
      <QueryState query={query} />
      {query.data && !query.error && (
        <section className="surface-panel">
          <h3>凭据列表</h3>
          {query.data.data.length ? (
            <ul className="grid gap-3">
              {query.data.data.map((token) => (
                <li className="surface-panel" key={token.id}>
                  <div className="section-heading">
                    <h3>{token.name}</h3>
                    <span className="record-meta">
                      {
                        {
                          ACTIVE: "可用",
                          EXPIRED: "已过期",
                          REVOKED: "已撤销",
                          UNAVAILABLE: "当前不可用",
                        }[token.status]
                      }
                    </span>
                  </div>
                  <p className="record-meta">
                    创建于 {new Date(token.createdAt).toLocaleString("zh-CN")} ·
                    到期于 {new Date(token.expiresAt).toLocaleString("zh-CN")}
                  </p>
                  <p className="muted-copy">
                    仅读取已批准规格 · 凭据 {token.id.slice(0, 8)}
                  </p>
                  {token.revokedAt === null && (
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        clearSecret();
                        setRevoke(token);
                      }}
                    >
                      撤销 {token.name}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>尚未创建访问凭据。</EmptyState>
          )}
          <Pagination
            offset={offset}
            hasMore={query.data.meta.hasMore}
            pending={query.isFetching}
            onChange={setOffset}
          />
        </section>
      )}
      <Dialog
        open={!!secret}
        onOpenChange={(open) => {
          if (!open) clearSecret();
        }}
      >
        <DialogContent>
          <DialogTitle>保存本次凭据</DialogTitle>
          <DialogDescription>
            仅展示这一次。请妥善保存；关闭或切离页面后无法再次查看。复制会将明文放入设备剪贴板。
          </DialogDescription>
          <label htmlFor={`${ids}-secret`}>访问凭据（仅显示一次）</label>
          <input
            ref={secretInput}
            id={`${ids}-secret`}
            className="form-control"
            readOnly
            value={secret}
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            onClick={() => {
              const current = secret;
              void navigator.clipboard
                .writeText(current)
                .then(() => {
                  if (secretInput.current?.value === current) setCopied(true);
                })
                .catch(() => setError("无法复制，请手动保存本次凭据。"));
            }}
          >
            {copied ? "已复制" : "复制凭据"}
          </Button>
          <Button variant="outline" onClick={clearSecret}>
            我已保存，关闭
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!revoke}
        onOpenChange={(open) => {
          if (!open && !pending) setRevoke(null);
        }}
      >
        <DialogContent>
          <DialogTitle>撤销访问凭据</DialogTitle>
          <DialogDescription>
            撤销“{revoke?.name}”后，外部助手的后续请求将被拒绝。此操作不能恢复。
          </DialogDescription>
          <Button disabled={pending} onClick={() => void confirmRevoke()}>
            确认撤销
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setRevoke(null)}
          >
            取消
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
