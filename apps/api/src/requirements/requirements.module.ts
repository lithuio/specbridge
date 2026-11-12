import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RequirementsController } from './requirements.controller.js';
import { RequirementsService } from './requirements.service.js';
import { RequirementsRepository } from './requirements.repository.js';
@Module({
  imports: [DatabaseModule, AuthorizationModule, AuditModule],
  controllers: [RequirementsController],
  providers: [RequirementsService, RequirementsRepository],
  exports: [RequirementsService],
})
export class RequirementsModule {}
