import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { z } from 'zod';

const uuid = z.uuid().transform((value) => value.toLowerCase());
const version = z.number().int().min(1).max(2147483647);
const draftVersion = z.number().int().min(0).max(2147483647);
const text = (max: number) => z.string().trim().min(1).max(max);
const notes = z.array(text(500)).max(10);

// A work product is private to its author. It is not a RequirementRevision,
// a clarification, a conversation archive or evidence of client agreement.
export const workingDraftKind = z.enum(['clarify', 'specification']);
export const clarificationDraftBody = z.strictObject({
  questions: z
    .array(
      z.strictObject({
        id: uuid,
        body: text(10000),
        reason: z.string().trim().max(500),
      }),
    )
    .max(10)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
    ),
  assumptions: notes,
  risks: notes,
});
export const specificationDraftBody = z.strictObject({
  content: z.string().trim().max(20000),
  acceptanceCriteria: z.array(text(1000)).max(100),
  openQuestions: notes,
  assumptions: notes,
  risks: notes,
});
export const workingDraftBody = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('clarify'), body: clarificationDraftBody }),
  z.strictObject({
    kind: z.literal('specification'),
    body: specificationDraftBody,
  }),
]);
export type WorkingDraftBody = z.infer<typeof workingDraftBody>;
export type WorkingDraftKind = z.infer<typeof workingDraftKind>;

export const saveWorkingDraft = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('clarify'),
    // Zero creates the author's first draft of this kind; positive values are CAS.
    expectedDraftVersion: draftVersion,
    draftId: uuid.nullable(),
    baseRequirementVersion: version,
    body: clarificationDraftBody,
  }),
  z.strictObject({
    kind: z.literal('specification'),
    expectedDraftVersion: draftVersion,
    draftId: uuid.nullable(),
    baseRequirementVersion: version,
    body: specificationDraftBody,
  }),
]);
export const publishWorkingDraft = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('clarify'),
    operationId: uuid,
    expectedDraftVersion: version,
    draftId: uuid,
    expectedVersion: version,
    questionIds: z
      .array(uuid)
      .min(1)
      .max(10)
      .refine((items) => new Set(items).size === items.length),
  }),
  z.strictObject({
    kind: z.literal('specification'),
    operationId: uuid,
    expectedDraftVersion: version,
    draftId: uuid,
    expectedVersion: version,
  }),
]);
export const deleteWorkingDraft = z.strictObject({
  draftId: uuid,
  expectedDraftVersion: version,
});
export const parseDeleteWorkingDraft = (value: unknown) =>
  parse(deleteWorkingDraft, value);
export type SaveWorkingDraft = z.infer<typeof saveWorkingDraft>;
export type PublishWorkingDraft = z.infer<typeof publishWorkingDraft>;

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException();
  // Also bounds combined manual text and multibyte input, inside the 100 KiB route budget.
  if (Buffer.byteLength(JSON.stringify(result.data)) > 96 * 1024)
    throw new PayloadTooLargeException();
  return result.data;
}
export const parseSaveWorkingDraft = (value: unknown) => {
  const input = parse(saveWorkingDraft, value);
  if ((input.expectedDraftVersion === 0) !== (input.draftId === null))
    throw new BadRequestException();
  return input;
};
export const parsePublishWorkingDraft = (value: unknown) =>
  parse(publishWorkingDraft, value);
