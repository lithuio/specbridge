import {
  HttpException,
  Injectable,
  type OnModuleDestroy,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly entries = new Map<
    string,
    { count: number; expires: number }
  >();
  private readonly cleanup = setInterval(
    () => this.prune(Date.now()),
    60_000,
  ).unref();
  private prune(now: number) {
    for (const [key, entry] of this.entries)
      if (entry.expires <= now) this.entries.delete(key);
  }
  consume(key: string, limit: number, windowMs: number, now = Date.now()) {
    let entry = this.entries.get(key);
    if (entry && entry.expires <= now) {
      this.entries.delete(key);
      entry = undefined;
    }
    if (!entry) {
      if (this.entries.size >= 10_000) this.prune(now);
      if (this.entries.size >= 10_000) this.reject(60);
      entry = { count: 0, expires: now + windowMs };
      this.entries.set(key, entry);
    }
    if (entry.count >= limit)
      this.reject(Math.max(1, Math.ceil((entry.expires - now) / 1000)));
    entry.count++;
  }
  private reject(retryAfter: number): never {
    throw new HttpException(
      { code: 'RATE_LIMITED', message: 'Too many requests', retryAfter },
      429,
    );
  }
  loginIdentity(ip: string, email: string) {
    const digest = createHash('sha256').update(email).digest('hex');
    this.consume(`login-identity:${ip}:${digest}`, 5, 15 * 60_000);
  }
  onModuleDestroy() {
    clearInterval(this.cleanup);
    this.entries.clear();
  }
}
