import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  ValidateBy,
} from 'class-validator';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
const trimEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeEmail(value) : value;

function PasswordSize(minimum: number) {
  return ValidateBy({
    name: 'passwordSize',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' &&
        Array.from(value).length >= minimum &&
        Array.from(value).length <= 128 &&
        Buffer.byteLength(value, 'utf8') <= 512,
      defaultMessage: () => 'Password length is invalid',
    },
  });
}
export class LoginDto {
  @Transform(trimEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @PasswordSize(1)
  password!: string;
}
export class RegisterDto {
  @Transform(trimEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @PasswordSize(15)
  password!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;
}
