import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PageDto } from '../authorization/rbac.dto.js';
import { auditEventTypes, type AuditEventType } from './audit-read.policy.js';
export class AuditListDto extends PageDto {
  @IsOptional()
  @IsIn([
    'project',
    'requirement',
    'clarification',
    'requirement_revision',
    'change_request',
    'delivery',
  ])
  entityType?: string;
  @IsOptional() @IsUUID() entityId?: string;
  @IsOptional() @IsIn(auditEventTypes) eventType?: AuditEventType;
}
