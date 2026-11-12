import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
@Module({
  imports: [DatabaseModule, AuthorizationModule, AuditModule],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
