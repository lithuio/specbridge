import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export function httpsUrl(value: unknown): boolean {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    /[\s\\]/u.test(value) ||
    !/^https:\/\/[^/?#@]/u.test(value)
  )
    return false;
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 32 || value.charCodeAt(i) === 127) return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !value.slice(8).split(/[/?#]/u)[0].includes('@')
    );
  } catch {
    return false;
  }
}
export class CreateDeliveryDto {
  @ValidateBy({ name: 'httpsUrl', validator: { validate: httpsUrl } })
  artifactUrl!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(20000) summary!: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateBy({
    name: 'httpsUrls',
    validator: {
      validate: (value: unknown) =>
        Array.isArray(value) && value.every(httpsUrl),
    },
  })
  evidenceLinks?: string[];
}
export class ReviewDeliveryDto {
  @IsIn(['ACCEPTED', 'CHANGES_REQUESTED']) decision!:
    'ACCEPTED' | 'CHANGES_REQUESTED';
  @ValidateIf(
    (object: ReviewDeliveryDto, value) =>
      object.decision === 'CHANGES_REQUESTED' || value !== undefined,
  )
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  comment?: string;
}
