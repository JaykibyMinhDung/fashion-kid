import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, EntityStatus } from '../../../generated/prisma/client';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
const MONEY_PATTERN = /^\d+$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeCode({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CreateCouponRequestDto {
  @ApiProperty({ maxLength: 50, pattern: CODE_PATTERN.source })
  @Transform(normalizeCode)
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType)
  type!: CouponType;

  @ApiProperty({
    description:
      'FIXED_AMOUNT: số VND; PERCENTAGE: 1..100. Chuỗi số nguyên không âm.',
  })
  @Transform(trimString)
  @IsString()
  @Matches(MONEY_PATTERN)
  value!: string;

  @ApiPropertyOptional({ default: '0', description: 'VND, chuỗi số nguyên' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  minOrderAmount?: string;

  @ApiPropertyOptional({ nullable: true, description: 'VND, chuỗi số nguyên' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  maxDiscountAmount?: string;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  startsAt!: string;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  endsAt!: string;

  @ApiPropertyOptional({ enum: EntityStatus, default: EntityStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateCouponRequestDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ description: 'VND, chuỗi số nguyên' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  minOrderAmount?: string;

  @ApiPropertyOptional({ nullable: true, description: 'VND; null để xoá' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  maxDiscountAmount?: string | null;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}

export class UpdateCouponStatusRequestDto {
  @ApiProperty({ enum: EntityStatus })
  @IsEnum(EntityStatus)
  status!: EntityStatus;
}

export class ListCouponsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @ApiPropertyOptional({ description: 'Tìm theo code hoặc name' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @ApiPropertyOptional({ enum: CouponType })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;
}

export class ListCouponUsagesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class CouponResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: CouponType })
  type!: CouponType;

  @ApiProperty({ description: 'VND (decimal string) hoặc phần trăm 1..100' })
  value!: string;

  @ApiProperty({ description: 'VND (decimal string)' })
  minOrderAmount!: string;

  @ApiPropertyOptional({ nullable: true, description: 'VND (decimal string)' })
  maxDiscountAmount!: string | null;

  @ApiPropertyOptional({ nullable: true })
  usageLimit!: number | null;

  @ApiPropertyOptional({ nullable: true })
  perUserLimit!: number | null;

  @ApiProperty({ format: 'date-time' })
  startsAt!: string;

  @ApiProperty({ format: 'date-time' })
  endsAt!: string;

  @ApiProperty({ enum: EntityStatus })
  status!: EntityStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class CouponListResponseDto {
  @ApiProperty({ type: CouponResponseDto, isArray: true })
  items!: CouponResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CouponUsageUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;
}

export class CouponUsageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  couponId!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty()
  couponCodeSnapshot!: string;

  @ApiProperty({ description: 'VND (decimal string)' })
  discountAmount!: string;

  @ApiPropertyOptional({ type: CouponUsageUserResponseDto, nullable: true })
  user!: CouponUsageUserResponseDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class CouponUsageListResponseDto {
  @ApiProperty({ type: CouponUsageResponseDto, isArray: true })
  items!: CouponUsageResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
