import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  rename,
  unlink,
  realpath,
  readFile,
  rmdir,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { parse, stringify } from "smol-toml";
import { z } from "zod";
import { ConnectionFault } from "./protocol.js";
import { credentialDirectory } from "./credentials.js";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
function conflict(): never {
  throw new ConnectionFault("CONFIGURATION_CONFLICT");
}
const decode = (s: string) => parse(s, { integersAsBigInt: true });
const manifestSchema = z.strictObject({
  format: z.literal(1),
  id: z.string().regex(/^[a-f0-9]{64}$/),
  workspace: z.string(),
  serverName: z.string(),
  block: z.string(),
  skillHash: z.string().regex(/^[a-f0-9]{64}$/),
  skillOwned: z.boolean(),
  configCreated: z.boolean(),
});
type Manifest = z.infer<typeof manifestSchema>;
async function safeDirectory(path: string, create = true) {
  const absolute = resolve(path);
  let current = "/";
  for (const part of absolute.slice(1).split("/")) {
    current = join(current, part);
    if (create)
      try {
        await mkdir(current, { mode: 0o700 });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      }
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) conflict();
  }
  const info = await lstat(absolute);
  if (info.uid !== process.getuid?.() || (info.mode & 0o022) !== 0) conflict();
}
export async function safeText(
  path: string,
  max = 128 * 1024,
): Promise<{ text: string; mode: number } | null> {
  let file;
  try {
    file = await open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    conflict();
  }
  try {
    const s = await file!.stat();
    if (
      !s.isFile() ||
      s.uid !== process.getuid?.() ||
      s.nlink !== 1 ||
      (s.mode & 0o022) !== 0 ||
      s.size > max
    )
      conflict();
    const buffer = Buffer.alloc(max + 1);
    const { bytesRead } = await file!.read(buffer, 0, buffer.length, 0);
    if (bytesRead > max) conflict();
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(
        buffer.subarray(0, bytesRead),
      ),
      mode: s.mode & 0o777,
    };
  } finally {
    await file!.close();
  }
}
async function replace(
  path: string,
  before: { text: string; mode: number } | null,
  after: string | null,
) {
  const now = await safeText(path);
  if (!isDeepStrictEqual(now, before)) conflict();
  if (after === null) {
    if (now) await unlink(path);
    return;
  }
  const tmp = path + "." + randomUUID() + ".tmp";
  const file = await open(tmp, "wx", before?.mode ?? 0o600);
  try {
    await file.writeFile(after);
    await file.sync();
  } finally {
    await file.close();
  }
  try {
    if (!isDeepStrictEqual(await safeText(path), before)) conflict();
    await rename(tmp, path);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}
export function addServer(
  existing: string,
  name: string,
  config: Record<string, unknown>,
  id: string,
) {
  try {
    const before = decode(existing);
    const servers = before.mcp_servers;
    if (
      servers !== undefined &&
      (!servers || typeof servers !== "object" || Array.isArray(servers))
    )
      conflict();
    if (
      Object.keys((servers ?? {}) as object).some((key) =>
        key.startsWith("specbridge_"),
      )
    )
      conflict();
    const block = `\n# specbridge ${id} begin\n${stringify({ mcp_servers: { [name]: config } })}# specbridge ${id} end\n`;
    const output = existing + block,
      after = decode(output);
    const expected = decode(stringify({ mcp_servers: { [name]: config } }));
    const next = after.mcp_servers as Record<string, unknown>;
    if (
      !isDeepStrictEqual(
        next[name],
        (expected.mcp_servers as Record<string, unknown>)[name],
      )
    )
      conflict();
    delete next[name];
    if (servers === undefined && !Object.keys(next).length)
      delete after.mcp_servers;
    if (!isDeepStrictEqual(before, after)) conflict();
    return { output, block };
  } catch {
    return conflict();
  }
}
export function removeServer(
  existing: string,
  manifest: Pick<Manifest, "id" | "serverName" | "block">,
) {
  try {
    const at = existing.indexOf(manifest.block);
    if (at < 0 || existing.indexOf(manifest.block, at + 1) >= 0) conflict();
    const before = decode(existing),
      afterText =
        existing.slice(0, at) + existing.slice(at + manifest.block.length),
      after = decode(afterText);
    const servers = before.mcp_servers as Record<string, unknown>;
    if (!servers || !Object.hasOwn(servers, manifest.serverName)) conflict();
    delete servers[manifest.serverName];
    if (!Object.keys(servers).length && after.mcp_servers === undefined)
      delete before.mcp_servers;
    if (!isDeepStrictEqual(before, after)) conflict();
    return afterText;
  } catch {
    return conflict();
  }
}
export async function prepareInstall(
  workspace: string,
  vault: string,
  id: string,
  launcher: string,
  skillSource: string,
  projectId: string,
) {
  try {
    workspace = await realpath(workspace);
    const codex = join(workspace, ".codex"),
      skillDir = join(workspace, ".agents/skills/requirement-analyst");
    await safeDirectory(codex);
    await safeDirectory(dirname(skillDir));
    const configPath = join(codex, "config.toml"),
      before = await safeText(configPath);
    const serverName = `specbridge_${id.slice(0, 16)}`;
    const added = addServer(
      before?.text ?? "",
      serverName,
      {
        command: process.execPath,
        args: [launcher, vault, id],
        startup_timeout_sec: 15,
        tool_timeout_sec: 15,
        enabled_tools: ["list_project_requirements", "get_approved_spec"],
      },
      id,
    );
    const source = await readFile(skillSource, "utf8");
    const skill =
      source +
      `\n## This workspace connection\n\nUse the MCP server \`${serverName}\` for project \`${projectId}\`. Verify this project ID in every result. Local connection setup and credential files are outside this Skill's scope.\n`;
    const skillStat = await lstat(skillDir).catch(
      (e: NodeJS.ErrnoException) => {
        if (e.code !== "ENOENT") throw e;
        return null;
      },
    );
    if (
      skillStat &&
      (!skillStat.isDirectory() ||
        skillStat.isSymbolicLink() ||
        skillStat.uid !== process.getuid?.() ||
        skillStat.mode & 0o022)
    )
      conflict();
    const priorSkill = await safeText(join(skillDir, "SKILL.md"));
    if (priorSkill && priorSkill.text !== skill) conflict();
    // Do not take ownership of an existing nonempty Skill directory.
    if (skillStat && !priorSkill) conflict();
    const manifest: Manifest = {
      format: 1,
      id,
      workspace,
      serverName,
      block: added.block,
      skillHash: hash(skill),
      skillOwned: !priorSkill,
      configCreated: before === null,
    };
    return {
      configPath,
      before,
      output: added.output,
      skillDir,
      skill,
      priorSkill,
      manifest,
    };
  } catch (error) {
    if (error instanceof ConnectionFault) throw error;
    return conflict();
  }
}
export async function applyInstall(
  plan: Awaited<ReturnType<typeof prepareInstall>>,
  vault: string,
) {
  const lockPath = join(dirname(plan.configPath), "specbridge-install.lock");
  let lock;
  let configWritten = false,
    skillWritten = false;
  try {
    lock = await open(lockPath, "wx", 0o600);
    if (await safeText(join(vault, `${plan.manifest.id}.install.json`)))
      conflict();
    await replace(plan.configPath, plan.before, plan.output);
    configWritten = true;
    if (!plan.priorSkill) {
      await mkdir(plan.skillDir, { mode: 0o700 });
      await replace(join(plan.skillDir, "SKILL.md"), null, plan.skill);
      skillWritten = true;
    }
    await replace(
      join(vault, `${plan.manifest.id}.install.json`),
      null,
      JSON.stringify(plan.manifest) + "\n",
    );
  } catch {
    if (skillWritten) {
      const s = await safeText(join(plan.skillDir, "SKILL.md")).catch(
        () => null,
      );
      if (s?.text === plan.skill) {
        await unlink(join(plan.skillDir, "SKILL.md"));
        await rmdir(plan.skillDir).catch(() => {});
      }
    }
    if (configWritten)
      await replace(
        plan.configPath,
        { text: plan.output, mode: plan.before?.mode ?? 0o600 },
        plan.before?.text ?? null,
      ).catch(() => {});
    throw new ConnectionFault("INSTALLATION_FAILED");
  } finally {
    if (lock) {
      await lock.close();
      await unlink(lockPath).catch(() => {});
    }
  }
}
export async function uninstall(workspace: string, vault: string, id: string) {
  let lock;
  let lockPath = "";
  try {
    if (!/^[a-f0-9]{64}$/.test(id)) conflict();
    await credentialDirectory(vault, workspace);
    const manifestPath = join(vault, `${id}.install.json`),
      raw = await safeText(manifestPath, 32 * 1024);
    if (!raw) conflict();
    const manifest = manifestSchema.parse(JSON.parse(raw.text));
    if (
      manifest.id !== id ||
      manifest.workspace !== (await realpath(workspace)) ||
      manifest.serverName !== `specbridge_${id.slice(0, 16)}`
    )
      conflict();
    const configPath = join(manifest.workspace, ".codex/config.toml"),
      skillPath = join(
        manifest.workspace,
        ".agents/skills/requirement-analyst/SKILL.md",
      );
    await safeDirectory(dirname(configPath));
    await safeDirectory(dirname(skillPath));
    lockPath = join(dirname(configPath), "specbridge-install.lock");
    lock = await open(lockPath, "wx", 0o600);
    const before = await safeText(configPath);
    if (!before) conflict();
    const after = removeServer(before.text, manifest),
      skill = await safeText(skillPath);
    if (
      manifest.skillOwned &&
      (!skill || hash(skill.text) !== manifest.skillHash)
    )
      conflict();
    await replace(
      configPath,
      before,
      manifest.configCreated && after === "" ? null : after,
    );
    if (manifest.skillOwned && skill) {
      await replace(skillPath, skill, null);
      await rmdir(dirname(skillPath)).catch(() => {});
    }
    const credentialPath = join(vault, `${id}.json`);
    const secret = await safeText(credentialPath, 8192);
    if (secret) await replace(credentialPath, secret, null);
    await replace(manifestPath, raw, null);
  } catch {
    throw new ConnectionFault("CONFIGURATION_CONFLICT");
  } finally {
    if (lock) {
      await lock.close();
      await unlink(lockPath).catch(() => {});
    }
  }
}

export async function checkInstallation(
  workspace: string,
  vault: string,
  id: string,
) {
  try {
    await credentialDirectory(vault, workspace);
    if (!/^[a-f0-9]{64}$/.test(id)) conflict();
    const raw = await safeText(join(vault, `${id}.install.json`), 32 * 1024);
    if (!raw) conflict();
    const manifest = manifestSchema.parse(JSON.parse(raw.text));
    if (
      manifest.id !== id ||
      manifest.workspace !== (await realpath(workspace)) ||
      manifest.serverName !== `specbridge_${id.slice(0, 16)}`
    )
      conflict();
    const config = join(workspace, ".codex/config.toml"),
      skill = join(workspace, ".agents/skills/requirement-analyst/SKILL.md");
    await safeDirectory(dirname(config), false);
    await safeDirectory(dirname(skill), false);
    const saved = await safeText(config),
      instructions = await safeText(skill);
    if (
      !saved ||
      !instructions ||
      hash(instructions.text) !== manifest.skillHash
    )
      conflict();
    removeServer(saved.text, manifest); // Validation only: exact block and unrelated TOML semantics.
  } catch {
    conflict();
  }
}
