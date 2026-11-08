import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class VersionDto {
  @IsInt() @Min(1) @Max(2147483647) expectedVersion!: number;
}
export class CreateRequirementDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  originalText!: string;
}
export class PatchRequirementDto extends VersionDto {
  @ValidateIf((_o, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
  @ValidateIf((_o, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  originalText?: string;
}
export class ClarificationDto extends VersionDto {
  @IsIn(['QUESTION', 'ANSWER']) kind!: 'QUESTION' | 'ANSWER';
  @ValidateIf((_o, value) => value !== undefined && value !== null)
  @IsUUID()
  parentId?: string | null;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(10000) body!: string;
}
export class RevisionDto extends VersionDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(20000) content!: string;
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item: unknown) =>
          typeof item === 'string' ? item.trim() : item,
        )
      : value,
  )
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(1000, { each: true })
  acceptanceCriteria!: string[];
}
