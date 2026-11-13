import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ProposalsController } from '../proposals/proposals.controller.js';
import { ProposalsService } from '../proposals/proposals.service.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AiConfig } from './ai.config.js';
import { AiLimits } from './ai.limits.js';
import { AiRepository } from './ai.repository.js';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';
import { DeepseekProvider } from './deepseek.provider.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { RequirementsModule } from '../requirements/requirements.module.js';
import { ChangesModule } from '../changes/changes.module.js';
import { DeliveriesModule } from '../deliveries/deliveries.module.js';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { CopilotController } from './copilot.controller.js';
import { CopilotTools } from './copilot.tools.js';
import { CopilotService } from './copilot.service.js';
@Module({
  imports: [
    AuthModule,
    AuditModule,
    DocumentsModule,
    DatabaseModule,
    AuthorizationModule,
    ProjectsModule,
    RequirementsModule,
    ChangesModule,
    DeliveriesModule,
    DashboardModule,
  ],
  controllers: [AiController, CopilotController, ProposalsController],
  providers: [
    ProposalsService,
    AiConfig,
    AiLimits,
    AiRepository,
    AiService,
    DeepseekProvider,
    CopilotTools,
    CopilotService,
  ],
})
export class AiModule {}
