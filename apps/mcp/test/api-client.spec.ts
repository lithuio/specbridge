import { randomUUID, randomBytes } from "node:crypto";
import {
  ApprovedApiClient,
  MAX_RESPONSE_BYTES,
  READ_TIMEOUT_MS,
} from "../src/api-client.js";
import { McpConfig } from "../src/config.js";
import { toolFailure } from "../src/errors.js";
const projectId = randomUUID(),
  versionId = randomUUID();
const raw = `sbp_${randomBytes(32).toString("base64url")}`;
const env = {
  SPECBRIDGE_API_BASE_URL: "http://127.0.0.1:4000",
  SPECBRIDGE_PROJECT_ID: projectId,
  SPECBRIDGE_API_TOKEN: raw,
};
const spec = {
  projectId,
  versionId,
  requirementId: randomUUID(),
  changeRequestId: randomUUID(),
  versionNo: 1,
  submittedAt: new Date().toISOString(),
  approvedAt: new Date().toISOString(),
  approvedScope: {
    summary: "Only approved scope",
    acceptanceCriteria: ["Observable result"],
  },
  referencedRequirement: {
    revisionId: randomUUID(),
    revisionNo: 1,
    content: "Reference background",
    acceptanceCriteria: ["Reference criterion"],
    createdAt: new Date().toISOString(),
  },
};
const meta = { requestId: randomUUID(), limit: 20, offset: 0, hasMore: false };
const setup = () => {
  const fetcher = vi.fn<typeof fetch>();
  return { fetcher, api: new ApprovedApiClient(new McpConfig(env), fetcher) };
};
afterEach(() => vi.useRealTimers());
it("accepts HTTPS or exact loopback origins and requires canonical environment-only credentials", () => {
  for (const origin of [
    "https://api.example.test",
    "http://127.0.0.1:4000",
    "http://[::1]:4000",
    "http://localhost:4000",
  ])
    expect(
      new McpConfig({ ...env, SPECBRIDGE_API_BASE_URL: origin }).origin,
    ).toBe(origin);
  for (const origin of [
    "http://api.example.test",
    "http://127.0.0.1.evil.test",
    "ftp://api.example.test",
    "https://user:pass@api.example.test",
    "https://api.example.test/path",
    "https://api.example.test/?token=x",
    "https://api.example.test/#x",
  ])
    expect(
      () => new McpConfig({ ...env, SPECBRIDGE_API_BASE_URL: origin }),
    ).toThrow("configuration is invalid");
  for (const token of [
    "",
    raw + "=",
    raw + " ",
    raw.toUpperCase(),
    "sbp_" + "A".repeat(42) + "B",
  ])
    expect(
      () => new McpConfig({ ...env, SPECBRIDGE_API_TOKEN: token }),
    ).toThrow();
  expect(
    () => new McpConfig({ ...env, SPECBRIDGE_PROJECT_ID: "../other" }),
  ).toThrow();
  expect(JSON.stringify(new McpConfig(env)).includes(raw)).toBe(false);
});
it("uses only fixed GET endpoints without Cookie/redirects and returns bounded previews plus exact full detail", async () => {
  const { api, fetcher } = setup();
  const full = {
    ...spec,
    approvedScope: {
      ...spec.approvedScope,
      summary: "Approved scope ".repeat(50),
    },
  };
  fetcher.mockResolvedValueOnce(Response.json({ data: [full], meta }));
  const list = await api.list({});
  expect(list.items[0].previewTruncated).toBe(true);
  expect(list.items[0].scopePreview.length).toBe(300);
  expect(list.items[0]).not.toHaveProperty("content");
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toBe(
    env.SPECBRIDGE_API_BASE_URL +
      `/api/v1/projects/${projectId}/approved-specs?limit=20&offset=0`,
  );
  expect(options).toMatchObject({
    method: "GET",
    redirect: "manual",
    credentials: "omit",
    cache: "no-store",
  });
  expect(new Headers(options!.headers).has("cookie")).toBe(false);
  expect(
    new Headers(options!.headers).get("authorization") === `Bearer ${raw}`,
  ).toBe(true);
  fetcher.mockResolvedValueOnce(
    Response.json({ data: full, meta: { requestId: meta.requestId } }),
  );
  expect((await api.detail({ versionId })).specification).toEqual(full);
});
it("rejects invalid arguments and caller overrides before any HTTP call", async () => {
  const { api, fetcher } = setup();
  for (const input of [
    { limit: 0 },
    { limit: 51 },
    { limit: 1.5 },
    { offset: 10001 },
    { offset: -1 },
    { projectId: randomUUID() },
    { url: "https://evil.test" },
    { token: "override" },
    { limit: "1" },
  ])
    await expect(api.list(input)).rejects.toMatchObject({
      code: "INVALID_ARGUMENTS",
    });
  for (const input of [
    { versionId: "../x" },
    { versionId, projectId },
    { versionId, method: "POST" },
  ])
    await expect(api.detail(input)).rejects.toMatchObject({
      code: "INVALID_ARGUMENTS",
    });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  [401, "UNAUTHENTICATED"],
  [403, "UNAUTHENTICATED"],
  [404, "NOT_FOUND"],
  [429, "RATE_LIMITED"],
  [500, "UNAVAILABLE"],
  [503, "UNAVAILABLE"],
  [302, "REDIRECT_REFUSED"],
] as const)(
  "sanitizes HTTP %s without retrying or disclosing upstream text",
  async (status, code) => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValueOnce(
      new Response(raw, {
        status,
        headers: { location: "https://evil.test", "retry-after": "999999" },
      }),
    );
    const result = await api.list({}).catch(toolFailure);
    expect(result).toMatchObject({ isError: true });
    expect(JSON.stringify(result)).toContain(code);
    expect(JSON.stringify(result).includes(raw)).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    if (status === 429) expect(JSON.stringify(result)).toContain("300");
  },
);
it("rejects empty/malformed JSON, wrong content type, foreign objects, fields and pagination drift", async () => {
  const { api, fetcher } = setup();
  for (const text of [
    "",
    "{",
    "null",
    JSON.stringify({ data: [{ ...spec, projectId: randomUUID() }], meta }),
    JSON.stringify({ data: [{ ...spec, secret: "unsafe" }], meta }),
    JSON.stringify({ data: [spec], meta: { ...meta, offset: 1 } }),
    JSON.stringify({ data: [], meta: { ...meta, hasMore: true } }),
  ]) {
    fetcher.mockResolvedValueOnce(
      new Response(text, { headers: { "content-type": "application/json" } }),
    );
    await expect(api.list({})).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  }
  fetcher.mockResolvedValueOnce(new Response("<html>Failure</html>"));
  await expect(api.list({})).rejects.toMatchObject({
    code: "INVALID_RESPONSE",
  });
  fetcher.mockResolvedValueOnce(
    new Response(new Uint8Array([0xc3, 0x28]), {
      headers: { "content-type": "application/json" },
    }),
  );
  await expect(api.list({})).rejects.toMatchObject({
    code: "INVALID_RESPONSE",
  });
  fetcher.mockResolvedValueOnce(
    Response.json({
      data: { ...spec, versionId: randomUUID() },
      meta: { requestId: meta.requestId },
    }),
  );
  await expect(api.detail({ versionId })).rejects.toMatchObject({
    code: "INVALID_RESPONSE",
  });
});
it("bounds advertised and chunked body sizes and releases the reader", async () => {
  const { api, fetcher } = setup();
  fetcher.mockResolvedValueOnce(
    new Response("{}", {
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_RESPONSE_BYTES + 1),
      },
    }),
  );
  await expect(api.list({})).rejects.toMatchObject({
    code: "RESPONSE_TOO_LARGE",
  });
  const cancel = vi.fn();
  fetcher.mockResolvedValueOnce(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(MAX_RESPONSE_BYTES));
          controller.enqueue(new Uint8Array(1));
        },
        cancel,
      }),
      { headers: { "content-type": "application/json" } },
    ),
  );
  await expect(api.list({})).rejects.toMatchObject({
    code: "RESPONSE_TOO_LARGE",
  });
  expect(cancel).toHaveBeenCalled();
});
it("propagates timeout/cancellation and bounds concurrent calls without a queue", async () => {
  vi.useFakeTimers();
  const { api, fetcher } = setup();
  fetcher.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options!.signal!.addEventListener(
          "abort",
          () => reject(new Error("private transport detail")),
          { once: true },
        ),
      ),
  );
  const control = new AbortController();
  const first = api.list({}, control.signal).catch(toolFailure);
  const second = api.list({}).catch(toolFailure);
  await expect(api.list({})).rejects.toMatchObject({ code: "BUSY" });
  control.abort();
  expect(JSON.stringify(await first)).toContain("CANCELLED");
  await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  expect(JSON.stringify(await second)).toContain("TIMEOUT");
  expect(fetcher).toHaveBeenCalledTimes(2);
  fetcher.mockResolvedValueOnce(Response.json({ data: [], meta }));
  expect((await api.list({})).items).toEqual([]);
});
it("enforces process read budget and has no cache that could bypass revocation", async () => {
  const { api, fetcher } = setup();
  fetcher.mockImplementation(async () => Response.json({ data: [], meta }));
  for (let n = 0; n < 60; n++) await api.list({});
  await expect(api.list({})).rejects.toMatchObject({ code: "RATE_LIMITED" });
  expect(fetcher).toHaveBeenCalledTimes(60);
});
