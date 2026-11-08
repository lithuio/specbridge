import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationRepository } from './authorization.repository.js';
@Module({
  imports: [DatabaseModule],
  providers: [AuthorizationRepository],
  exports: [AuthorizationRepository],
})
export class AuthorizationModule {}
