import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../generated/prisma/client';
import { canonicalizePhone } from '../../../common/security/identity-normalization';
import { ROLE_CODES, type RoleCode } from '../../auth/auth.types';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function compactNullablePhone({ value }: { value: unknown }): unknown {
  if (value === null) {
    return null;
  }
  return typeof value === 'string' ? canonicalizePhone(value) : value;
}

function trimNullableUrl({ value }: { value: unknown }): unknown {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 150 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Length(2, 150)
  fullName?: string;

  @ApiPropertyOptional({ nullable: true, example: '+84901234567' })
  @Transform(compactNullablePhone)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9]{8,15}$/)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uri', maxLength: 2048 })
  @Transform(trimNullableUrl)
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  avatarUrl?: string | null;
}

export class ProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  avatarUrl!: string | null;

  @ApiProperty({ enum: ROLE_CODES })
  role!: RoleCode;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  lastLoginAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
