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
  ? B extends { content: { "multipart/form-data": unknown } }
    ? { body: FormData }
    : { body: Json<B> }
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
    PROPOSAL_STALE: "个人提案已更新，输入已保留。请核对服务器预览后再操作。",
    PROPOSAL_SOURCE_STALE: "提案来源或业务版本已变化，请保留输入并重新准备，不会自动执行。",
    PROPOSAL_EXPIRED: "提案已过期，不能执行。请核对最新业务后重新准备。",
    PROPOSAL_LIMIT: "未执行提案已达100份，请删除不再需要的个人提案。",
    DOCUMENT_QUOTA:
      "项目背景配额已满（20 份资料、100 MiB，包含历史版本）。请联系负责人核对。",
    DOCUMENT_STALE: "资料已更新，已保留所选文件。请刷新列表并重新核对。",
    DOCUMENT_PROCESSING: "项目还有文件正在解析，请稍后刷新再试。",
    DOCUMENT_UNAVAILABLE: "资料当前不可用，请刷新并核对状态。",
    STALE_WORKING_DRAFT:
      "个人工作稿已在其他页面更新，输入已保留。请核对已保存工作稿再继续。",
    OPERATION_CONFLICT: "该发布操作与已记录的请求不一致，请核对发布结果。",
    QUESTION_ALREADY_PUBLISHED:
      "所选问题已发布，不能重复发布或修改已发布正文。",
    DRAFT_ALREADY_PUBLISHED: "此工作稿已创建 Revision，请先编辑新的工作稿。",
    DELIVERY_PENDING: "已有待验收交付，请先核对交付历史。",
    DELIVERY_COMPLETED: "此批准版本已验收，不能继续交付。",
    ALREADY_REVIEWED: "此记录已有决定，请刷新核对历史。",
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
          ? {
              "X-CSRF-Protection": "1",
              ...(params.body instanceof FormData
                ? {}
                : { "Content-Type": "application/json" }),
            }
          : {}),
      },
      ...(params.body !== undefined
        ? {
            body:
              params.body instanceof FormData
                ? params.body
                : JSON.stringify(params.body),
          }
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
