import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiRepository } from './ai.repository.js';
import { AiConfig } from './ai.config.js';
import { AiLimits } from './ai.limits.js';
import { DeepseekProvider } from './deepseek.provider.js';
import { parseInput } from './ai.contract.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger('AiUsage');
  constructor(
    @Inject(AiRepository) private readonly repository: AiRepository,
    @Inject(DeepseekProvider) private readonly provider: DeepseekProvider,
    @Inject(AiLimits) private readonly limits: AiLimits,
    @Inject(AiConfig) private readonly config: AiConfig,
  ) {}
  async analyze(
    actor: string,
    sessionId: string,
    id: string,
    body: unknown,
    requestId: string,
    signal?: AbortSignal,
  ) {
    const input = parseInput(body);
    const context = await this.repository.context(
      actor,
      sessionId,
      id.toLowerCase(),
      input,
    );
    const messages = this.provider.messages(context.material);
    this.config.credentials();
    await this.repository.reauthorize(actor, sessionId, context.projectId);
    signal?.throwIfAborted();
    const release = this.limits.acquire(actor, context.projectId);
    const start = performance.now();
    let usage: { prompt_tokens: number; completion_tokens: number } | null =
      null;
    let success = false;
    try {
      const response = await this.provider.analyze(messages, signal);
      usage = response.usage;
      await this.repository.reauthorize(actor, sessionId, context.projectId);
      signal?.throwIfAborted();
      success = true;
      return {
        analysisId: randomUUID(),
        schemaVersion: 1 as const,
        source: context.source,
        result: response.result,
      };
    } finally {
      release();
      this.logger.log(
        JSON.stringify({
          requestId,
          actorId: actor,
          projectId: context.projectId,
          action: 'ai.analysis',
          model: this.config.model,
          success,
          usage,
          durationMs: Math.round(performance.now() - start),
        }),
      );
    }
  }
}
