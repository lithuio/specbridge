import { createHash } from 'node:crypto';
import {
  newProjectToken,
  projectTokenHash,
  parseCreateToken,
} from './token.contract.js';
import { canReadAudit, safeMetadata } from '../audit/audit-read.policy.js';
it('generates independent 256-bit canonical credentials and hashes the complete bearer', () => {
  const first = newProjectToken(),
    second = newProjectToken();
  expect(first === second).toBe(false);
  expect(Buffer.from(first.slice(4), 'base64url').length).toBe(32);
  expect(
    projectTokenHash(first) ===
      createHash('sha256').update(first).digest('hex'),
  ).toBe(true);
  for (const bad of [
    undefined,
    null,
    {},
    first + '=',
    first + ' ',
    first.toUpperCase(),
    'sbp_' + 'A'.repeat(42) + 'B',
    'Bearer ' + first,
  ])
    expect(projectTokenHash(bad)).toBeUndefined();
});
it('strictly validates token names and lifetime without accepting scope or identity overrides', () => {
  expect(parseCreateToken({ name: ' Local ' })).toEqual({
    name: 'Local',
    expiresInDays: 30,
  });
  for (const body of [
    {},
    { name: ' ' },
    { name: 'x'.repeat(101) },
    { name: 'x', expiresInDays: 0 },
    { name: 'x', expiresInDays: 91 },
    { name: 'x', expiresInDays: 1.5 },
    { name: 'x', expiresInDays: '30' },
    { name: 'x', scopes: ['write'] },
    { name: 'x', userId: 'override' },
  ])
    expect(() => parseCreateToken(body)).toThrow();
});
it('restricts token audits to Owner and drops plaintext, names, hash and unrecognized metadata', () => {
  for (const event of [
    'api_token.created',
    'api_token.revoked',
    'api_token.used',
  ] as const) {
    expect(canReadAudit(event, 'OWNER')).toBe(true);
    expect(canReadAudit(event, 'DEVELOPER')).toBe(false);
    expect(canReadAudit(event, 'CLIENT')).toBe(false);
  }
  expect(
    safeMetadata('api_token.created', {
      scope: 'approved_specs:read',
      expiresInDays: 30,
      token: newProjectToken(),
      tokenHash: 'hidden',
      name: 'hidden',
    }),
  ).toEqual({ scope: 'approved_specs:read', expiresInDays: 30 });
  expect(
    safeMetadata('api_token.used', {
      principalType: 'owner',
      operation: 'write',
      resultCount: 101,
      versionId: 'bad',
    }),
  ).toEqual({});
});
