import { BadRequestException, HttpException } from '@nestjs/common';
import { z } from 'zod';

export const DOCUMENT_LIMITS = {
  bytes: 10 * 1024 * 1024,
  projectBytes: 100 * 1024 * 1024,
  documents: 20,
  chars: 500_000,
  chunks: 1000,
  chunkChars: 2000,
  pages: 500,
  timeoutMs: 15_000,
  outputBytes: 3 * 1024 * 1024,
} as const;
export const documentErrors = z.enum([
  'UNSUPPORTED_FILE',
  'INVALID_FILE',
  'NO_TEXT',
  'PARSE_LIMIT',
  'PARSE_TIMEOUT',
  'PARSE_FAILED',
  'INTERRUPTED',
]);
export type DocumentError = z.infer<typeof documentErrors>;
export const chunkSchema = z
  .strictObject({
    locatorKind: z.enum(['page', 'paragraph']),
    locatorStart: z.number().int().min(1).max(500_000),
    locatorEnd: z.number().int().min(1).max(500_000),
    content: z.string().trim().min(1).max(DOCUMENT_LIMITS.chunkChars),
  })
  .refine(
    (c) =>
      c.locatorEnd >= c.locatorStart &&
      (c.locatorKind !== 'page' || c.locatorEnd <= DOCUMENT_LIMITS.pages),
  );
export const parsedDocument = z
  .strictObject({
    chunks: z.array(chunkSchema).min(1).max(DOCUMENT_LIMITS.chunks),
    parserVersion: z.string().min(1).max(80),
  })
  .refine(
    (v) =>
      v.chunks.reduce((n, c) => n + Array.from(c.content).length, 0) <=
      DOCUMENT_LIMITS.chars,
  );
export type ParsedDocument = z.infer<typeof parsedDocument>;
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const uploadFields = z
  .strictObject({
    documentId: uuid.optional(),
    expectedVersion: z
      .string()
      .regex(/^[1-9]\d{0,8}$/)
      .transform(Number)
      .optional(),
  })
  .refine((v) => !!v.documentId === (v.expectedVersion !== undefined));
export const documentUpdate = z
  .strictObject({
    expectedVersion: z.number().int().positive(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    sharedVersionId: uuid.nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.sharedVersionId !== undefined);
export const documentPage = z.strictObject({
  offset: z.coerce.number().int().min(0).max(1000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export function parseDocumentInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException();
  return result.data;
}
export function documentFailure(
  code:
    | 'DOCUMENT_QUOTA'
    | 'DOCUMENT_PROCESSING'
    | 'DOCUMENT_STALE'
    | 'DOCUMENT_UNAVAILABLE',
  status = 409,
): never {
  throw new HttpException({ code }, status);
}
export const mediaTypes = {
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
} as const;
