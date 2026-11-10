import {
  Controller,
  Get,
  Header,
  Inject,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { DatabaseModule } from '../database/database.module.js';
import { dtoPipe, page } from '../authorization/rbac.dto.js';
import type { AuthRequest } from '../auth/auth.types.js';
import { AuditListDto } from './audit-read.dto.js';
import { AuditReadRepository } from './audit-read.repository.js';
import { safeMetadata, type AuditEventType } from './audit-read.policy.js';
@Injectable()
export class AuditReadService {
  constructor(
    @Inject(AuditReadRepository)
    private readonly repository: AuditReadRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
  ) {}
  list(actor: string, id: string, input: AuditListDto) {
    return this.repository.database.db.transaction(
      async (tx) => {
        const project = await this.authorization.project(
          actor.toLowerCase(),
          id.toLowerCase(),
          tx,
        );
        const rows = await this.repository.list(
          tx,
          project.id,
          project.projectRole === 'CLIENT',
          input,
        );
        const result = [];
        for (const { event, actorId, displayName } of rows)
          result.push({
            id: event.id,
            projectId: project.id,
            actor:
              actorId && displayName !== null
                ? { userId: actorId, displayName }
                : null,
            eventType: event.eventType,
            entityType: event.entityType,
            entityId: event.entityId,
            entityVersion: event.entityVersion,
            createdAt: event.createdAt,
            metadata: safeMetadata(
              event.eventType as AuditEventType,
              event.metadata,
            ),
            target: await this.repository.target(tx, project.id, event),
          });
        return result;
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
@Controller('api/v1')
export class AuditReadController {
  constructor(
    @Inject(AuditReadService) private readonly service: AuditReadService,
  ) {}
  @Get('projects/:id/audit-events')
  @Header('Cache-Control', 'no-store')
  async list(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(dtoPipe(AuditListDto)) input: AuditListDto,
  ) {
    return page(
      await this.service.list(req.auth!.user.id, id, input),
      input,
      req.requestId,
    );
  }
}
@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [AuditReadController],
  providers: [AuditReadService, AuditReadRepository],
})
export class AuditReadModule {}
