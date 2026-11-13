import { createServer } from "node:http";
import {
  browserUrl,
  callbackInput,
  callbackUrl,
  ConnectionFault,
  nonce,
  origin,
  sameNonce,
  uuid,
} from "./protocol.js";

// Browser top-level navigation only. No CORS, remote listener, redirect, logging or Token response.
export async function listenForApproval(options: {
  projectId?: string;
  challenge?: string;
  grantId: string;
  state: string;
  webOrigin: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  if (
    !uuid.safeParse(options.grantId).success ||
    !nonce.safeParse(options.state).success
  )
    throw new ConnectionFault("INVALID_INPUT");
  if (
    options.projectId &&
    (!uuid.safeParse(options.projectId).success ||
      !nonce.safeParse(options.challenge).success)
  )
    throw new ConnectionFault("INVALID_INPUT");
  const expectedOrigin = origin(options.webOrigin);
  const timeoutMs = options.timeoutMs ?? 300_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000)
    throw new ConnectionFault("INVALID_INPUT");
  if (options.signal?.aborted) throw new ConnectionFault("CANCELLED");
  let resolveResult!: (value: {
    grantId: string;
    code: string;
    state: string;
  }) => void;
  let rejectResult!: (error: ConnectionFault) => void;
  let settled = false;
  let port = 0;
  const result = new Promise<{ grantId: string; code: string; state: string }>(
    (resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    },
  );
  // The installer may still be opening a browser when cancellation arrives.
  void result.catch(() => {});
  const server = createServer(
    { maxHeaderSize: 4096, requestTimeout: 5000, headersTimeout: 5000 },
    (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'",
      );
      res.setHeader("Connection", "close");
      if (
        !settled &&
        options.projectId &&
        req.method === "GET" &&
        req.url === "/start" &&
        req.socket.remoteAddress === "127.0.0.1" &&
        req.headers.host === `127.0.0.1:${port}`
      ) {
        res.statusCode = 302;
        res.setHeader(
          "Location",
          browserUrl(
            expectedOrigin,
            options.projectId,
            {
              grantId: options.grantId,
              state: options.state,
              challenge: options.challenge!,
              verifier: "",
            },
            port,
          ),
        );
        res.end();
        return;
      }
      const fail = () => {
        res.statusCode = 400;
        res.end("Invalid callback.");
      };
      if (
        settled ||
        req.method !== "GET" ||
        req.socket.remoteAddress !== "127.0.0.1" ||
        req.headers.host !== `127.0.0.1:${port}` ||
        (req.headers.origin !== undefined &&
          req.headers.origin !== expectedOrigin) ||
        !req.url?.startsWith("/specbridge/callback?") ||
        req.url.length > 2048
      ) {
        fail();
        return;
      }
      const url = new URL(req.url, callbackUrl(port));
      if (
        url.pathname !== "/specbridge/callback" ||
        url.hash ||
        Array.from(url.searchParams.keys()).length !== 3
      ) {
        fail();
        return;
      }
      const parsed = callbackInput.safeParse(
        Object.fromEntries(url.searchParams),
      );
      if (
        !parsed.success ||
        parsed.data.grantId !== options.grantId ||
        !sameNonce(parsed.data.state, options.state)
      ) {
        fail();
        return;
      }
      settled = true;
      res.end(
        "SpecBridge authorization received. Return to the installer. This page does not contain a project Token.",
      );
      cleanup();
      resolveResult(parsed.data);
    },
  );
  server.maxConnections = 8;
  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
    server.close();
    server.closeIdleConnections();
  };
  const finish = (code: "CANCELLED" | "TIMEOUT" | "CALLBACK_FAILED") => {
    if (settled) return;
    settled = true;
    cleanup();
    server.closeAllConnections();
    rejectResult(new ConnectionFault(code));
  };
  const cancel = () => finish("CANCELLED");
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch {
    cleanup();
    throw new ConnectionFault("CALLBACK_FAILED");
  }
  const address = server.address();
  if (!address || typeof address === "string") {
    cleanup();
    throw new ConnectionFault("CALLBACK_FAILED");
  }
  port = address.port;
  server.on("error", () => finish("CALLBACK_FAILED"));
  timer = setTimeout(() => finish("TIMEOUT"), timeoutMs);
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  return { port, callbackUrl: callbackUrl(port), result, close: cancel };
}
