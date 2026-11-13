// Phase D browser authorization and dedicated native-client exchange contracts.
import { BadRequestException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createTokenInput } from '../api-tokens/token.contract.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());
export const connectionPage = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});
export const connectionNonce = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/)
  .refine(
    (value) => Buffer.from(value, 'base64url').toString('base64url') === value,
  );
export const connectionPort = z.number().int().min(1024).max(65535);
export const approveConnection = z.strictObject({
  grantId: uuid,
  challenge: connectionNonce,
  challengeMethod: z.literal('S256'),
  state: connectionNonce,
  callbackPort: connectionPort,
  name: createTokenInput.shape.name,
  expiresInDays: createTokenInput.shape.expiresInDays,
});
export const exchangeConnection = z.strictObject({
  grantId: uuid,
  projectId: uuid,
  code: z
    .string()
    .regex(/^sbc_[A-Za-z0-9_-]{43}$/)
    .refine((value) => connectionNonce.safeParse(value.slice(4)).success),
  verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
  state: connectionNonce,
  callbackPort: connectionPort,
});
export function parseConnection<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new BadRequestException();
  return result.data;
}
export function connectionHash(value: string) {
  return createHash('sha256').update(value, 'ascii').digest('hex');
}
export function newConnectionCode() {
  return `sbc_${randomBytes(32).toString('base64url')}`;
}
export function matchesConnectionProof(verifier: string, challenge: string) {
  if (
    !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
    !connectionNonce.safeParse(challenge).success
  )
    return false;
  const actual = createHash('sha256').update(verifier, 'ascii').digest();
  return timingSafeEqual(actual, Buffer.from(challenge, 'base64url'));
}
export function connectionCallback(port: number) {
  return `http://127.0.0.1:${connectionPort.parse(port)}/specbridge/callback`;
}
