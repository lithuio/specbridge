import { randomBytes, randomUUID } from 'node:crypto';
import {
  approveConnection,
  exchangeConnection,
  parseConnection,
  connectionCallback,
  connectionHash,
  newConnectionCode,
  matchesConnectionProof,
} from './connection.contract.js';

it('uses the RFC 7636 S256 vector and rejects alternate proofs without leaking input', () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
  expect(matchesConnectionProof(verifier, challenge)).toBe(true);
  expect(matchesConnectionProof(verifier + 'x', challenge)).toBe(false);
  expect(matchesConnectionProof(verifier, challenge.slice(1))).toBe(false);
  expect(matchesConnectionProof('x'.repeat(129), challenge)).toBe(false);
  expect(matchesConnectionProof(verifier, challenge.slice(0, -1) + 'N')).toBe(
    false,
  );
});
it('binds only a fixed loopback callback and approved read token parameters', () => {
  const input = {
    grantId: randomUUID(),
    challenge: randomBytes(32).toString('base64url'),
    challengeMethod: 'S256',
    state: randomBytes(32).toString('base64url'),
    callbackPort: 49152,
    name: 'Codex',
    expiresInDays: 30,
  };
  expect(parseConnection(approveConnection, input)).toEqual(input);
  expect(connectionCallback(input.callbackPort)).toBe(
    'http://127.0.0.1:49152/specbridge/callback',
  );
  for (const change of [
    { callbackPort: 80 },
    { callbackPort: 65536 },
    { callbackPort: '49152' },
    { challengeMethod: 'plain' },
    { redirectUri: 'https://attacker.invalid' },
    { scopes: ['write'] },
    { userId: randomUUID() },
    { expiresInDays: 91 },
  ]) {
    expect(() =>
      parseConnection(approveConnection, { ...input, ...change }),
    ).toThrow('Bad Request');
  }
});
it('accepts a bounded exchange, hashes fresh one-time codes and rejects credential substitution', () => {
  const code = newConnectionCode();
  const input = {
    grantId: randomUUID(),
    projectId: randomUUID(),
    code,
    verifier: randomBytes(32).toString('base64url'),
    state: randomBytes(32).toString('base64url'),
    callbackPort: 49152,
  };
  expect(parseConnection(exchangeConnection, input)).toEqual(input);
  expect(connectionHash(code)).toMatch(/^[a-f0-9]{64}$/);
  expect(connectionHash(newConnectionCode())).not.toBe(connectionHash(code));
  for (const change of [
    { token: 'untrusted' },
    { code: 'sbp_' + code.slice(4) },
    { verifier: 'short' },
    { state: input.state + '=' },
    { projectId: 'x' },
    { callbackPort: 1.5 },
  ]) {
    expect(() =>
      parseConnection(exchangeConnection, { ...input, ...change }),
    ).toThrow('Bad Request');
  }
});
