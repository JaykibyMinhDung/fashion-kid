import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProductGender,
  ProductStatus,
  VariantStatus,
} from '../../../generated/prisma/client';
import { DECIMAL_STRING_PATTERN } from './catalog.dto';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/;
const URL_PATTERN = /^(?:https?:\/\/[^\s]+|\/(?!\/)[^\s]+)$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeSlug({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function normalizeSku({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export const ADMIN_PRODUCT_SORT_VALUES = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'status:asc',
  'status:desc',
] as const;

export type AdminProductSort = (typeof ADMIN_PRODUCT_SORT_VALUES)[number];

export class ListAdminProductsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    enum: ADMIN_PRODUCT_SORT_VALUES,
    default: 'createdAt:desc',
  })
  @IsOptional()
  @IsIn(ADMIN_PRODUCT_SORT_VALUES)
  sort: AdminProductSort = 'createdAt:desc';
}

export class CreateAdminProductRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiProperty({ minLength: 1, maxLength: 255 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ minLength: 1, maxLength: 280, pattern: SLUG_PATTERN.source })
  @Transform(normalizeSlug)
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  @Matches(SLUG_PATTERN)
  slug!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 10_000 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  @ApiPropertyOptional({ enum: ProductGender, nullable: true })
  @IsOptional()
  @IsEnum(ProductGender)
  gender?: ProductGender | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 50 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ageGroup?: string | null;
}

export class UpdateAdminProductRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiPropertyOptional({ minLength: 1, maxLength: 255 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 280,
    pattern: SLUG_PATTERN.source,
  })
  @Transform(normalizeSlug)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  @Matches(SLUG_PATTERN)
  slug?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 10_000 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  @ApiPropertyOptional({ enum: ProductGender, nullable: true })
  @IsOptional()
  @IsEnum(ProductGender)
  gender?: ProductGender | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 50 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ageGroup?: string | null;
}

export class CreateAdminVariantRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sizeId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  colorId!: string;

  @ApiProperty({ minLength: 1, maxLength: 100, pattern: SKU_PATTERN.source })
  @Transform(normalizeSku)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(SKU_PATTERN)
  sku!: string;

  @ApiProperty({ type: String, pattern: DECIMAL_STRING_PATTERN.source })
  @Transform(trimString)
  @IsString()
  @MaxLength(19)
  @Matches(DECIMAL_STRING_PATTERN)
  price!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10_000_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  weightGrams?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  lengthCm?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  widthCm?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  heightCm?: number | null;
}

export class UpdateAdminVariantRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sizeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  @ApiPropertyOptional({ type: String, pattern: DECIMAL_STRING_PATTERN.source })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(19)
  @Matches(DECIMAL_STRING_PATTERN)
  price?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10_000_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  weightGrams?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  lengthCm?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  widthCm?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  heightCm?: number | null;
}

export class UpdateAdminVariantStatusRequestDto {
  @ApiProperty({ enum: VariantStatus })
  @IsEnum(VariantStatus)
  status!: VariantStatus;
}

export class CreateAdminProductImageRequestDto {
  @ApiProperty({ pattern: URL_PATTERN.source })
  @Transform(trimString)
  @IsString()
  @MaxLength(2_000)
  @Matches(URL_PATTERN)
  url!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000, default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateAdminProductImageRequestDto {
  @ApiPropertyOptional({ pattern: URL_PATTERN.source })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  @Matches(URL_PATTERN)
  url?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class AdminProductImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional({ nullable: true })
  altText!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isPrimary!: boolean;
}

export class AdminProductImageDeleteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  deleted!: boolean;
}

export class AdminVariantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ format: 'uuid' })
  sizeId!: string;

  @ApiProperty({ format: 'uuid' })
  colorId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty({ type: String, pattern: DECIMAL_STRING_PATTERN.source })
  price!: string;

  @ApiPropertyOptional({ nullable: true })
  weightGrams!: number | null;

  @ApiPropertyOptional({ nullable: true })
  lengthCm!: number | null;

  @ApiPropertyOptional({ nullable: true })
  widthCm!: number | null;

  @ApiPropertyOptional({ nullable: true })
  heightCm!: number | null;

  @ApiProperty({ enum: VariantStatus })
  status!: VariantStatus;

  @ApiProperty({ type: Object })
  size!: { id: string; code: string; name: string; sortOrder: number };

  @ApiProperty({ type: Object })
  color!: { id: string; code: string; name: string; hexCode: string | null };
}

export class AdminProductSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  brandId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  brandName!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ enum: ProductGender, nullable: true })
  gender!: ProductGender | null;

  @ApiPropertyOptional({ nullable: true })
  ageGroup!: string | null;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty()
  imageCount!: number;

  @ApiProperty()
  variantCount!: number;

  @ApiProperty()
  activeVariantCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class AdminProductDetailResponseDto extends AdminProductSummaryResponseDto {
  @ApiProperty({ type: AdminProductImageResponseDto, isArray: true })
  images!: AdminProductImageResponseDto[];

  @ApiProperty({ type: AdminVariantResponseDto, isArray: true })
  variants!: AdminVariantResponseDto[];
}

export class AdminProductListResponseDto {
  @ApiProperty({ type: AdminProductSummaryResponseDto, isArray: true })
  items!: AdminProductSummaryResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
