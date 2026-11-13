import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class AiConfig {
  readonly model = process.env.DEEPSEEK_MODEL ?? 'deepseek-flash';
  readonly baseURL =
    process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  readonly timeoutMs = this.number('DEEPSEEK_TIMEOUT_MS', 30000, 100, 30000);
  readonly maxTokens = this.number('DEEPSEEK_MAX_TOKENS', 8192, 1, 8192);
  readonly userMinute = this.number('AI_USER_REQUESTS_PER_MINUTE', 5, 1, 100);
  readonly userDaily = this.number('AI_USER_CALLS_PER_DAY', 100, 1, 10000);
  readonly projectDaily = this.number(
    'AI_PROJECT_CALLS_PER_DAY',
    200,
    1,
    10000,
  );
  readonly instanceDaily = this.number(
    'AI_INSTANCE_CALLS_PER_DAY',
    500,
    1,
    10000,
  );
  readonly inputBytes = 128 * 1024;
  readonly #key = process.env.DEEPSEEK_API_KEY;
  private number(
    name: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const raw = process.env[name];
    if (raw === undefined) return fallback;
    const value = /^\d+$/.test(raw) ? Number(raw) : NaN;
    return Number.isSafeInteger(value) && value >= min && value <= max
      ? value
      : NaN;
  }
  credentials() {
    const valid =
      process.env.DEEPSEEK_ENABLED === 'true' &&
      typeof this.#key === 'string' &&
      this.#key.trim().length > 0 &&
      this.#key === this.#key.trim() &&
      !Array.from(this.#key).some(
        (c) => c.charCodeAt(0) < 33 || c.charCodeAt(0) === 127,
      ) &&
      ['https://api.deepseek.com', 'https://api.deepseek.com/'].includes(
        this.baseURL,
      ) &&
      this.model === 'deepseek-flash' &&
      [
        this.timeoutMs,
        this.maxTokens,
        this.userMinute,
        this.userDaily,
        this.projectDaily,
        this.instanceDaily,
      ].every(Number.isFinite);
    if (!valid)
      throw new ServiceUnavailableException({ code: 'AI_UNAVAILABLE' });
    return { apiKey: this.#key!, baseURL: this.baseURL };
  }
}
