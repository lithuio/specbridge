import {
  serveStdio,
  StdioServerTransport,
  type StdioServerHandle,
} from "@modelcontextprotocol/server/stdio";
import { McpConfig } from "./config.js";
import { createServer } from "./server.js";

// stdout is reserved for SDK JSON-RPC. Never print config, exceptions or request bodies.
let handle: StdioServerHandle | undefined;
const fail = () => {
  process.stderr.write("[specbridge-mcp] startup or protocol failure\n");
  process.exitCode = 1;
  void handle?.close();
};
try {
  if (process.argv.length !== 2) throw new Error();
  const config = new McpConfig(process.env);
  delete process.env.SPECBRIDGE_API_TOKEN;
  handle = serveStdio(() => createServer(config), {
    transport: new StdioServerTransport(process.stdin, process.stdout, {
      maxBufferSize: 64 * 1024,
    }),
    onerror: () => process.stderr.write("[specbridge-mcp] protocol error\n"),
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void handle?.close().catch(fail);
    });
} catch {
  fail();
}
