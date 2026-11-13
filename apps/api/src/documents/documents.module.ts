import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentsService } from './documents.service.js';
import {
  DocumentsController,
  DocumentUploadAdmission,
} from './documents.controller.js';
import { DocumentParser } from './document.parser.js';
import { DocumentStorage } from './document.storage.js';

@Module({
  imports: [DatabaseModule, AuthorizationModule, AuditModule, AuthModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentUploadAdmission,
    DocumentParser,
    DocumentStorage,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
