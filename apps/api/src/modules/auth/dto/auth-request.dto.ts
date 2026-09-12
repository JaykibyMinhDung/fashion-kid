import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { canonicalizeEmail } from '../../../common/security/identity-normalization';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function canonicalEmail({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? canonicalizeEmail(value) : value;
}

function compactPhone({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const compact = value.trim().replace(/[\s().-]/g, '');
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
}

export class RegisterRequestDto {
  @ApiProperty({ minLength: 2, maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @Length(2, 150)
  fullName!: string;

  @ApiProperty({ format: 'email', maxLength: 255 })
  @Transform(canonicalEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+84901234567', maxLength: 20 })
  @Transform(compactPhone)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9]{8,15}$/)
  phone?: string;

  @ApiProperty({ minLength: 15, maxLength: 128, writeOnly: true })
  @IsString()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  remember = false;
}

export class LoginRequestDto {
  @ApiProperty({ format: 'email', maxLength: 255 })
  @Transform(canonicalEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ maxLength: 128, writeOnly: true })
  @IsString()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  remember = false;
}

export class ChangePasswordRequestDto {
  @ApiProperty({ maxLength: 128, writeOnly: true })
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ minLength: 15, maxLength: 128, writeOnly: true })
  @IsString()
  @MaxLength(128)
  newPassword!: string;
}
