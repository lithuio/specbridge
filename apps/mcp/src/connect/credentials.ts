import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { ConnectionFault, nonce, origin, uuid } from "./protocol.js";

const credential = z.strictObject({
  format: z.literal(1),
  apiOrigin: z
    .string()
    .max(2048)
    .refine((value) => {
      try {
        return origin(value) === value;
      } catch {
        return false;
      }
    }),
  projectId: uuid,
  tokenId: uuid,
  token: z
    .string()
    .regex(/^sbp_[A-Za-z0-9_-]{43}$/)
    .refine((value) => nonce.safeParse(value.slice(4)).success),
  expiresAt: z.iso.datetime(),
  workspace: z.string().max(4096).refine(isAbsolute),
});
export type Credential = z.infer<typeof credential>;
export function connectionId(
  apiOrigin: string,
  projectId: string,
  workspace: string,
) {
  const project = uuid.safeParse(projectId);
  if (!project.success || !isAbsolute(workspace))
    throw new ConnectionFault("INVALID_INPUT");
  return createHash("sha256")
    .update(
      JSON.stringify([origin(apiOrigin), project.data, resolve(workspace)]),
    )
    .digest("hex");
}
function inside(parent: string, child: string) {
  const path = relative(parent, child);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
}
export async function credentialDirectory(
  root: string,
  workspace: string,
  create = false,
) {
  if (
    process.platform !== "linux" ||
    !process.getuid ||
    !isAbsolute(root) ||
    !isAbsolute(workspace)
  )
    throw new Error();
  const target = resolve(root);
  const work = await realpath(workspace);
  if (inside(work, target)) throw new Error();
  // Reject symlink components and any location inside a Git checkout, even a different checkout.
  let current = parse(target).root;
  for (const part of target.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    if (create)
      await mkdir(current, { mode: 0o700 }).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code !== "EEXIST") throw error;
        },
      );
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error();
    const git = await lstat(join(current, ".git")).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
        return null;
      },
    );
    if (git) throw new Error();
  }
  const info = await lstat(target);
  if (info.uid !== process.getuid() || (info.mode & 0o777) !== 0o700)
    throw new Error();
  return target;
}
export async function writeCredential(
  root: string,
  input: Credential,
): Promise<string> {
  let path: string | undefined;
  let created = false;
  try {
    const value = credential.parse(input);
    if (
      Date.parse(value.expiresAt) <= Date.now() ||
      value.workspace !== (await realpath(value.workspace))
    )
      throw new Error();
    const serialized = JSON.stringify(value) + "\n";
    if (Buffer.byteLength(serialized) > 8192) throw new Error();
    const id = connectionId(value.apiOrigin, value.projectId, value.workspace);
    const target = await credentialDirectory(root, value.workspace, true);
    path = join(target, `${id}.json`);
    const handle = await open(
      path,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    created = true;
    try {
      await handle.writeFile(serialized, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    return id;
  } catch {
    if (created && path) await unlink(path).catch(() => {});
    throw new ConnectionFault("CREDENTIAL_STORE");
  }
}
export async function readCredential(
  root: string,
  id: string,
): Promise<Credential> {
  try {
    if (!/^[a-f0-9]{64}$/.test(id) || !isAbsolute(root)) throw new Error();
    const path = join(root, `${id}.json`);
    const handle = await open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    let raw: string;
    try {
      const info = await handle.stat();
      if (
        !info.isFile() ||
        !process.getuid ||
        info.uid !== process.getuid() ||
        (info.mode & 0o777) !== 0o600 ||
        info.nlink !== 1 ||
        info.size > 8192
      )
        throw new Error();
      // Bound reads even if another same-UID process concurrently extends the file.
      const buffer = Buffer.alloc(8193);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > 8192) throw new Error();
      raw = new TextDecoder("utf-8", { fatal: true }).decode(
        buffer.subarray(0, bytesRead),
      );
    } finally {
      await handle.close();
    }
    const value = credential.parse(JSON.parse(raw));
    await credentialDirectory(root, value.workspace);
    if (
      Date.parse(value.expiresAt) <= Date.now() ||
      value.workspace !== (await realpath(value.workspace)) ||
      id !== connectionId(value.apiOrigin, value.projectId, value.workspace)
    )
      throw new Error();
    return value;
  } catch {
    throw new ConnectionFault("CREDENTIAL_STORE");
  }
}
