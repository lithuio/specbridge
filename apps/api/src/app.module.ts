import { DocumentsModule } from './documents/documents.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AiModule } from './ai/ai.module.js';
import { ApiTokensModule } from './api-tokens/api-tokens.module.js';
import { AuditReadModule } from './audit/audit-read.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { ChangesModule } from './changes/changes.module.js';
import { RequirementsModule } from './requirements/requirements.module.js';
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { ProjectsModule } from './projects/projects.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule({
  sourceContext: false,
});

@Module({
  imports: [
    DocumentsModule,
    ApiTokensModule,
    AiModule,
    DashboardModule,
    AuditReadModule,
    DatabaseModule,
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    RequirementsModule,
    ChangesModule,
    DeliveriesModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      enabled: Boolean(
        process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET,
      ),
      appKey: process.env.OBSERVE_APP_KEY,
      appSecret: process.env.OBSERVE_APP_SECRET,
      serviceId: 'specbridge-api',
      http: {
        capture: false,
        ignore: [
          /^\/api\/v1\/(?:api-tokens(?:\/|$|\?)|projects\/[^/]+\/(?:documents|api-tokens|approved-specs)(?:\/|$|\?))/i,
          /^\/api\/v1\/(?:auth(?:\/|$)|me(?:\/|$|\?)|requirements\/[^/]+\/(?:ai-(?:analysis|assistance)|working-drafts|working-draft-publications|copilot-proposals)(?:\/|$|\?)|projects\/[^/]+\/copilot\/messages(?:\/|$|\?))/i,
        ],
      },
      redaction: {
        enabled: true,
        keys: [
          'email',
          'passwordHash',
          'tokenHash',
          'cookie',
          'set-cookie',
          'authorization',
          'apiKey',
          'token',
          'prompt',
          'messages',
          'content',
          'originalText',
          'body',
        ],
        patterns: [
          /\bsbp_[A-Za-z0-9_-]{43}\b/,
          /\$argon2id\$[^\s,"']+/,
          /\b[A-Za-z0-9_-]{43}\b/,
          /\b[0-9a-f]{64}\b/,
        ],
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
