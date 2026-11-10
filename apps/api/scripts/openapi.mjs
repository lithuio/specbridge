import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import { createDocument } from '../dist/openapi/document.js';
const root = resolve('../..');
const check = process.argv.includes('--check');
const output = check
  ? await mkdtemp(join(tmpdir(), 'specbridge-contract-'))
  : root;
const sort = (value) =>
  Array.isArray(value)
    ? value.map(sort)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b, 'en'))
            .map(([k, v]) => [k, sort(v)]),
        )
      : value;
const doc = sort(await createDocument());
const artifacts = [
  ['docs/architecture/openapi.json', JSON.stringify(doc, null, 2) + '\n'],
  [
    'apps/web/src/lib/api/generated/schema.d.ts',
    astToString(await openapiTS(doc, { alphabetize: true })),
  ],
];
for (const [path, content] of artifacts) {
  const target = join(output, path);
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, content);
  if (check && (await readFile(join(root, path), 'utf8')) !== content)
    throw new Error(`Contract drift: ${path}`);
}
console.log(
  `${check ? 'PASS contract drift check' : 'Generated OpenAPI and Web types'} (${Object.keys(doc.paths).length} paths)`,
);
