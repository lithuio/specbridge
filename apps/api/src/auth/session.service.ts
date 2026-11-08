import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AuthRepository } from './auth.repository.js';

export function tokenHash(token: unknown): string | undefined {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  // Reject noncanonical base64url spellings.
  if (Buffer.from(token, 'base64url').toString('base64url') !== token) return;
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(AuthRepository) private readonly repository: AuthRepository,
  ) {}
  async create(userId: string, oldToken?: unknown) {
    const token = randomBytes(32).toString('base64url');
    const session = await this.repository.rotateSession(
      userId,
      tokenHash(token)!,
      tokenHash(oldToken),
    );
    return { token, expiresAt: session.expiresAt };
  }
  async authenticate(token: unknown) {
    const digest = tokenHash(token);
    return digest ? this.repository.authenticate(digest) : undefined;
  }
  revoke(sessionId: string) {
    return this.repository.revoke(sessionId);
  }
}
