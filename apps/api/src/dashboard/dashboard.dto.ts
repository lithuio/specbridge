import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PageDto } from '../authorization/rbac.dto.js';
export class DashboardDto extends PageDto {
  @IsOptional() @IsUUID() workspaceId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsIn(['mine', 'waiting', 'completed']) bucket:
    'mine' | 'waiting' | 'completed' = 'mine';
}
