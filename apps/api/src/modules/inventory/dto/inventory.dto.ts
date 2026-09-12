import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EntityStatus,
  InventoryTxType,
} from '../../../generated/prisma/client';

export const MAIN_WAREHOUSE_CODE = 'MAIN_WAREHOUSE';
export const INVENTORY_SORT_VALUES = [
  'updatedAt:desc',
  'updatedAt:asc',
  'sku:asc',
  'available:asc',
] as const;

export type InventorySort = (typeof INVENTORY_SORT_VALUES)[number];

const WAREHOUSE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
const MAX_INVENTORY_VALUE = 2_147_483_647;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeWarehouseCode({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class ListInventoryQueryDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo SKU hoặc tên/slug sản phẩm' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    default: MAIN_WAREHOUSE_CODE,
    pattern: WAREHOUSE_CODE_PATTERN.source,
  })
  @Transform(normalizeWarehouseCode)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(WAREHOUSE_CODE_PATTERN)
  warehouseCode?: string;

  @ApiPropertyOptional({
    enum: INVENTORY_SORT_VALUES,
    default: 'updatedAt:desc',
  })
  @IsOptional()
  @IsIn(INVENTORY_SORT_VALUES)
  sort: InventorySort = 'updatedAt:desc';
}

export class ListInventoryHistoryQueryDto {
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

  @ApiPropertyOptional({ enum: InventoryTxType })
  @IsOptional()
  @IsEnum(InventoryTxType)
  type?: InventoryTxType;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({
    default: MAIN_WAREHOUSE_CODE,
    pattern: WAREHOUSE_CODE_PATTERN.source,
  })
  @Transform(normalizeWarehouseCode)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(WAREHOUSE_CODE_PATTERN)
  warehouseCode?: string;
}

export class CreateInventoryImportRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiPropertyOptional({
    default: MAIN_WAREHOUSE_CODE,
    pattern: WAREHOUSE_CODE_PATTERN.source,
  })
  @Transform(normalizeWarehouseCode)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(WAREHOUSE_CODE_PATTERN)
  warehouseCode?: string;

  @ApiProperty({ minimum: 1, maximum: MAX_INVENTORY_VALUE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INVENTORY_VALUE)
  quantity!: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AdjustInventoryRequestDto {
  @ApiProperty({
    minimum: 0,
    maximum: MAX_INVENTORY_VALUE,
    description: 'Mức onHand đích; không phải delta tùy ý',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_INVENTORY_VALUE)
  targetOnHand!: number;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  reason!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  referenceId?: string;
}

export class InventoryWarehouseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiProperty({ enum: EntityStatus })
  status!: EntityStatus;
}

export class InventoryProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class InventorySizeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class InventoryColorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  hexCode!: string | null;
}

export class InventoryVariantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty({ type: InventoryProductResponseDto })
  product!: InventoryProductResponseDto;

  @ApiProperty({ type: InventorySizeResponseDto })
  size!: InventorySizeResponseDto;

  @ApiProperty({ type: InventoryColorResponseDto })
  color!: InventoryColorResponseDto;
}

export class InventoryItemResponseDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  inventoryId!: string | null;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty({ type: InventoryWarehouseResponseDto })
  warehouse!: InventoryWarehouseResponseDto;

  @ApiProperty({ type: InventoryVariantResponseDto })
  variant!: InventoryVariantResponseDto;

  @ApiProperty({ minimum: 0 })
  onHand!: number;

  @ApiProperty({ minimum: 0 })
  reserved!: number;

  @ApiProperty({ minimum: 0 })
  available!: number;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class InventoryListResponseDto {
  @ApiProperty({ type: InventoryItemResponseDto, isArray: true })
  items!: InventoryItemResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class InventoryActorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;
}

export class InventoryTransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  inventoryId!: string;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty({ format: 'uuid' })
  warehouseId!: string;

  @ApiProperty({ enum: InventoryTxType })
  type!: InventoryTxType;

  @ApiProperty({ description: 'ADJUSTMENT có thể âm hoặc dương' })
  quantity!: number;

  @ApiProperty()
  onHandBefore!: number;

  @ApiProperty()
  onHandAfter!: number;

  @ApiProperty()
  reservedBefore!: number;

  @ApiProperty()
  reservedAfter!: number;

  @ApiPropertyOptional()
  referenceType!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  referenceId!: string | null;

  @ApiPropertyOptional({ type: InventoryActorResponseDto, nullable: true })
  actor!: InventoryActorResponseDto | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class InventoryHistoryResponseDto {
  @ApiProperty({ type: InventoryTransactionResponseDto, isArray: true })
  items!: InventoryTransactionResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class InventoryMutationResponseDto {
  @ApiProperty({ type: InventoryItemResponseDto })
  inventory!: InventoryItemResponseDto;

  @ApiProperty({ type: InventoryTransactionResponseDto })
  transaction!: InventoryTransactionResponseDto;
}
