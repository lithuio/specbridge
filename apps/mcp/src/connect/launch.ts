import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readCredential } from "./credentials.js";

// Generated Codex config passes a directory/profile ID, never the Token itself.
try {
  if (process.argv.length !== 4) throw new Error();
  const value = await readCredential(process.argv[2], process.argv[3]);
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("../main.js", import.meta.url))],
    {
      cwd: value.workspace,
      env: {
        SPECBRIDGE_API_BASE_URL: value.apiOrigin,
        SPECBRIDGE_PROJECT_ID: value.projectId,
        SPECBRIDGE_API_TOKEN: value.token,
      },
      stdio: "inherit",
    },
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => child.kill(signal));
  child.once("error", () => {
    process.stderr.write("[specbridge-connect] launch failed\n");
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} catch {
  process.stderr.write(
    "[specbridge-connect] credential unavailable; reconnect using the installer\n",
  );
  process.exitCode = 1;
}
