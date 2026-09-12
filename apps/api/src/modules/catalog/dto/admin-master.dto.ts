import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityStatus } from '../../../generated/prisma/client';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeSlug({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function normalizeCode({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class ListAdminMasterQueryDto {
  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class AdminCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  parentId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: EntityStatus })
  status!: EntityStatus;
}

export class AdminBrandResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  logoUrl!: string | null;

  @ApiProperty({ enum: EntityStatus })
  status!: EntityStatus;
}

export class AdminSizeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ enum: EntityStatus })
  status!: EntityStatus;
}

export class AdminColorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, pattern: HEX_PATTERN.source })
  hexCode!: string | null;

  @ApiProperty({ enum: EntityStatus })
  status!: EntityStatus;
}

export class CreateAdminCategoryRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ minLength: 1, maxLength: 180, pattern: SLUG_PATTERN.source })
  @Transform(normalizeSlug)
  @IsString()
  @MaxLength(180)
  @Matches(SLUG_PATTERN)
  slug!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2_000 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ enum: EntityStatus, default: EntityStatus.DISABLED })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateAdminCategoryRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 150 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 180,
    pattern: SLUG_PATTERN.source,
  })
  @Transform(normalizeSlug)
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(SLUG_PATTERN)
  slug?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2_000 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsUUID()
  parentId?: string | null;
}

export class CreateAdminBrandRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ minLength: 1, maxLength: 180, pattern: SLUG_PATTERN.source })
  @Transform(normalizeSlug)
  @IsString()
  @MaxLength(180)
  @Matches(SLUG_PATTERN)
  slug!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2_000 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  @Transform(trimString)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2_000)
  logoUrl?: string | null;

  @ApiPropertyOptional({ enum: EntityStatus, default: EntityStatus.DISABLED })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateAdminBrandRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 150 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 180,
    pattern: SLUG_PATTERN.source,
  })
  @Transform(normalizeSlug)
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(SLUG_PATTERN)
  slug?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2_000 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  @Transform(trimString)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2_000)
  logoUrl?: string | null;
}

export class CreateAdminSizeRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 50, pattern: CODE_PATTERN.source })
  @Transform(normalizeCode)
  @IsString()
  @MaxLength(50)
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000, default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: EntityStatus, default: EntityStatus.DISABLED })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateAdminSizeRequestDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 50,
    pattern: CODE_PATTERN.source,
  })
  @Transform(normalizeCode)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(CODE_PATTERN)
  code?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class CreateAdminColorRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 50, pattern: CODE_PATTERN.source })
  @Transform(normalizeCode)
  @IsString()
  @MaxLength(50)
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ nullable: true, pattern: HEX_PATTERN.source })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(HEX_PATTERN)
  hexCode?: string | null;

  @ApiPropertyOptional({ enum: EntityStatus, default: EntityStatus.DISABLED })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateAdminColorRequestDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 50,
    pattern: CODE_PATTERN.source,
  })
  @Transform(normalizeCode)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(CODE_PATTERN)
  code?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ nullable: true, pattern: HEX_PATTERN.source })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(HEX_PATTERN)
  hexCode?: string | null;
}

export class UpdateAdminMasterStatusRequestDto {
  @ApiProperty({ enum: EntityStatus })
  @IsEnum(EntityStatus)
  status!: EntityStatus;
}
