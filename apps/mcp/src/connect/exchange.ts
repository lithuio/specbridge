import { z } from "zod";
import { ConnectionFault, nonce, origin, uuid } from "./protocol.js";
import type { Credential } from "./credentials.js";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
type ExchangeTransport = (
  url: string,
  options: RequestInit,
) => Promise<Response>;
// Native fetch adds Sec-Fetch-Mode even in Node. Keep this proof-only transport
// distinct from browser requests, without weakening the exchange Guard.
const nativePost: ExchangeTransport = (url, options) =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = (target.protocol === "https:" ? httpsRequest : httpRequest)(
      target,
      {
        method: "POST",
        signal: options.signal ?? undefined,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        maxHeaderSize: 8192,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("error", reject);
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 8192) {
            response.destroy();
            request.destroy();
            reject(new Error());
          } else chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            resolve(
              new Response(Buffer.concat(chunks), {
                status: response.statusCode ?? 500,
                headers: {
                  "content-type": response.headers["content-type"] ?? "",
                },
              }),
            );
          } catch {
            reject(new Error());
          }
        });
      },
    );
    request.on("error", reject);
    request.end(options.body);
  });
const result = z.strictObject({
  data: z.strictObject({
    id: uuid,
    projectId: uuid,
    name: z.string().max(100),
    scopes: z.tuple([z.literal("approved_specs:read")]),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    revokedAt: z.null(),
    status: z.literal("ACTIVE"),
    token: z
      .string()
      .regex(/^sbp_[A-Za-z0-9_-]{43}$/)
      .refine((value) => nonce.safeParse(value.slice(4)).success),
  }),
  meta: z.strictObject({ requestId: uuid }),
});
export async function exchangeCode(
  apiOrigin: string,
  workspace: string,
  input: {
    grantId: string;
    projectId: string;
    code: string;
    verifier: string;
    state: string;
    callbackPort: number;
  },
  signal?: AbortSignal,
  fetcher: ExchangeTransport = nativePost,
): Promise<Credential> {
  const endpoint = origin(apiOrigin) + "/api/v1/agent-connections/exchange";
  const timer = AbortSignal.timeout(10_000);
  const combined = signal ? AbortSignal.any([timer, signal]) : timer;
  let response: Response | undefined;
  try {
    response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
      redirect: "manual",
      credentials: "omit",
      cache: "no-store",
      signal: combined,
    });
    if ([400, 401, 403, 404, 409, 413, 422, 429].includes(response.status))
      throw new ConnectionFault("EXCHANGE_REJECTED");
    if (
      response.status !== 200 ||
      !response.body ||
      !/^application\/json(?:;|$)/i.test(
        response.headers.get("content-type") ?? "",
      ) ||
      Number(response.headers.get("content-length")) > 8192
    )
      throw new ConnectionFault("EXCHANGE_UNKNOWN");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        combined.throwIfAborted();
        if (done) break;
        size += value.length;
        if (size > 8192) throw new Error();
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const parsed = result.parse(
      JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          Buffer.concat(chunks, size),
        ),
      ),
    );
    if (
      parsed.data.projectId !== input.projectId ||
      Date.parse(parsed.data.expiresAt) <= Date.now()
    )
      throw new Error();
    return {
      format: 1,
      apiOrigin: origin(apiOrigin),
      projectId: parsed.data.projectId,
      workspace,
      tokenId: parsed.data.id,
      token: parsed.data.token,
      expiresAt: parsed.data.expiresAt,
    };
  } catch (error) {
    if (error instanceof ConnectionFault) throw error;
    throw new ConnectionFault("EXCHANGE_UNKNOWN");
  } finally {
    if (response?.body && !response.body.locked)
      await response.body.cancel().catch(() => {});
  }
}
