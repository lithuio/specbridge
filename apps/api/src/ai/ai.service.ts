import { DocumentsService } from '../documents/documents.service.js';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiRepository } from './ai.repository.js';
import { AiConfig } from './ai.config.js';
import { AiLimits } from './ai.limits.js';
import { DeepseekProvider } from './deepseek.provider.js';
import { parseInput } from './ai.contract.js';
import { parseAssistanceInput } from './assistance.contract.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger('AiUsage');
  constructor(
    @Inject(AiRepository) private readonly repository: AiRepository,
    @Inject(DeepseekProvider) private readonly provider: DeepseekProvider,
    @Inject(AiLimits) private readonly limits: AiLimits,
    @Inject(AiConfig) private readonly config: AiConfig,
    @Inject(DocumentsService) private readonly documents: DocumentsService,
  ) {}
  async assist(
    actor: string,
    sessionId: string,
    id: string,
    body: unknown,
    requestId: string,
    signal?: AbortSignal,
  ) {
    const input = parseAssistanceInput(body);
    const context = await this.repository.context(
      actor,
      sessionId,
      id.toLowerCase(),
      { expectedVersion: input.expectedVersion, includeClarifications: true },
    );
    if (input.mode === 'specification' && context.projectRole === 'CLIENT')
      throw new ForbiddenException();
    this.config.credentials();
    const release = this.limits.acquire(actor, context.projectId);
    const start = performance.now();
    let success = false;
    let usage: { prompt_tokens: number; completion_tokens: number } | null =
      null;
    try {
      const background = await this.documents.retrieve(
        actor,
        context.projectId,
        `${input.instruction} ${context.material.originalText}`,
        true,
      );
      const material = {
        background: {
          classification: 'UNAPPROVED_SHARED_BACKGROUND',
          excerpts: background,
        },
        ...context.material,
        projectReference: context.projectReference,
        instruction: input.instruction,
        personalWorkingDraft: input.draft ?? null,
      };
      // Validate combined material before any provider request.
      this.provider.assistanceMessages(input.mode, material);
      const check = async () => {
        if (
          (await this.repository.reauthorize(
            actor,
            sessionId,
            context.projectId,
          )) !== context.projectRole
        )
          throw new ForbiddenException();
        await this.documents.reauthorizeSources(
          actor,
          context.projectId,
          background,
          true,
        );
        signal?.throwIfAborted();
      };
      await check();
      const response = await this.provider.assist(input.mode, material, signal);
      usage = response.usage;
      await check();
      success = true;
      return {
        analysisId: randomUUID(),
        schemaVersion: 1 as const,
        mode: input.mode,
        source: {
          ...context.source,
          includesUnsavedDraft: !!input.draft,
          background: background.map(
            ({ content: _content, ...source }) => source,
          ),
        },
        result: response.result,
      };
    } finally {
      release();
      this.logger.log(
        JSON.stringify({
          requestId,
          actorId: actor,
          projectId: context.projectId,
          action: 'ai.assistance',
          mode: input.mode,
          model: this.config.model,
          success,
          usage,
          durationMs: Math.round(performance.now() - start),
        }),
      );
    }
  }
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
