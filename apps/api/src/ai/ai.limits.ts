import { HttpException, Inject, Injectable } from '@nestjs/common';
import { AiConfig } from './ai.config.js';

type Counter = { count: number; until: number };
@Injectable()
export class AiLimits {
  private readonly counters = new Map<string, Counter>();
  private readonly active = new Map<string, number>();
  constructor(@Inject(AiConfig) private readonly config: AiConfig) {}
  acquire(user: string, project: string, now = Date.now()): () => void {
    for (const [key, value] of this.counters)
      if (value.until <= now) this.counters.delete(key);
    const dayEnd = (Math.floor(now / 86400000) + 1) * 86400000;
    const rules: [string, number, number][] = [
      [`minute:${user}`, this.config.userMinute, now + 60000],
      [`user:${user}`, this.config.userDaily, dayEnd],
      [`project:${project}`, this.config.projectDaily, dayEnd],
      ['instance', this.config.instanceDaily, dayEnd],
    ];
    const concurrent: [string, number][] = [
      [`user:${user}`, 1],
      [`project:${project}`, 2],
      ['instance', 4],
    ];
    const deny = (seconds: number): never => {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          retryAfter: Math.max(1, Math.min(86400, seconds)),
        },
        429,
      );
    };
    if (concurrent.some(([key, max]) => (this.active.get(key) ?? 0) >= max))
      deny(1);
    const newKeys = rules.filter(([key]) => !this.counters.has(key)).length;
    if (this.counters.size + newKeys > 10000) deny(60);
    for (const [key, max] of rules) {
      const count = this.counters.get(key);
      if (count && count.count >= max)
        deny(Math.ceil((count.until - now) / 1000));
    }
    // Reserve all counters atomically, after validation and before the external call.
    for (const [key, , until] of rules) {
      const counter = this.counters.get(key) ?? { count: 0, until };
      counter.count++;
      this.counters.set(key, counter);
    }
    for (const [key] of concurrent)
      this.active.set(key, (this.active.get(key) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const [key] of concurrent) {
        const count = this.active.get(key)! - 1;
        if (count) this.active.set(key, count);
        else this.active.delete(key);
      }
    };
  }
}
