import { randomBytes, randomUUID, createHash } from "node:crypto";
import {
  chmod,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer, request } from "node:http";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import {
  attempt,
  browserUrl,
  callbackUrl,
  origin,
  sameNonce,
} from "../src/connect/protocol.js";
import { listenForApproval } from "../src/connect/callback.js";
import {
  readCredential,
  writeCredential,
  type Credential,
} from "../src/connect/credentials.js";

let temp: string;
let workspace: string;
let vault: string;
let credential: Credential;
beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "specbridge-connect-"));
  workspace = join(temp, "workspace");
  vault = join(temp, "private");
  await mkdir(workspace);
  credential = {
    format: 1,
    apiOrigin: "http://127.0.0.1:1",
    projectId: randomUUID(),
    tokenId: randomUUID(),
    token: `sbp_${randomBytes(32).toString("base64url")}`,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    workspace,
  };
});
afterEach(async () => {
  await rm(temp, { recursive: true, force: true });
});

it("generates independent proofs and browser URLs without a verifier or Token", () => {
  const a = attempt(),
    b = attempt();
  expect(a.verifier).not.toBe(b.verifier);
  expect(a.state).not.toBe(a.verifier);
  expect(a.challenge).toBe(
    createHash("sha256").update(a.verifier).digest("base64url"),
  );
  expect(sameNonce(a.state, a.state)).toBe(true);
  expect(sameNonce(a.state, b.state)).toBe(false);
  expect(sameNonce(a.state, "!")).toBe(false);
  const url = new URL(
    browserUrl("https://specbridge.example", credential.projectId, a, 49152),
  );
  expect(url.search).toBe("");
  expect(url.pathname).toBe(
    `/app/projects/${credential.projectId}/agent-connect`,
  );
  expect(url.href.includes(a.verifier)).toBe(false);
  expect(url.href.includes(credential.token)).toBe(false);
  expect(new URLSearchParams(url.hash.slice(1)).get("challengeMethod")).toBe(
    "S256",
  );
  for (const value of [
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com/path",
    "https://example.com/?token=x",
    "https://example.com/#x",
    "file:///tmp/x",
  ])
    expect(() => origin(value)).toThrow("INVALID_INPUT");
  for (const port of [0, 80, 65536, 1.2])
    expect(() => callbackUrl(port)).toThrow("INVALID_INPUT");
});

function callbackRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string> } = {},
) {
  return new Promise<{
    status: number;
    body: string;
    headers: Record<string, unknown>;
  }>((resolve, reject) => {
    const req = request(url, options, (res) => {
      let body = "";
      res.on("data", (c: Buffer) => {
        body += c.toString();
      });
      res.once("end", () =>
        resolve({ status: res.statusCode!, body, headers: res.headers }),
      );
    });
    req.once("error", reject);
    req.end();
  });
}
it("listens only on loopback, rejects forged callbacks and accepts one matching browser navigation", async () => {
  const a = attempt();
  const listener = await listenForApproval({
    ...a,
    webOrigin: "https://specbridge.example",
  });
  const code = `sbc_${randomBytes(32).toString("base64url")}`;
  const query = new URLSearchParams({
    grantId: a.grantId,
    code,
    state: a.state,
  });
  const url = `${listener.callbackUrl}?${query}`;
  try {
    expect(
      (await callbackRequest(url, { headers: { Host: "attacker.invalid" } }))
        .status,
    ).toBe(400);
    expect(
      (
        await callbackRequest(url, {
          headers: { Origin: "https://attacker.invalid" },
        })
      ).status,
    ).toBe(400);
    expect((await callbackRequest(url, { method: "POST" })).status).toBe(400);
    expect((await callbackRequest(`${url}&state=${a.state}`)).status).toBe(400);
    expect(
      (await callbackRequest(url.replace(a.state, attempt().state))).status,
    ).toBe(400);
    expect(
      (await callbackRequest(url.replace(a.grantId, randomUUID()))).status,
    ).toBe(400);
    expect((await callbackRequest(url.replace("sbc_", "sbp_"))).status).toBe(
      400,
    );
    const response = await callbackRequest(url);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.body.includes(code)).toBe(false);
    expect(response.body.includes(a.state)).toBe(false);
    expect(await listener.result).toEqual({
      code,
      state: a.state,
      grantId: a.grantId,
    });
    await expect(callbackRequest(url)).rejects.toThrow();
  } finally {
    listener.close();
  }
});
it("cancels and times out without leaving a listening callback server", async () => {
  const timed = await listenForApproval({
    ...attempt(),
    webOrigin: "http://localhost:3000",
    timeoutMs: 20,
  });
  await expect(timed.result).rejects.toThrow("TIMEOUT");
  await expect(callbackRequest(timed.callbackUrl)).rejects.toThrow();
  const controller = new AbortController();
  const cancelled = await listenForApproval({
    ...attempt(),
    webOrigin: "http://localhost:3000",
    signal: controller.signal,
  });
  controller.abort();
  await expect(cancelled.result).rejects.toThrow("CANCELLED");
  await expect(callbackRequest(cancelled.callbackUrl)).rejects.toThrow();
  await expect(
    listenForApproval({
      ...attempt(),
      webOrigin: "http://localhost:3000",
      signal: controller.signal,
    }),
  ).rejects.toThrow("CANCELLED");
});
it("stores credentials outside the workspace with private modes and never overwrites a prior connection", async () => {
  const id = await writeCredential(vault, credential);
  expect((await stat(vault)).mode & 0o777).toBe(0o700);
  expect((await stat(join(vault, `${id}.json`))).mode & 0o777).toBe(0o600);
  expect(await readCredential(vault, id)).toEqual(credential);
  await expect(
    writeCredential(vault, {
      ...credential,
      token: `sbp_${randomBytes(32).toString("base64url")}`,
    }),
  ).rejects.toThrow("CREDENTIAL_STORE");
  expect(await readCredential(vault, id)).toEqual(credential);
  await expect(
    writeCredential(join(workspace, "secrets"), credential),
  ).rejects.toThrow("CREDENTIAL_STORE");
  const anotherRepo = join(temp, "another-repo");
  await mkdir(join(anotherRepo, ".git"), { recursive: true });
  await expect(
    writeCredential(join(anotherRepo, "secrets"), credential),
  ).rejects.toThrow("CREDENTIAL_STORE");
});
it("refuses symlinks, hard links, loose permissions, traversal, malformed or expired credentials", async () => {
  const id = await writeCredential(vault, credential);
  const path = join(vault, `${id}.json`);
  const original = await readFile(path);
  const alias = join(temp, "alias");
  await symlink(vault, alias);
  await expect(readCredential(alias, id)).rejects.toThrow("CREDENTIAL_STORE");
  await expect(
    writeCredential(alias, { ...credential, projectId: randomUUID() }),
  ).rejects.toThrow("CREDENTIAL_STORE");
  await chmod(path, 0o644);
  await expect(readCredential(vault, id)).rejects.toThrow("CREDENTIAL_STORE");
  await chmod(path, 0o600);
  await link(path, join(temp, "hardlink"));
  await expect(readCredential(vault, id)).rejects.toThrow("CREDENTIAL_STORE");
  await rm(join(temp, "hardlink"));
  for (const raw of [
    "{invalid",
    "x".repeat(8193),
    JSON.stringify({ ...credential, expiresAt: "2020-01-01T00:00:00.000Z" }),
    JSON.stringify({ ...credential, projectId: randomUUID() }),
  ]) {
    await writeFile(path, raw);
    await expect(readCredential(vault, id)).rejects.toThrow("CREDENTIAL_STORE");
  }
  await writeFile(path, original);
  await chmod(vault, 0o755);
  await expect(readCredential(vault, id)).rejects.toThrow("CREDENTIAL_STORE");
  await chmod(vault, 0o700);
  await expect(readCredential(vault, "../escape")).rejects.toThrow(
    "CREDENTIAL_STORE",
  );
  await rm(path);
  await symlink(join(temp, "nonexistent"), path);
  await expect(readCredential(vault, id)).rejects.toThrow("CREDENTIAL_STORE");
});
it("launches the real stdio MCP via a private credential reference and safely handles read API authentication failures", async () => {
  const requests: {
    method: string | undefined;
    path: string | undefined;
    authorized: boolean;
    cookie: boolean;
  }[] = [];
  let revoked = false;
  const api = createServer((req, res) => {
    requests.push({
      method: req.method,
      path: req.url,
      authorized: req.headers.authorization === `Bearer ${credential.token}`,
      cookie: req.headers.cookie !== undefined,
    });
    res.setHeader("Content-Type", "application/json");
    if (revoked) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: credential.token }));
      return;
    }
    res.end(
      JSON.stringify({
        data: [],
        meta: { requestId: randomUUID(), limit: 20, offset: 0, hasMore: false },
      }),
    );
  });
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const address = api.address();
  if (!address || typeof address === "string")
    throw new Error("No test API listener");
  credential.apiOrigin = `http://127.0.0.1:${address.port}`;
  const id = await writeCredential(vault, credential);
  const client = new Client({
    name: "connection-launcher-test",
    version: "1.0.0",
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("dist/connect/launch.js"), vault, id],
    env: {},
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (c: Buffer) => {
    stderr += c.toString();
  });
  try {
    await client.connect(transport);
    expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual([
      "get_approved_spec",
      "list_project_requirements",
    ]);
    const listed = await client.callTool({
      name: "list_project_requirements",
      arguments: {},
    });
    expect(listed.isError).not.toBe(true);
    expect(listed.structuredContent).toMatchObject({
      projectId: credential.projectId,
      items: [],
    });
    revoked = true;
    const rejected = await client.callTool({
      name: "list_project_requirements",
      arguments: {},
    });
    expect(rejected.isError).toBe(true);
    expect(JSON.stringify(rejected).includes(credential.token)).toBe(false);
    expect(requests).toEqual(
      Array.from({ length: 2 }, () => ({
        method: "GET",
        path: `/api/v1/projects/${credential.projectId}/approved-specs?limit=20&offset=0`,
        authorized: true,
        cookie: false,
      })),
    );
    await expect(
      client.callTool({ name: "approve_change_request", arguments: {} }),
    ).rejects.toThrow();
  } finally {
    await client.close();
    api.closeAllConnections();
    await new Promise<void>((resolve) => api.close(() => resolve()));
  }
  expect(stderr.includes(credential.token)).toBe(false);
});
