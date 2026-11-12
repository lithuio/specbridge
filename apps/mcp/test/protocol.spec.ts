import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
const main = resolve("dist/main.js");
const token = `sbp_${randomBytes(32).toString("base64url")}`;
const env = {
  SPECBRIDGE_API_BASE_URL: "http://127.0.0.1:1",
  SPECBRIDGE_PROJECT_ID: randomUUID(),
  SPECBRIDGE_API_TOKEN: token,
};
it("uses a real SDK client and child process to discover exactly two strict read tools", async () => {
  const client = new Client({
    name: "specbridge-protocol-test",
    version: "1.0.0",
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [main],
    env,
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_approved_spec",
      "list_project_requirements",
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.outputSchema).toBeTruthy();
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      });
    }
    const rejected = await client.callTool({
      name: "list_project_requirements",
      arguments: { projectId: randomUUID() },
    });
    expect(rejected.isError).toBe(true);
    await expect(
      client.callTool({ name: "approve_change_request", arguments: {} }),
    ).rejects.toThrow();
  } finally {
    await client.close();
  }
  expect(stderr.includes(token)).toBe(false);
});
it("fails closed on missing configuration and non-protocol startup arguments without logging secrets", async () => {
  for (const args of [[], ["--unknown"]]) {
    const child = spawn(process.execPath, [main, ...args], {
      env: { ...env, SPECBRIDGE_PROJECT_ID: "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (c) => {
      stdout += String(c);
    });
    child.stderr.on("data", (c) => {
      stderr += String(c);
    });
    const status = await new Promise<number | null>((resolve) =>
      child.once("close", resolve),
    );
    expect(status).toBe(1);
    expect(stdout).toBe("");
    expect(stderr.includes(token)).toBe(false);
    expect(stderr).toContain("startup or protocol failure");
  }
});
