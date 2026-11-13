import { parseArgs } from "node:util";
import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { attempt, ConnectionFault, origin, uuid } from "./protocol.js";
import { listenForApproval } from "./callback.js";
import {
  connectionId,
  credentialDirectory,
  readCredential,
  writeCredential,
} from "./credentials.js";
import {
  applyInstall,
  checkInstallation,
  prepareInstall,
  safeText,
  uninstall,
} from "./configuration.js";
import { exchangeCode } from "./exchange.js";
import { diagnose } from "./diagnostics.js";
const launcher = fileURLToPath(new URL("./launch.js", import.meta.url));
const skill = fileURLToPath(
  new URL("../../../../skills/requirement-analyst/SKILL.md", import.meta.url),
);
const print = (value: string) => process.stdout.write(value + "\n");
const run = (command: string, args: string[], env: NodeJS.ProcessEnv) =>
  new Promise<void>((resolve, reject) =>
    execFile(
      command,
      args,
      { env, timeout: 5000, maxBuffer: 32 * 1024 },
      (error) =>
        error ? reject(new ConnectionFault("INSTALLATION_FAILED")) : resolve(),
    ),
  );
async function main() {
  const { values } = parseArgs({
    strict: true,
    allowPositionals: false,
    options: {
      "api-origin": { type: "string" },
      "web-origin": { type: "string" },
      project: { type: "string" },
      workspace: { type: "string" },
      "credential-dir": { type: "string" },
      "no-browser": { type: "boolean" },
      uninstall: { type: "boolean" },
      status: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    print(
      "SpecBridge: --api-origin <origin> --web-origin <origin> --project <UUID> --workspace <directory> [--no-browser|--status|--uninstall] [--credential-dir <private directory>]",
    );
    return;
  }
  if (
    process.platform !== "linux" ||
    !process.versions.node.startsWith("22.") ||
    !values.project ||
    !values.workspace ||
    !values["api-origin"] ||
    (values.status && values.uninstall)
  )
    throw new ConnectionFault("INVALID_INPUT");
  const apiOrigin = origin(values["api-origin"]),
    projectId = uuid.parse(values.project),
    workspace = await realpath(resolve(values.workspace));
  const vault = resolve(
    values["credential-dir"] ??
      join(homedir(), ".local/share/specbridge/connections"),
  );
  const id = connectionId(apiOrigin, projectId, workspace);
  if (values.uninstall) {
    await uninstall(workspace, vault, id);
    print(
      "已移除本地连接。本次卸载不执行远端撤销，请在项目「访问凭据」核对并撤销Token。",
    );
    return;
  }
  // Reject unsafe/unwritable storage before asking the Owner to issue a Token.
  await credentialDirectory(vault, workspace, !values.status);
  const existing = await safeText(join(vault, `${id}.json`), 8192);
  if (existing || values.status) {
    const value = await readCredential(vault, id);
    await checkInstallation(workspace, vault, id);
    await diagnose(launcher, vault, id, value.projectId);
    print("现有只读连接可用。未创建新Token或修改配置。");
    return;
  }
  const webOrigin = origin(values["web-origin"]);
  const cleanEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: homedir(),
  };
  await run("codex", ["--version"], cleanEnv);
  const plan = await prepareInstall(
    workspace,
    vault,
    id,
    launcher,
    skill,
    projectId,
  );
  print(
    `将在目标目录配置 ${plan.manifest.serverName} 和 requirement-analyst；保留已有设置，不更改项目信任。`,
  );
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  const p = attempt();
  const listener = await listenForApproval({
    ...p,
    projectId,
    webOrigin,
    signal: controller.signal,
  });
  const start = `http://127.0.0.1:${listener.port}/start`;
  // Only this local non-secret address is printed. Codes/state/verifier/Token are never output.
  print(`连接指纹：${p.challenge.slice(0, 12)}；项目：${projectId}`);
  print(`请在本机浏览器打开并由Owner确认：${start}`);
  let issued = false;
  try {
    if (!values["no-browser"]) {
      const env = {
        ...cleanEnv,
        DISPLAY: process.env.DISPLAY,
        WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,
        XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
        DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
        WSL_INTEROP: process.env.WSL_INTEROP,
        WSL_DISTRO_NAME: process.env.WSL_DISTRO_NAME,
      };
      await run(
        process.env.WSL_DISTRO_NAME ? "wslview" : "xdg-open",
        [start],
        env,
      ).catch(() => print("未能自动打开浏览器，请手动打开上面的本机地址。"));
    }
    const callback = await listener.result;
    const value = await exchangeCode(
      apiOrigin,
      workspace,
      {
        ...callback,
        projectId,
        verifier: p.verifier,
        callbackPort: listener.port,
      },
      controller.signal,
    );
    issued = true;
    await writeCredential(vault, value);
    const checked = await diagnose(launcher, vault, id, projectId);
    await applyInstall(plan, vault);
    print(
      `连接成功${checked.approvedEntries === 0 ? "，暂无批准规格" : ""}。重开Codex并按其原有信任提示操作；可使用 requirement-analyst。`,
    );
  } catch (error) {
    if (
      issued ||
      (error instanceof ConnectionFault && error.code === "EXCHANGE_UNKNOWN")
    )
      print(
        `安装结果需要核对：授权记录 ${p.grantId}。请到项目「访问凭据」查询并撤销可能已创建的Token，再明确重连；不要重复运行发放。`,
      );
    throw error;
  } finally {
    listener.close();
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
  }
}
main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof ConnectionFault ? error.message : "[specbridge-connect] invalid configuration or installation failure"}\n`,
  );
  process.exitCode = 1;
});
