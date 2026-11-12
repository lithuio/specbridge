import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ChangesModule } from '../changes/changes.module.js';
import { DeliveriesController } from './deliveries.controller.js';
import { DeliveriesRepository } from './deliveries.repository.js';
import { DeliveriesService } from './deliveries.service.js';
@Module({
  imports: [DatabaseModule, AuthorizationModule, AuditModule, ChangesModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesRepository, DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
