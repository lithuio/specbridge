import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';

@Injectable()
export class PasswordService {
  // Lazy and shared: startup/health needs neither hashing nor database access.
  private dummyHash?: Promise<string>;
  hash(password: string): Promise<string> {
    return hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }
  async verify(password: string, passwordHash?: string): Promise<boolean> {
    const encoded =
      passwordHash ??
      (await (this.dummyHash ??= this.hash(randomBytes(32).toString('hex'))));
    try {
      const valid = await verify(encoded, password);
      return passwordHash !== undefined && valid;
    } catch {
      // Corrupt hashes are never logged and never authenticate a user.
      return false;
    }
  }
}
