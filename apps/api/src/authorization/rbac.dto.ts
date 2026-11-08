import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ValidationPipe, UnprocessableEntityException } from '@nestjs/common';
import { normalizeEmail } from '../auth/auth.dto.js';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const integer = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
export class PageDto {
  @IsOptional() @Transform(integer) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional()
  @Transform(integer)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  offset = 0;
}
export class ProjectListDto extends PageDto {
  @IsOptional() @IsUUID() workspaceId?: string;
}
export class NameDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) name!: string;
}
export class EmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
export class CreateProjectDto extends NameDto {
  @IsUUID() workspaceId!: string;
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  baselineScope!: string;
}
export class ProjectMemberDto {
  @IsUUID() userId!: string;
  @Equals('DEVELOPER') role!: 'DEVELOPER';
}
export const dtoPipe = (expectedType: new () => object) =>
  new ValidationPipe({
    expectedType,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
export function business(
  code:
    'ROLE_CONFLICT' | 'USER_NOT_REGISTERED' | 'WORKSPACE_DEVELOPER_REQUIRED',
): never {
  throw new UnprocessableEntityException({ code });
}
export function page<T>(rows: T[], input: PageDto, requestId: string) {
  return {
    data: rows.slice(0, input.limit),
    meta: {
      requestId,
      limit: input.limit,
      offset: input.offset,
      hasMore: rows.length > input.limit,
    },
  };
}
