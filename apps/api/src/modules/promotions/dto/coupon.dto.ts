import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, EntityStatus } from '../../../generated/prisma/client';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
const normalizeCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ValidateCouponRequestDto {
  @ApiProperty({ pattern: CODE_PATTERN.source })
  @Transform(normalizeCode)
  @IsString()
  @MaxLength(50)
  @Matches(CODE_PATTERN)
  code!: string;
}

export class CreateCouponRequestDto {
  @ApiProperty({ pattern: CODE_PATTERN.source })
  @Transform(normalizeCode)
  @IsString()
  @MaxLength(50)
  @Matches(CODE_PATTERN)
  code!: string;
  @ApiProperty() @Transform(trim) @IsString() @MaxLength(150) name!: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
  @ApiProperty({ enum: CouponType }) @IsEnum(CouponType) type!: CouponType;
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  value!: number;
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;
  @ApiPropertyOptional({ minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDiscountAmount?: number | null;
  @ApiPropertyOptional({ minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;
  @ApiPropertyOptional({ minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number | null;
  @ApiProperty() @IsDateString() startsAt!: string;
  @ApiProperty() @IsDateString() endsAt!: string;
  @ApiPropertyOptional({ enum: EntityStatus, default: EntityStatus.DISABLED })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
export class UpdateCouponRequestDto {
  @ApiPropertyOptional({ pattern: CODE_PATTERN.source })
  @Transform(normalizeCode)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(CODE_PATTERN)
  code?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
  @ApiPropertyOptional({ enum: CouponType })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;
  @ApiPropertyOptional({ minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  value?: number;
  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;
  @ApiPropertyOptional({ minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDiscountAmount?: number | null;
  @ApiPropertyOptional({ minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;
  @ApiPropertyOptional({ minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number | null;
  @ApiPropertyOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsDateString() endsAt?: string;
}
export class UpdateCouponStatusRequestDto {
  @ApiProperty({ enum: EntityStatus })
  @IsEnum(EntityStatus)
  status!: EntityStatus;
}
export class ListCouponsQueryDto {
  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  q?: string;
}
