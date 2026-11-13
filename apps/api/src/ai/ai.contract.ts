import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
export const analysisInput = z.strictObject({
  expectedVersion: z.number().int().min(1).max(2147483647),
  revisionId: z
    .uuid()
    .transform((v) => v.toLowerCase())
    .optional(),
  includeClarifications: z.boolean().default(true),
  draft: z
    .strictObject({
      content: text(20000),
      acceptanceCriteria: z.array(text(1000)).max(100),
    })
    .optional(),
});
const items = z.array(text(500)).max(10);
export const analysisOutput = z
  .strictObject({
    summary: text(1000),
    assumptions: items,
    openQuestions: items,
    acceptanceCriteria: items,
    risks: items,
  })
  .refine(
    (v) =>
      Object.values(v)
        .flat()
        .reduce((n, s) => n + s.length, 0) <= 6000,
  );
export type AnalysisInput = z.infer<typeof analysisInput>;
export type AnalysisOutput = z.infer<typeof analysisOutput>;
export function parseInput(value: unknown): AnalysisInput {
  const result = analysisInput.safeParse(value);
  if (!result.success) throw new BadRequestException();
  return result.data;
}
export function invalidOutput(): never {
  throw new ServiceUnavailableException({ code: 'AI_INVALID_RESPONSE' });
}
export function parseOutput(content: unknown): AnalysisOutput {
  if (
    typeof content !== 'string' ||
    !content.trim() ||
    Buffer.byteLength(content) > 64 * 1024
  )
    return invalidOutput();
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return invalidOutput();
  }
  const result = analysisOutput.safeParse(value);
  if (!result.success) return invalidOutput();
  return result.data;
}
