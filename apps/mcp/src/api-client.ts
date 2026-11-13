import { McpConfig } from "./config.js";
import { McpFault } from "./errors.js";
import { apiDetail, apiList, detailInput, listInput } from "./contracts.js";

export const READ_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export class ApprovedApiClient {
  #active = 0;
  #windowStart = 0;
  #count = 0;
  constructor(
    private readonly config: McpConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  private async get(path: string, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw new McpFault("CANCELLED");
    if (this.#active >= 2) throw new McpFault("BUSY");
    if (Date.now() - this.#windowStart >= 60000) {
      this.#windowStart = Date.now();
      this.#count = 0;
    }
    if (this.#count >= 60)
      throw new McpFault(
        "RATE_LIMITED",
        Math.max(1, Math.ceil((this.#windowStart + 60000 - Date.now()) / 1000)),
      );
    this.#count++;
    this.#active++;
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), READ_TIMEOUT_MS);
    const combined = AbortSignal.any([
      timeout.signal,
      ...(signal ? [signal] : []),
    ]);
    let response: Response | undefined;
    try {
      response = await this.fetcher(this.config.origin + path, {
        method: "GET",
        headers: this.config.headers(),
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        signal: combined,
      });
      if (response.status >= 300 && response.status < 400)
        throw new McpFault("REDIRECT_REFUSED");
      if (response.status === 401 || response.status === 403)
        throw new McpFault("UNAUTHENTICATED");
      if (response.status === 404) throw new McpFault("NOT_FOUND");
      if (response.status === 429) {
        const value = response.headers.get("retry-after") ?? "";
        const seconds = /^\d{1,6}$/.test(value)
          ? Math.min(300, Math.max(1, Number(value)))
          : 60;
        throw new McpFault("RATE_LIMITED", seconds);
      }
      if (response.status !== 200) throw new McpFault("UNAVAILABLE");
      if (
        !/^application\/json(?:;|$)/i.test(
          response.headers.get("content-type") ?? "",
        ) ||
        !response.body
      )
        throw new McpFault("INVALID_RESPONSE");
      if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES)
        throw new McpFault("RESPONSE_TOO_LARGE");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          combined.throwIfAborted();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_RESPONSE_BYTES)
            throw new McpFault("RESPONSE_TOO_LARGE");
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      try {
        return JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            Buffer.concat(chunks, size),
          ),
        ) as unknown;
      } catch {
        throw new McpFault("INVALID_RESPONSE");
      }
    } catch (error) {
      if (signal?.aborted) throw new McpFault("CANCELLED");
      if (timeout.signal.aborted) throw new McpFault("TIMEOUT");
      if (error instanceof McpFault) throw error;
      throw new McpFault("UNAVAILABLE");
    } finally {
      if (response?.body && !response.body.locked)
        await response.body.cancel().catch(() => {});
      clearTimeout(timer);
      this.#active--;
    }
  }
  async list(input: unknown, signal?: AbortSignal) {
    const parsed = listInput.safeParse(input);
    if (!parsed.success) throw new McpFault("INVALID_ARGUMENTS");
    const { limit, offset } = parsed.data;
    const path = `/api/v1/projects/${this.config.projectId}/approved-specs?limit=${limit}&offset=${offset}`;
    const result = apiList.safeParse(await this.get(path, signal));
    if (!result.success) throw new McpFault("INVALID_RESPONSE");
    const { data, meta } = result.data;
    if (
      meta.limit !== limit ||
      meta.offset !== offset ||
      data.length > limit ||
      (meta.hasMore && data.length !== limit) ||
      new Set(data.map((v) => v.versionId)).size !== data.length ||
      data.some((v) => v.projectId !== this.config.projectId)
    )
      throw new McpFault("INVALID_RESPONSE");
    return {
      projectId: this.config.projectId,
      source: {
        apiPath: path,
        requestId: meta.requestId,
        readAt: new Date().toISOString(),
      },
      items: data.map((v) => ({
        requirementId: v.requirementId,
        changeRequestId: v.changeRequestId,
        versionId: v.versionId,
        versionNo: v.versionNo,
        revisionId: v.referencedRequirement.revisionId,
        revisionNo: v.referencedRequirement.revisionNo,
        approvedAt: v.approvedAt,
        scopePreview: v.approvedScope.summary.slice(0, 300),
        previewTruncated: v.approvedScope.summary.length > 300,
      })),
      page: { limit, offset, hasMore: meta.hasMore },
    };
  }
  async detail(input: unknown, signal?: AbortSignal) {
    const parsed = detailInput.safeParse(input);
    if (!parsed.success) throw new McpFault("INVALID_ARGUMENTS");
    const versionId = parsed.data.versionId.toLowerCase();
    const path = `/api/v1/projects/${this.config.projectId}/approved-specs/${versionId}`;
    const result = apiDetail.safeParse(await this.get(path, signal));
    if (
      !result.success ||
      result.data.data.projectId !== this.config.projectId ||
      result.data.data.versionId !== versionId
    )
      throw new McpFault("INVALID_RESPONSE");
    return {
      specification: result.data.data,
      source: {
        apiPath: path,
        requestId: result.data.meta.requestId,
        readAt: new Date().toISOString(),
      },
    };
  }
}
