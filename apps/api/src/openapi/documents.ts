import { z } from 'zod';
import { documentUpdate } from '../documents/document.contract.js';
import {
  obj,
  arr,
  uuid,
  int,
  str,
  en,
  date,
  nullable,
  type Schema,
} from './schemas.js';
const bool: Schema = { type: 'boolean' };
export const backgroundSource = obj({
  documentId: uuid,
  versionId: uuid,
  chunkId: uuid,
  versionNo: int(1),
  title: str,
  locatorKind: en('page', 'paragraph'),
  locatorStart: int(1),
  locatorEnd: int(1),
  href: str,
});
const version = obj({
  id: uuid,
  versionNo: int(1),
  originalName: str,
  mediaType: str,
  sizeBytes: int(1),
  status: en('PROCESSING', 'READY', 'FAILED'),
  errorCode: {
    type: 'string',
    nullable: true,
    enum: [
      'UNSUPPORTED_FILE',
      'INVALID_FILE',
      'NO_TEXT',
      'PARSE_LIMIT',
      'PARSE_TIMEOUT',
      'PARSE_FAILED',
      'INTERRUPTED',
      null,
    ],
  },
  extractedChars: int(),
  createdAt: date,
});
const item: Schema = {
  oneOf: [
    obj({
      id: uuid,
      title: str,
      status: en('ACTIVE', 'INACTIVE'),
      version: int(1),
      currentVersionId: nullable(uuid),
      sharedVersionId: nullable(uuid),
      versions: arr(version),
      historyTruncated: bool,
    }),
    obj({ id: uuid, title: str, sharedVersion: version }),
  ],
};
export const documentOperations = {
  list: {
    response: obj({
      projectRole: en('OWNER', 'DEVELOPER', 'CLIENT'),
      writable: bool,
      items: arr(item),
    }),
  },
  upload: {
    multipart: true,
    body: obj(
      {
        file: { type: 'string', format: 'binary' },
        documentId: uuid,
        expectedVersion: { type: 'string', pattern: '^[1-9]\\d{0,8}$' },
      },
      ['documentId', 'expectedVersion'],
    ),
    response: obj({
      documentId: uuid,
      versionId: uuid,
      status: en('READY', 'FAILED'),
      errorCode: nullable(str),
    }),
  },
  update: {
    body: z.toJSONSchema(documentUpdate, {
      io: 'input',
      target: 'openapi-3.0',
    }) as Schema,
    response: obj({ id: uuid, version: int(1) }),
  },
  read: {
    query: { offset: int(0, 1000), limit: int(1, 50) },
    response: obj({
      documentId: uuid,
      version,
      chunks: arr(
        obj({
          id: uuid,
          ordinal: int(1),
          locatorKind: en('page', 'paragraph'),
          locatorStart: int(1),
          locatorEnd: int(1),
          content: str,
        }),
      ),
      hasMore: bool,
    }),
  },
};
