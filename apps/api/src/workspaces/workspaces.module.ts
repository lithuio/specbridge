import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { WorkspacesRepository } from './workspaces.repository.js';
import { WorkspacesService } from './workspaces.service.js';
import { WorkspacesController } from './workspaces.controller.js';
@Module({
  imports: [DatabaseModule, AuthorizationModule, AuditModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesRepository, WorkspacesService],
})
export class WorkspacesModule {}
