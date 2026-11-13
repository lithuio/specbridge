import { DeliveriesRepository } from '../deliveries/deliveries.repository.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ChangesController } from './changes.controller.js';
import { ChangesService } from './changes.service.js';
import { ChangesRepository } from './changes.repository.js';
@Module({
  imports: [DatabaseModule, AuthorizationModule, AuditModule],
  controllers: [ChangesController],
  providers: [ChangesService, ChangesRepository, DeliveriesRepository],
  exports: [ChangesRepository, ChangesService],
})
export class ChangesModule {}
