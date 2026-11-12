import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AiConfig } from './ai.config.js';
import { AiLimits } from './ai.limits.js';
import { AiRepository } from './ai.repository.js';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';
import { DeepseekProvider } from './deepseek.provider.js';
@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [AiController],
  providers: [AiConfig, AiLimits, AiRepository, AiService, DeepseekProvider],
})
export class AiModule {}
