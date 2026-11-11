import type { paths } from "./generated/schema";

type Method = "get" | "post" | "put" | "patch" | "delete";
type Operation<P extends keyof paths, M extends Method> = NonNullable<
  paths[P][M & keyof paths[P]]
>;
type Routes<M extends Method> = {
  [P in keyof paths]: Operation<P, M> extends never ? never : P;
}[keyof paths];
type Json<T> = T extends { content: { "application/json": infer J } }
  ? J
  : void;
export type ApiResult<P extends keyof paths, M extends Method> =
  Operation<P, M> extends { responses: infer R }
    ? Json<R[keyof R & (200 | 201 | 204)]>
    : never;
type Body<O> = O extends { requestBody: infer B }
  ? { body: Json<B> }
  : { body?: never };
type Params<O> = O extends { parameters: infer P }
  ? (P extends { path: infer V } ? { path: V } : { path?: never }) &
      (P extends { query?: infer Q } ? { query?: Q } : { query?: never })
  : object;
type Options<O> = Body<O> & Params<O> & { signal?: AbortSignal };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public requestId?: string,
    public retryAfter?: number,
  ) {
    // Never propagate server text, request bodies, URLs or credentials into logs/UI.
    super(code);
    this.name = "ApiError";
  }
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return "连接失败，请检查网络后重试。操作结果未知时，请先核对当前状态。";
  if (error.status === 429)
    return `操作过于频繁，请${error.retryAfter ? `等待 ${error.retryAfter} 秒后` : "稍后"}重试。`;
  if (error.code === "REGISTRATION_UNAVAILABLE")
    return "暂时无法使用这些信息注册，请核对邮箱或尝试登录。";
  if (error.code === "STALE_VERSION")
    return "内容已更新，请保留输入并核对最新版后再操作。";
  const projectErrors: Record<string, string> = {
    REVIEW_IN_PROGRESS: "此需求有审批中的变更，审批结束前不能创建新 Revision。",
    USER_NOT_REGISTERED: "该邮箱尚未注册，请先让对方创建账号，再添加成员。",
    WORKSPACE_DEVELOPER_REQUIRED:
      "只能分配本工作空间已有的开发成员，请先添加到供应方成员。",
    ROLE_CONFLICT: "此账号与供应方或客户身份冲突，同一工作空间内不能兼任。",
    CLIENT_ASSIGNMENT_LOCKED:
      "项目已有正式提交历史，客户绑定已锁定，不能更换账号。请核对当前项目。",
  };
  if (
    (error.status === 422 || error.status === 409) &&
    projectErrors[error.code]
  )
    return projectErrors[error.code];
  return (
    (
      {
        400: "输入信息不符合要求，请检查后重试。",
        401: "邮箱或密码不正确，请重新输入。",
        403: "当前操作未获授权，请刷新会话后重试。",
        404: "内容不存在，或当前账号无权访问。",
        409: "当前状态已发生变化，请核对后再操作。",
        422: "当前条件不满足操作要求，请核对信息。",
      } as Record<number, string>
    )[error.status] ?? "服务暂时不可用，请稍后重试。"
  );
}

export function createApiClient(
  lifetime?: AbortSignal,
  onUnauthorized?: () => void,
) {
  return async function request<M extends Method, P extends Routes<M>>(
    method: M,
    route: P,
    options: Options<Operation<P, M>>,
  ): Promise<ApiResult<P, M>> {
    const params = options as {
      path?: Record<string, string>;
      query?: Record<string, unknown>;
      body?: unknown;
      signal?: AbortSignal;
    };
    let url: string = route;
    for (const [key, value] of Object.entries(params.path ?? {}))
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params.query ?? {}))
      if (value != null) search.set(key, String(value));
    if (search.size) url += `?${search}`;
    const signals = [lifetime, options.signal].filter(
      (signal): signal is AbortSignal => !!signal,
    );
    const signal = signals.length ? AbortSignal.any(signals) : undefined;
    const response = await fetch(url, {
      method: method.toUpperCase(),
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
        ...(method !== "get"
          ? { "X-CSRF-Protection": "1", "Content-Type": "application/json" }
          : {}),
      },
      ...(params.body !== undefined
        ? { body: JSON.stringify(params.body) }
        : {}),
    });
    signal?.throwIfAborted();
    if (response.status === 204) return undefined as ApiResult<P, M>;
    const body = await response.json().catch(() => null);
    signal?.throwIfAborted();
    if (!response.ok) {
      const requestId = response.headers.get("x-request-id");
      const retryAfter = Number(response.headers.get("retry-after"));
      const code =
        typeof body?.error?.code === "string" &&
        /^[A-Z_]+$/.test(body.error.code)
          ? body.error.code
          : "REQUEST_FAILED";
      if (response.status === 401) onUnauthorized?.();
      throw new ApiError(
        response.status,
        code,
        requestId && /^[\w-]{1,100}$/.test(requestId) ? requestId : undefined,
        retryAfter > 0 ? retryAfter : undefined,
      );
    }
    if (!body || !("data" in body)) throw new ApiError(502, "INVALID_RESPONSE");
    return body as ApiResult<P, M>;
  };
}
