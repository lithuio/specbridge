import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { invalidOutput } from './ai.contract.js';
const text = (max: number) => z.string().trim().min(1).max(max);
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const pageSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.enum([
      'overview',
      'dashboard',
      'requirements',
      'changes',
      'deliveries',
      'members',
      'audit',
    ]),
  }),
  z.strictObject({
    kind: z.literal('requirement'),
    id: uuid,
    revisionId: uuid.optional(),
  }),
  z.strictObject({
    kind: z.literal('change'),
    id: uuid,
    versionId: uuid.optional(),
  }),
  z.strictObject({ kind: z.literal('delivery'), id: uuid }),
]);
export const copilotInput = z.strictObject({
  message: text(4000),
  history: z
    .array(z.strictObject({ user: text(4000), assistant: text(6000) }))
    .max(10)
    .default([]),
  page: pageSchema.default({ kind: 'overview' }),
});
export type CopilotInput = z.infer<typeof copilotInput>;
export const sourceSchema = z.strictObject({
  key: z.string().regex(/^S[1-9]\d{0,2}$/),
  type: z.enum([
    'project',
    'requirement',
    'revision',
    'change_request',
    'change_version',
    'delivery',
  ]),
  id: z.uuid(),
  projectId: z.uuid(),
  title: text(200),
  version: text(100),
  href: z.string().regex(/^\/app\/projects\/[\da-f-]+(?:\/[\w/-]+)?$/),
  readAt: z.iso.datetime(),
});
export type Source = z.infer<typeof sourceSchema>;
const refs = z.array(z.string().regex(/^S[1-9]\d{0,2}$/)).max(12);
export const copilotAnswer = z
  .strictObject({
    answer: text(3000),
    blockers: z.array(text(500)).max(8),
    nextSteps: z
      .array(z.strictObject({ text: text(500), sourceIds: refs.min(1) }))
      .max(8),
    sourceIds: refs.min(1),
  })
  .refine(
    (value) =>
      value.answer.length +
        value.blockers.join('').length +
        value.nextSteps.map((s) => s.text).join('').length <=
      6000,
  );
export const copilotResponse = z.strictObject({
  conversationTurnId: z.uuid(),
  projectId: z.uuid(),
  result: copilotAnswer,
  sources: z.array(sourceSchema).max(108),
  context: z.strictObject({
    historyDropped: z.number().int().nonnegative(),
    truncated: z.boolean(),
    toolCalls: z.number().int().min(1).max(4),
  }),
});
export function parseCopilotInput(value: unknown) {
  const parsed = copilotInput.safeParse(value);
  if (!parsed.success) throw new BadRequestException();
  return parsed.data;
}
export function parseAnswer(content: unknown) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > 64 * 1024)
    return invalidOutput();
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return invalidOutput();
  }
  const result = copilotAnswer.safeParse(value);
  if (!result.success) return invalidOutput();
  return result.data;
}
export const toolSchemas = {
  get_project_overview: z.strictObject({
    bucket: z.enum(['mine', 'waiting', 'completed']).default('mine'),
  }),
  list_project_requirements: z.strictObject({
    limit: z.number().int().min(1).max(50).default(20),
    offset: z.number().int().min(0).max(10000).default(0),
  }),
  get_requirement: z.strictObject({ id: uuid, revisionId: uuid.optional() }),
  list_change_requests: z.strictObject({
    limit: z.number().int().min(1).max(50).default(20),
    offset: z.number().int().min(0).max(10000).default(0),
  }),
  get_change_request: z.strictObject({ id: uuid, versionId: uuid.optional() }),
  list_deliveries: z.strictObject({
    limit: z.number().int().min(1).max(50).default(20),
    offset: z.number().int().min(0).max(10000).default(0),
  }),
  get_delivery: z.strictObject({ id: uuid }),
} as const;
export type ToolName = keyof typeof toolSchemas;
const descriptions: Record<ToolName, string> = {
  get_project_overview:
    'Read current authorized project status, counts and next-action work items. All counts are project-scoped. Read only.',
  list_project_requirements:
    'List authorized requirements of the current project; paged, not an exhaustive result when hasMore.',
  get_requirement:
    'Read a requirement, its capabilities and latest revision, or an exact immutable revision when revisionId is supplied.',
  list_change_requests:
    'List safe change request summaries in this project; does not reveal commercial drafts.',
  get_change_request:
    'Read a change request with role-filtered draft and active version, or an exact frozen version when versionId is supplied.',
  list_deliveries:
    'List authorized deliveries in this project, including historical deliveries.',
  get_delivery:
    'Read an exact delivery, version link, review and current capabilities.',
};
export const copilotTools = Object.entries(toolSchemas).map(
  ([name, schema]) => ({
    type: 'function' as const,
    function: {
      name,
      description: descriptions[name as ToolName],
      parameters: z.toJSONSchema(schema, { io: 'input' }),
    },
  }),
);
export function parseTool(name: string, raw: string) {
  if (!Object.hasOwn(toolSchemas, name)) return invalidOutput();
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return invalidOutput();
  }
  const parsed = toolSchemas[name as ToolName].safeParse(input);
  if (!parsed.success) return invalidOutput();
  return { name: name as ToolName, args: parsed.data };
}
// Explicit clipping is visible to both the model and user; never treat excerpts as complete records.
export function clip(
  value: unknown,
  maxText = 1500,
  maxItems = 20,
): { value: unknown; truncated: boolean } {
  let truncated = false;
  function visit(v: unknown): unknown {
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'string') {
      if (v.length > maxText) truncated = true;
      return v.slice(0, maxText);
    }
    if (Array.isArray(v)) {
      if (v.length > maxItems) truncated = true;
      return v.slice(0, maxItems).map(visit);
    }
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v).map(([k, item]) => [k, visit(item)]),
      );
    return v;
  }
  const result = visit(value);
  return { value: result, truncated };
}
