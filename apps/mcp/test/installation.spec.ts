import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  stat,
} from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "smol-toml";
import { createServer } from "node:http";
import {
  addServer,
  removeServer,
  prepareInstall,
  applyInstall,
  checkInstallation,
  uninstall,
} from "../src/connect/configuration.js";
import {
  writeCredential,
  type Credential,
} from "../src/connect/credentials.js";
import { exchangeCode } from "../src/connect/exchange.js";
let temp: string,
  workspace: string,
  vault: string,
  id: string,
  value: Credential;
beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "specbridge-install-"));
  workspace = join(temp, "workspace");
  vault = join(temp, "private");
  await mkdir(workspace);
  value = {
    format: 1,
    workspace,
    apiOrigin: "http://127.0.0.1:4000",
    projectId: randomUUID(),
    tokenId: randomUUID(),
    token: "sbp_" + randomBytes(32).toString("base64url"),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  id = await writeCredential(vault, value);
});
afterEach(async () => {
  await rm(temp, { recursive: true, force: true });
});
const launcher = resolve("dist/connect/launch.js"),
  skill = resolve("../../skills/requirement-analyst/SKILL.md");
const plan = () =>
  prepareInstall(workspace, vault, id, launcher, skill, value.projectId);
it("preserves exact existing TOML bytes, comments, large integers and unrelated servers while adding/removing only its own block", () => {
  const existing =
    '# private settings\nmodel="chosen-model"\napproval_policy="on-request"\ncount=9223372036854775807\nratio=1.0\n[mcp_servers.existing]\ncommand="existing-command"\nargs=["unrelated"]\n';
  const config = {
    command: "/bin/node",
    args: ["/safe/launch.js", "/private/dir", id],
  };
  const name = "specbridge_" + id.slice(0, 16);
  const added = addServer(existing, name, config, id);
  expect(added.output.startsWith(existing)).toBe(true);
  expect(
    (
      parse(added.output, { integersAsBigInt: true }).mcp_servers as Record<
        string,
        unknown
      >
    ).existing,
  ).toEqual({ command: "existing-command", args: ["unrelated"] });
  expect(
    removeServer(added.output, { id, serverName: name, block: added.block }),
  ).toBe(existing);
  expect(() =>
    removeServer(
      added.output.replace("/safe/launch.js", "/changed/launch.js"),
      { id, serverName: name, block: added.block },
    ),
  ).toThrow("CONFIGURATION_CONFLICT");
});
it("fails closed for malformed TOML, inline-table conflicts and duplicate managed connections", () => {
  for (const existing of [
    "a=[1 #",
    'mcp_servers={existing={command="x"}}',
    '[mcp_servers.specbridge_other]\ncommand="x"',
    'x="unterminated',
  ])
    expect(() =>
      addServer(existing, "specbridge_test", { command: "node" }, id),
    ).toThrow("CONFIGURATION_CONFLICT");
});
it("installs a bound Skill/config with no secret, then uninstalls without touching unrelated settings or Token revocation", async () => {
  await mkdir(join(workspace, ".codex"));
  const configPath = join(workspace, ".codex/config.toml"),
    original = '# keep\nmodel="chosen-model"\n';
  await writeFile(configPath, original, { mode: 0o600 });
  const p = await plan();
  await applyInstall(p, vault);
  const config = await readFile(configPath, "utf8"),
    installedSkill = await readFile(join(p.skillDir, "SKILL.md"), "utf8");
  expect(config.startsWith(original)).toBe(true);
  expect(config.includes(value.token)).toBe(false);
  expect(installedSkill.includes(value.token)).toBe(false);
  expect(installedSkill).toContain(value.projectId);
  await checkInstallation(workspace, vault, id);
  const altered = config.replace(launcher, launcher + ".changed");
  await writeFile(configPath, altered, { mode: 0o600 });
  await expect(checkInstallation(workspace, vault, id)).rejects.toThrow(
    "CONFIGURATION_CONFLICT",
  );
  expect(await readFile(configPath, "utf8")).toBe(altered);
  await writeFile(configPath, config, { mode: 0o600 });
  await writeFile(join(p.skillDir, "SKILL.md"), installedSkill + "\nUser edit");
  await expect(checkInstallation(workspace, vault, id)).rejects.toThrow(
    "CONFIGURATION_CONFLICT",
  );
  await writeFile(join(p.skillDir, "SKILL.md"), installedSkill);
  await expect(plan()).rejects.toThrow("CONFIGURATION_CONFLICT");
  await uninstall(workspace, vault, id);
  expect(await readFile(configPath, "utf8")).toBe(original);
  await expect(stat(join(p.skillDir, "SKILL.md"))).rejects.toThrow();
  await expect(stat(join(vault, id + ".json"))).rejects.toThrow();
});
it("preserves concurrent config edits and existing Skills or symlink paths without overwriting them", async () => {
  const p = await plan();
  await writeFile(p.configPath, 'model="edited-elsewhere"\n', { mode: 0o600 });
  await expect(applyInstall(p, vault)).rejects.toThrow("INSTALLATION_FAILED");
  expect(await readFile(p.configPath, "utf8")).toBe(
    'model="edited-elsewhere"\n',
  );
  await mkdir(p.skillDir);
  await writeFile(join(p.skillDir, "SKILL.md"), "existing custom Skill");
  await expect(plan()).rejects.toThrow("CONFIGURATION_CONFLICT");
  await rm(join(workspace, ".codex"), { recursive: true });
  await symlink(temp, join(workspace, ".codex"));
  await expect(plan()).rejects.toThrow("CONFIGURATION_CONFLICT");
});
it("exchanges only by a bounded POST with no redirects, cookies, retries or secret diagnostics", async () => {
  const input = {
    grantId: randomUUID(),
    projectId: value.projectId,
    code: "sbc_" + randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    state: randomBytes(32).toString("base64url"),
    callbackPort: 49152,
  };
  const response = {
    data: {
      id: value.tokenId,
      projectId: value.projectId,
      name: "Test",
      scopes: ["approved_specs:read"],
      createdAt: new Date().toISOString(),
      expiresAt: value.expiresAt,
      revokedAt: null,
      status: "ACTIVE",
      token: value.token,
    },
    meta: { requestId: randomUUID() },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(response));
  expect(
    await exchangeCode(value.apiOrigin, workspace, input, undefined, fetcher),
  ).toEqual(value);
  expect(fetcher.mock.calls[0][0]).toBe(
    value.apiOrigin + "/api/v1/agent-connections/exchange",
  );
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    method: "POST",
    redirect: "manual",
    credentials: "omit",
    cache: "no-store",
  });
  for (const status of [401, 409, 429, 503, 302]) {
    fetcher.mockResolvedValueOnce(new Response(value.token, { status }));
    await expect(
      exchangeCode(value.apiOrigin, workspace, input, undefined, fetcher),
    ).rejects.toThrow(
      status >= 500 || status === 302
        ? "EXCHANGE_UNKNOWN"
        : "EXCHANGE_REJECTED",
    );
  }
  for (const response of [
    Response.json({ data: { token: value.token } }),
    new Response("x".repeat(8193), {
      headers: { "content-type": "application/json" },
    }),
  ]) {
    fetcher.mockResolvedValueOnce(response);
    await expect(
      exchangeCode(value.apiOrigin, workspace, input, undefined, fetcher),
    ).rejects.toThrow("EXCHANGE_UNKNOWN");
  }
  expect(fetcher).toHaveBeenCalledTimes(8);
});
it("uses a real native POST without browser metadata and bounds an interrupted response", async () => {
  let browserHeader = false,
    requests = 0;
  const server = createServer((req, res) => {
    requests++;
    browserHeader = Object.keys(req.headers).some(
      (k) =>
        k.startsWith("sec-fetch-") ||
        ["cookie", "authorization", "origin"].includes(k),
    );
    req.resume();
    if (requests === 1) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end("{}");
    } else {
      res.writeHead(200, { "content-type": "application/json" });
      res.write("{");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  const input = {
    grantId: randomUUID(),
    projectId: value.projectId,
    code: "sbc_" + randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    state: randomBytes(32).toString("base64url"),
    callbackPort: 49152,
  };
  try {
    await expect(
      exchangeCode(`http://127.0.0.1:${address.port}`, workspace, input),
    ).rejects.toThrow("EXCHANGE_REJECTED");
    expect(browserHeader).toBe(false);
    await expect(
      exchangeCode(
        `http://127.0.0.1:${address.port}`,
        workspace,
        input,
        AbortSignal.timeout(30),
      ),
    ).rejects.toThrow("EXCHANGE_UNKNOWN");
    expect(requests).toBe(2);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
