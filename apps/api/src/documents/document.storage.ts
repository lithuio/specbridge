import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { constants } from 'node:fs';
import { mkdir, open, lstat, unlink, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

@Injectable()
export class DocumentStorage {
  // Never under Next public or derived from an uploaded filename. Server deployment config only.
  readonly root = resolve(
    process.env.DOCUMENT_STORAGE_DIR ??
      join(homedir(), '.local/share/specbridge/documents'),
  );
  private path(id: string) {
    if (!z.uuid().safeParse(id).success)
      throw new ServiceUnavailableException();
    return join(this.root, id.toLowerCase());
  }
  async put(id: string, bytes: Buffer) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const actual = await realpath(this.root);
    const repository = await realpath(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'),
    );
    if (actual === repository || actual.startsWith(repository + sep))
      throw new ServiceUnavailableException();
    const stat = await lstat(this.root);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      (stat.mode & 0o077) !== 0
    )
      throw new ServiceUnavailableException();
    const file = await open(
      this.path(id),
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
  }
  async remove(id: string) {
    try {
      await unlink(this.path(id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new ServiceUnavailableException();
    }
  }
}
