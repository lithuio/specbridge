import { BadRequestException, SetMetadata } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const TOKEN_SCOPE = 'approved_specs:read';
export const PROJECT_TOKEN_READ = 'specbridge:project-token-read';
export const ProjectTokenRead = () =>
  SetMetadata(PROJECT_TOKEN_READ, TOKEN_SCOPE);
export type ProjectTokenPrincipal = {
  kind: 'project_token';
  id: string;
  projectId: string;
  userId: string;
};
export function projectTokenHash(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !/^sbp_[A-Za-z0-9_-]{43}$/.test(raw)) return;
  if (
    Buffer.from(raw.slice(4), 'base64url').toString('base64url') !==
    raw.slice(4)
  )
    return;
  return createHash('sha256').update(raw).digest('hex');
}
export function newProjectToken() {
  return `sbp_${randomBytes(32).toString('base64url')}`;
}
export const createTokenInput = z.strictObject({
  name: z.string().trim().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(90).default(30),
});
export function parseCreateToken(value: unknown) {
  const result = createTokenInput.safeParse(value);
  if (!result.success) throw new BadRequestException();
  return result.data;
}
export const tokenSummary = z.strictObject({
  id: z.uuid(),
  projectId: z.uuid(),
  name: z.string(),
  scopes: z.tuple([z.literal(TOKEN_SCOPE)]),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().nullable(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED', 'UNAVAILABLE']),
});
export const tokenCreated = tokenSummary.extend({
  token: z.string().regex(/^sbp_[A-Za-z0-9_-]{43}$/),
});
export const approvedSpec = z.strictObject({
  projectId: z.uuid(),
  requirementId: z.uuid(),
  changeRequestId: z.uuid(),
  versionId: z.uuid(),
  versionNo: z.number().int().min(1),
  submittedAt: z.iso.datetime(),
  approvedAt: z.iso.datetime(),
  approvedScope: z.strictObject({
    summary: z.string(),
    acceptanceCriteria: z.array(z.string()),
  }),
  referencedRequirement: z.strictObject({
    revisionId: z.uuid(),
    revisionNo: z.number().int().min(1),
    content: z.string(),
    acceptanceCriteria: z.array(z.string()),
    createdAt: z.iso.datetime(),
  }),
});
