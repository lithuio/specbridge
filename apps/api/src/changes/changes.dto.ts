import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const optional = (_: unknown, v: unknown) => v !== undefined && v !== null;
export const currencies = new Set(Intl.supportedValuesOf('currency'));
export class CreateChangeDto {}
export class ChangeVersionDto {
  @IsInt() @Min(0) @Max(2147483647) expectedVersion!: number;
}
export class PatchChangeDto extends ChangeVersionDto {
  @ValidateIf((_, v) => v !== undefined)
  @IsUUID()
  requirementRevisionId?: string;
  @ValidateIf(optional)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  scopeSummary?: string | null;
  @ValidateIf(optional)
  @IsString()
  @Matches(/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/)
  estimateHours?: string | null;
  @ValidateIf(optional)
  @IsInt()
  @Min(-Number.MAX_SAFE_INTEGER)
  @Max(Number.MAX_SAFE_INTEGER)
  costDeltaMinor?: number | null;
  @ValidateIf(optional) @IsString() @IsIn([...currencies]) currency?:
    string | null;
  @ValidateIf(optional)
  @IsInt()
  @Min(-2147483648)
  @Max(2147483647)
  scheduleDeltaDays?: number | null;
  @ValidateIf(optional)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((v: unknown) => (typeof v === 'string' ? v.trim() : v))
      : value,
  )
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(1000, { each: true })
  acceptanceCriteria?: string[] | null;
}
export class ChangeDecisionDto extends ChangeVersionDto {
  @IsIn(['APPROVED', 'REJECTED']) decision!: 'APPROVED' | 'REJECTED';
  @ValidateIf((_, v) => v !== undefined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  comment?: string;
}
