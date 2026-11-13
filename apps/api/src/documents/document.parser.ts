import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOCUMENT_LIMITS,
  parsedDocument,
  documentErrors,
  type ParsedDocument,
  type DocumentError,
} from './document.contract.js';

export class ParseFailure extends Error {
  constructor(readonly code: DocumentError) {
    super(code);
  }
}
@Injectable()
export class DocumentParser {
  async parse(bytes: Buffer, mediaType: string): Promise<ParsedDocument> {
    // Works from source (Vitest) and dist; script stays a deployed API asset.
    if (process.platform !== 'linux') throw new ParseFailure('PARSE_FAILED');
    const here = dirname(fileURLToPath(import.meta.url));
    const api = resolve(here, '../..');
    const script = resolve(api, 'scripts/document-parser.mjs');
    const modules = await realpath(resolve(api, '../../node_modules'));
    return new Promise((accept, reject) => {
      const child = spawn(
        '/usr/bin/prlimit',
        [
          '--cpu=10:10',
          '--nofile=64:64',
          '--fsize=0:0',
          '--',
          process.execPath,
          '--max-old-space-size=128',
          '--disable-proto=throw',
          '--permission',
          `--allow-fs-read=${script}`,
          `--allow-fs-read=${modules}`,
          `--allow-fs-read=${resolve(api, 'node_modules')}`,
          script,
          mediaType,
        ],
        {
          cwd: api,
          env: { LANG: 'C.UTF-8', TZ: 'UTC' },
          stdio: ['pipe', 'pipe', 'ignore'],
        },
      );
      let size = 0;
      const output: Buffer[] = [];
      let failure: DocumentError | undefined;
      const stop = (code: DocumentError) => {
        failure ??= code;
        child.kill('SIGKILL');
      };
      const timer = setTimeout(
        () => stop('PARSE_TIMEOUT'),
        DOCUMENT_LIMITS.timeoutMs,
      );
      // V8 heap limits do not bound native Buffers. Enforce a separate Linux RSS ceiling.
      const memory = setInterval(() => {
        if (child.pid)
          void readFile(`/proc/${child.pid}/status`, 'utf8')
            .then((s) => {
              const rss = /VmRSS:\s+(\d+)/.exec(s);
              if (rss && Number(rss[1]) > 256 * 1024) stop('PARSE_LIMIT');
            })
            .catch((error: NodeJS.ErrnoException) => {
              // A vanished child is normal; missing permission to monitor memory is not.
              if (error.code !== 'ENOENT') stop('PARSE_FAILED');
            });
      }, 50);
      child.stdout.on('data', (part: Buffer) => {
        size += part.length;
        if (size > DOCUMENT_LIMITS.outputBytes) stop('PARSE_LIMIT');
        else output.push(part);
      });
      child.stdin.on('error', () => {
        /* Child failure is reported only as a fixed code. */
      });
      child.on('error', () => {
        failure = 'PARSE_FAILED';
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        clearInterval(memory);
        if (failure || code !== 0)
          return reject(new ParseFailure(failure ?? 'PARSE_LIMIT'));
        try {
          const raw: unknown = JSON.parse(
            Buffer.concat(output).toString('utf8'),
          );
          const result = parsedDocument.safeParse(raw);
          if (result.success) return accept(result.data);
          const error = documentErrors.safeParse(
            (raw as { error?: unknown })?.error,
          );
          reject(new ParseFailure(error.success ? error.data : 'PARSE_FAILED'));
        } catch {
          reject(new ParseFailure('PARSE_FAILED'));
        }
      });
      child.stdin.end(bytes);
    });
  }
}
