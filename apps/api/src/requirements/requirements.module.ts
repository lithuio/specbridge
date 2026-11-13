import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RequirementsController } from './requirements.controller.js';
import { RequirementsService } from './requirements.service.js';
import { RequirementsRepository } from './requirements.repository.js';
import { WorkingDraftsService } from './working-drafts.service.js';
import { WorkingDraftsController } from './working-drafts.controller.js';
@Module({
  imports: [DatabaseModule, AuthorizationModule, AuditModule],
  controllers: [RequirementsController, WorkingDraftsController],
  providers: [
    RequirementsService,
    RequirementsRepository,
    WorkingDraftsService,
  ],
  exports: [RequirementsService, RequirementsRepository],
})
export class RequirementsModule {}
