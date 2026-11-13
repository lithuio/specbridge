import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { listOutput } from "../contracts.js";
import { ConnectionFault } from "./protocol.js";
export async function diagnose(
  launcher: string,
  vault: string,
  id: string,
  projectId: string,
) {
  const client = new Client({ name: "specbridge-installer", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [launcher, vault, id],
    env: {},
    stderr: "pipe",
  });
  // Drain without recording; even unexpected upstream diagnostics must not expose credentials.
  transport.stderr?.on("data", () => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        await client.connect(transport);
        const tools = await client.listTools();
        if (
          tools.tools
            .map((t) => t.name)
            .sort()
            .join(",") !== "get_approved_spec,list_project_requirements" ||
          tools.tools.some((t) => t.annotations?.readOnlyHint !== true)
        )
          throw new Error();
        const result = await client.callTool({
          name: "list_project_requirements",
          arguments: { limit: 1, offset: 0 },
        });
        if (result.isError) throw new Error();
        const list = listOutput.parse(result.structuredContent);
        if (list.projectId !== projectId) throw new Error();
        return {
          approvedEntries: list.items.length,
          hasMore: list.page.hasMore,
        };
      })(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error()), 20_000);
      }),
    ]);
  } catch {
    throw new ConnectionFault("INSTALLATION_FAILED");
  } finally {
    clearTimeout(timer);
    await client.close().catch(() => {});
  }
}
