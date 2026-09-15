import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReportRangeQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(['day', 'week', 'month']) granularity?:
    'day' | 'week' | 'month';
}

export class ProductReportQueryDto extends ReportRangeQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 10;
  @IsOptional() @IsIn(['revenue', 'units']) sortBy: 'revenue' | 'units' =
    'revenue';
}

export class InventoryReportQueryDto {
  @IsOptional() @IsIn(['out-of-stock', 'low-stock', 'all']) status:
    'out-of-stock' | 'low-stock' | 'all' = 'all';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
}
