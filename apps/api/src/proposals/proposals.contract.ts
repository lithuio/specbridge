import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { z } from 'zod';
import { currencies } from '../changes/changes.dto.js';
import { specificationDraftBody } from '../requirements/working-draft.contract.js';
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const proposalVersion = z.number().int().min(1).max(2147483647);
const changeVersion = z.number().int().min(0).max(2147483647);
const text = (max: number) => z.string().trim().min(1).max(max);
const notes = z.array(text(500)).max(10);
export const proposalKind = z.enum([
  'publish_questions',
  'create_revision',
  'create_change_draft',
  'update_change_draft',
]);
export type ProposalKind = z.infer<typeof proposalKind>;
export const questionPayload = z.strictObject({
  questions: z
    .array(
      z.strictObject({
        id: uuid,
        body: text(10000),
        reason: z.string().trim().max(500),
        selected: z.boolean(),
      }),
    )
    .max(10)
    .refine((q) => new Set(q.map((x) => x.id)).size === q.length),
  assumptions: notes,
  risks: notes,
});
export const commercialPayload = z.strictObject({
  requirementRevisionId: uuid,
  scopeSummary: text(20000).nullable(),
  estimateHours: z
    .string()
    .regex(/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/)
    .nullable(),
  costDeltaMinor: z
    .number()
    .int()
    .min(-Number.MAX_SAFE_INTEGER)
    .max(Number.MAX_SAFE_INTEGER)
    .nullable(),
  currency: z
    .string()
    .refine((v) => currencies.has(v))
    .nullable(),
  scheduleDeltaDays: z
    .number()
    .int()
    .min(-2147483648)
    .max(2147483647)
    .nullable(),
  acceptanceCriteria: z.array(text(1000)).max(100).nullable(),
});
export const proposalContent = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('publish_questions'),
    payload: questionPayload,
  }),
  z.strictObject({
    kind: z.literal('create_revision'),
    payload: specificationDraftBody,
  }),
  z.strictObject({
    kind: z.literal('create_change_draft'),
    payload: commercialPayload,
  }),
  z.strictObject({
    kind: z.literal('update_change_draft'),
    payload: commercialPayload,
  }),
]);
export const prepareProposal = z
  .strictObject({
    kind: proposalKind,
    expectedVersion: proposalVersion,
    source: z.enum(['generate', 'working_draft', 'current']),
    instruction: z.string().trim().max(2000).optional(),
    draftId: uuid.optional(),
    expectedDraftVersion: proposalVersion.optional(),
    changeRequestId: uuid.optional(),
    expectedChangeVersion: changeVersion.optional(),
  })
  .superRefine((v, ctx) => {
    const writing =
      v.kind === 'publish_questions' || v.kind === 'create_revision';
    if (
      (writing && v.source === 'current') ||
      (!writing && v.source !== 'current') ||
      (v.source !== 'generate' && v.instruction !== undefined) ||
      (v.source === 'working_draft'
        ? !v.draftId || v.expectedDraftVersion === undefined
        : v.draftId !== undefined || v.expectedDraftVersion !== undefined) ||
      (v.kind === 'update_change_draft'
        ? !v.changeRequestId || v.expectedChangeVersion === undefined
        : v.changeRequestId !== undefined ||
          v.expectedChangeVersion !== undefined)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid proposal source' });
  });
export const editProposal = z.strictObject({
  expectedProposalVersion: proposalVersion,
  content: proposalContent,
});
export const executeProposal = z.strictObject({
  expectedProposalVersion: proposalVersion,
  expectedVersion: proposalVersion,
  expectedChangeVersion: changeVersion.optional(),
  operationId: uuid,
});
export const deleteProposal = z.strictObject({
  expectedProposalVersion: proposalVersion,
});
export const proposalSource = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('requirement'),
    id: uuid,
    version: proposalVersion,
  }),
  z.strictObject({ type: z.literal('revision'), id: uuid }),
  z.strictObject({
    type: z.literal('document'),
    documentId: uuid,
    versionId: uuid,
    chunkId: uuid,
  }),
  z.strictObject({
    type: z.literal('working_draft'),
    id: uuid,
    version: proposalVersion,
  }),
  z.strictObject({
    type: z.literal('change_request'),
    id: uuid,
    version: changeVersion,
  }),
]);
export const proposalSources = z.array(proposalSource).max(10);
export type ProposalSource = z.infer<typeof proposalSource>;
export function parseProposal<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new BadRequestException();
  // Leave room for JSONB spacing and server metadata under the 96 KiB database bound.
  if (Buffer.byteLength(JSON.stringify(result.data)) > 80 * 1024)
    throw new PayloadTooLargeException();
  return result.data;
}

export const proposalPage = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});
