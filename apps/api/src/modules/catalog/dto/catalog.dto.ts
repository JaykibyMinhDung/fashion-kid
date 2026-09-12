import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  Matches,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EntityStatus,
  ProductGender,
  ProductStatus,
  VariantStatus,
} from '../../../generated/prisma/client';

export const PRODUCT_SORT_VALUES = [
  'newest',
  'price_asc',
  'price_desc',
  'name_asc',
] as const;

export type ProductSort = (typeof PRODUCT_SORT_VALUES)[number];

export const DECIMAL_STRING_PATTERN = /^(0|[1-9][0-9]*)$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListProductsQueryDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo tên sản phẩm hoặc slug' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Category slug' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(180)
  category?: string;

  @ApiPropertyOptional({ description: 'Brand slug' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(180)
  brand?: string;

  @ApiPropertyOptional({ enum: ProductGender })
  @IsOptional()
  @IsEnum(ProductGender)
  gender?: ProductGender;

  @ApiPropertyOptional({ description: 'Nhóm tuổi' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ageGroup?: string;

  @ApiPropertyOptional({ description: 'Size code, ví dụ 90 hoặc 2T' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;

  @ApiPropertyOptional({ description: 'Color code, ví dụ CORAL' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({
    description: 'Giá thấp nhất, chuỗi thập phân không âm, không dấu chấm',
    pattern: DECIMAL_STRING_PATTERN.source,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(19)
  @Matches(DECIMAL_STRING_PATTERN)
  minPrice?: string;

  @ApiPropertyOptional({
    description: 'Giá cao nhất, chuỗi thập phân không âm, không dấu chấm',
    pattern: DECIMAL_STRING_PATTERN.source,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(19)
  @Matches(DECIMAL_STRING_PATTERN)
  maxPrice?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORT_VALUES, default: 'newest' })
  @IsOptional()
  @IsIn(PRODUCT_SORT_VALUES)
  sort: ProductSort = 'newest';
}

export class CatalogCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  parentId!: string | null;
}

export class CatalogBrandResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  logoUrl!: string | null;
}

export class CatalogSizeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sortOrder!: number;
}

export class CatalogColorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  hexCode!: string | null;
}

export class CatalogImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uri' })
  url!: string;

  @ApiPropertyOptional({ nullable: true })
  altText!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isPrimary!: boolean;
}

export class CatalogVariantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty({ type: String, pattern: DECIMAL_STRING_PATTERN.source })
  price!: string;

  @ApiProperty({ enum: VariantStatus })
  status!: VariantStatus;

  @ApiProperty({ type: CatalogSizeResponseDto })
  size!: CatalogSizeResponseDto;

  @ApiProperty({ type: CatalogColorResponseDto })
  color!: CatalogColorResponseDto;
}

export class CatalogProductCardResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ enum: ProductGender, nullable: true })
  gender!: ProductGender | null;

  @ApiPropertyOptional({ nullable: true })
  ageGroup!: string | null;

  @ApiProperty({ type: CatalogCategoryResponseDto })
  category!: CatalogCategoryResponseDto;

  @ApiPropertyOptional({ type: CatalogBrandResponseDto, nullable: true })
  brand!: CatalogBrandResponseDto | null;

  @ApiPropertyOptional({ type: CatalogImageResponseDto, nullable: true })
  primaryImage!: CatalogImageResponseDto | null;

  @ApiProperty({ type: String, pattern: DECIMAL_STRING_PATTERN.source })
  minPrice!: string;

  @ApiProperty({ type: String, pattern: DECIMAL_STRING_PATTERN.source })
  maxPrice!: string;
}

export class CatalogProductDetailResponseDto extends CatalogProductCardResponseDto {
  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: CatalogImageResponseDto, isArray: true })
  images!: CatalogImageResponseDto[];

  @ApiProperty({ type: CatalogVariantResponseDto, isArray: true })
  variants!: CatalogVariantResponseDto[];
}

export class CatalogProductListResponseDto {
  @ApiProperty({ type: CatalogProductCardResponseDto, isArray: true })
  items!: CatalogProductCardResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export type PublicCatalogCategory = CatalogCategoryResponseDto & {
  status?: EntityStatus;
};

export type PublicCatalogBrand = CatalogBrandResponseDto & {
  status?: EntityStatus;
};

export type PublicCatalogProductStatus = ProductStatus;
