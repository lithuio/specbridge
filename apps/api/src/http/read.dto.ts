import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PageDto } from '../authorization/rbac.dto.js';
export class EmptyQueryDto {}
export class ChangeListDto extends PageDto {
  @IsOptional() @IsUUID() requirementId?: string;
  @IsOptional()
  @IsIn(['DRAFT', 'SUBMITTED', 'VENDOR_APPROVED', 'APPROVED', 'REJECTED'])
  status?: 'DRAFT' | 'SUBMITTED' | 'VENDOR_APPROVED' | 'APPROVED' | 'REJECTED';
}
export class DeliveryListDto extends PageDto {
  @IsOptional() @IsUUID() changeRequestId?: string;
  @IsOptional()
  @IsIn(['SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED'])
  status?: 'SUBMITTED' | 'CHANGES_REQUESTED' | 'ACCEPTED';
}
