"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Terminal, Link2, Copy, Check, ShieldCheck } from "lucide-react";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Button } from "@/components/ui/button";
import { useCurrentProject } from "@/features/projects/project-detail";
import { useProjectApi } from "@/features/projects/queries";
import { Pagination, QueryState } from "@/features/projects/shared";
import { ApiError, errorMessage } from "@/lib/api/client";

const quote = (value: string) => "'" + value.replaceAll("'", "'\"'\"'") + "'";
const names: Record<string, string> = {
  AUTHORIZED: "等待安装器兑换",
  EXCHANGED: "已发放凭据",
  CANCELLED: "已取消",
  EXPIRED: "已过期",
};
export function ConnectionsPanel() {
  const project = useCurrentProject();
  const { api, key } = useProjectApi();
  const [repo, setRepo] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [copiedCommand, setCopiedCommand] = useState("");
  const [command, setCommand] = useState("");
  const copied = !!command && copiedCommand === command;
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: key("agent-connections", project.id, offset),
    queryFn: ({ signal }) =>
      api("get", "/api/v1/projects/{id}/agent-connections", {
        path: { id: project.id },
        query: { limit: 20, offset },
        signal,
      }),
  });
  function generate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (
      ![repo, workspace].every(
        (v) => v.startsWith("/") && !/[\u0000-\u001f\u007f]/.test(v),
      )
    ) {
      setError("请填写本机 Linux/WSL 的绝对路径。");
      return;
    }
    setCopiedCommand("");
    setCommand(
      [
        "node",
        repo.replace(/\/+$/, "") + "/apps/mcp/dist/connect/cli.js",
        "--api-origin",
        window.location.origin,
        "--web-origin",
        window.location.origin,
        "--project",
        project.id,
        "--workspace",
        workspace,
      ]
        .map(quote)
        .join(" "),
    );
  }
  async function cancel(id: string) {
    setBusy(true);
    setError("");
    try {
      await api(
        "post",
        "/api/v1/projects/{id}/agent-connections/{grantId}/cancel",
        {
          path: { id: project.id, grantId: id },
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      void query.refetch();
    }
  }
  return (
    <section className="connection-panel">
      <div className="connection-heading">
        <span className="feature-icon">
          <Terminal aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">LOCAL ASSISTANT</p>
          <h2>连接本地 Codex</h2>
        </div>
        <span className="access-status">项目只读</span>
      </div>
      <ol className="connection-steps" aria-label="连接步骤">
        <li>
          <span>1</span>生成命令
        </li>
        <li>
          <span>2</span>浏览器确认
        </li>
        <li>
          <span>3</span>开始协作
        </li>
      </ol>
      <p className="muted">
        先在 SpecBridge 仓库安装依赖并构建 MCP（pnpm --filter specbridge-mcp
        build）。首版支持本机 Linux/WSL 和已安装的 Codex CLI。
      </p>
      <form onSubmit={generate} className="connection-form">
        <label>
          SpecBridge 仓库绝对路径
          <input
            value={repo}
            onChange={(e) => {
              setRepo(e.target.value);
              setCommand("");
            }}
            placeholder="/home/me/specbridge"
            required
          />
        </label>
        <label>
          目标代码目录绝对路径
          <input
            value={workspace}
            onChange={(e) => {
              setWorkspace(e.target.value);
              setCommand("");
            }}
            placeholder="/home/me/my-project"
            required
          />
        </label>
        <Button type="submit">
          <Terminal aria-hidden="true" />
          生成连接命令
        </Button>
      </form>
      {command && (
        <div className="connection-command-panel">
          <p>
            在本机终端执行，或交给本地 Codex 执行。命令不含
            Token；请自行在浏览器核对项目、连接指纹和期限后确认。
          </p>
          <pre className="connection-command">{command}</pre>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard
                .writeText(command)
                .then(() => setCopiedCommand(command))
                .catch(() => setError("复制失败，请手动选择命令。"));
            }}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            复制连接命令
          </Button>
          {copied && (
            <span className="copy-feedback" role="status">
              已复制，可在本地终端执行。
            </span>
          )}
        </div>
      )}
      <p className="muted">
        只读取已批准规格。配置仅增加本项目 MCP 与
        Skill；不更改其他设置或自动信任目录。凭据保存于仓库外私有文件，本地卸载后仍需在此撤销远端
        Token。
      </p>
      <div className="section-heading">
        <h3 className="feature-title">
          <Link2 aria-hidden="true" />
          本人连接授权记录
        </h3>
        <RefreshButton
          label="刷新连接记录"
          busy={query.isFetching}
          onClick={() => void query.refetch()}
        />
      </div>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <QueryState query={query} />
      {query.data?.data.length === 0 && (
        <p className="muted">尚无连接授权。安装器打开确认页后才会创建记录。</p>
      )}
      <ul className="connection-list">
        {query.data?.data.map((row) => (
          <li key={row.id}>
            <strong>{row.name}</strong>
            <span className="access-status" data-status={row.status}>
              {names[row.status]}
            </span>
            <small>
              授权记录 {row.id}
              <br />
              有效至 {new Date(row.expiresAt).toLocaleString("zh-CN")}
            </small>
            {row.apiTokenId && (
              <small>
                凭据 {row.apiTokenId}
                ；如安装结果未知，请在上方凭据列表核对并撤销。
              </small>
            )}
            {["AUTHORIZED", "EXPIRED"].includes(row.status) && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void cancel(row.id)}
              >
                取消此连接授权
              </Button>
            )}
          </li>
        ))}
      </ul>
      {query.data && (
        <Pagination
          offset={offset}
          hasMore={query.data.meta.hasMore}
          pending={query.isFetching}
          onChange={setOffset}
        />
      )}
    </section>
  );
}
type Attempt = {
  grantId: string;
  challenge: string;
  challengeMethod: "S256";
  state: string;
  callbackPort: number;
};
function readAttempt(): Attempt | null {
  const raw = window.location.hash.slice(1);
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname + window.location.search,
  );
  const p = new URLSearchParams(raw);
  const expected = [
    "grantId",
    "challenge",
    "challengeMethod",
    "state",
    "callbackPort",
  ];
  if (
    Array.from(p.keys()).length !== 5 ||
    expected.some((k) => p.getAll(k).length !== 1)
  )
    return null;
  const grantId = p.get("grantId")!,
    challenge = p.get("challenge")!,
    state = p.get("state")!,
    port = p.get("callbackPort")!;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      grantId,
    ) ||
    ![challenge, state].every((v) =>
      /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(v),
    ) ||
    p.get("challengeMethod") !== "S256" ||
    !/^\d{4,5}$/.test(port) ||
    Number(port) < 1024 ||
    Number(port) > 65535
  )
    return null;
  return {
    grantId: grantId.toLowerCase(),
    challenge,
    state,
    challengeMethod: "S256",
    callbackPort: Number(port),
  };
}
export function AgentConnectPage() {
  const project = useCurrentProject();
  const { api } = useProjectApi();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Codex 本地连接");
  const [days, setDays] = useState(30);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const active = useRef(true);
  const initial = useRef<Attempt | null | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    if (initial.current === undefined) initial.current = readAttempt();
    queueMicrotask(() => {
      if (active.current) {
        setAttempt(initial.current ?? null);
        setReady(true);
      }
    });
    return () => {
      active.current = false;
    };
  }, []);
  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!attempt || !checked || busy || unknown) return;
    setBusy(true);
    setUnknown(true);
    setError("");
    try {
      const response = await api(
        "post",
        "/api/v1/projects/{id}/agent-connections",
        {
          path: { id: project.id },
          body: { ...attempt, name, expiresInDays: days },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!active.current) return;
      const expected = `http://127.0.0.1:${attempt.callbackPort}/specbridge/callback`;
      if (
        response.data.callbackUrl !== expected ||
        response.data.grant.id !== attempt.grantId ||
        response.data.grant.projectId !== project.id ||
        !/^sbc_[A-Za-z0-9_-]{43}$/.test(response.data.code)
      )
        throw new Error();
      const callback = new URL(expected);
      callback.search = new URLSearchParams({
        grantId: attempt.grantId,
        state: attempt.state,
        code: response.data.code,
      }).toString();
      // Short-lived code only. The long-lived Token is exchanged by the native process.
      window.location.replace(callback.href);
    } catch (e) {
      if (!active.current) return;
      if (
        e instanceof ApiError &&
        [400, 401, 403, 404, 422, 429].includes(e.status)
      )
        setUnknown(false);
      setError(errorMessage(e));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function inspect() {
    if (!attempt) return;
    setBusy(true);
    setError("");
    try {
      const response = await api(
        "get",
        "/api/v1/projects/{id}/agent-connections/{grantId}",
        {
          path: { id: project.id, grantId: attempt.grantId },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (active.current)
        setStatus(
          `${names[response.data.status]}${response.data.apiTokenId ? "；请到访问凭据页核对凭据 " + response.data.apiTokenId : ""}。已发出的授权码不能恢复，请取消未兑换授权或撤销已发放凭据后重新连接。`,
        );
    } catch (e) {
      if (active.current) setError(errorMessage(e));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  if (!project.capabilities.manageApiTokens.allowed)
    return <p className="notice">仅项目负责人可授权本地连接。</p>;
  return (
    <section className="connection-panel">
      <h1 className="feature-title">
        <ShieldCheck aria-hidden="true" />
        授权本地 Codex 连接
      </h1>
      <p>
        项目：<strong>{project.name}</strong>
      </p>
      <p>
        范围：只读取本项目已批准规格。没有审批、验收、需求修改或背景文件读取权限。
      </p>
      {!ready ? (
        <p role="status">正在核对连接请求…</p>
      ) : !attempt ? (
        <p className="notice">
          连接信息无效、已丢失或页面已刷新。请返回安装器重新发起；如已确认过，请先核对访问凭据。
        </p>
      ) : (
        <>
          <p>
            连接指纹：<strong>{attempt.challenge.slice(0, 12)}</strong>
            ；请与本机安装器显示的指纹比对。
          </p>
          <form onSubmit={confirm} className="connection-form">
            <label>
              凭据名称
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                disabled={busy || unknown}
              />
            </label>
            <label>
              有效天数
              <input
                type="number"
                min={1}
                max={90}
                step={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                required
                disabled={busy || unknown}
              />
            </label>
            <label className="connection-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                disabled={busy || unknown}
              />
              我刚刚在本机发起连接，已核对项目和指纹，同意将批准规格提供给本地
              Codex。
            </label>
            <Button type="submit" disabled={!checked || busy || unknown}>
              确认授权并返回安装器
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || unknown}
              onClick={() => {
                setAttempt(null);
                initial.current = null;
                setStatus(
                  "已拒绝，未创建授权或 Token。可关闭安装器，或等待它超时退出。",
                );
              }}
            >
              拒绝连接
            </Button>
          </form>
          {unknown && (
            <div className="notice">
              <p>
                确认结果需要核对。不要重复授权；可以查询当前记录，再到访问凭据页取消或撤销。
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void inspect()}
              >
                核对授权记录
              </Button>
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}
      <p>
        <Link href={`/app/projects/${project.id}/api-tokens`}>
          返回访问凭据与连接记录
        </Link>
      </p>
    </section>
  );
}
