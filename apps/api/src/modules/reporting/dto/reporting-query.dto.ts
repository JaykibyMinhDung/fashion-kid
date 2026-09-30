import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const GRANULARITY_VALUES = ['day', 'week', 'month'] as const;
export type Granularity = (typeof GRANULARITY_VALUES)[number];

export const TOP_PRODUCTS_SORT_VALUES = ['revenue', 'units'] as const;
export type TopProductsSort = (typeof TOP_PRODUCTS_SORT_VALUES)[number];

export const INVENTORY_STATUS_FILTER = [
  'all',
  'out-of-stock',
  'low-stock',
] as const;
export type InventoryStatusFilter = (typeof INVENTORY_STATUS_FILTER)[number];

export const ORDERS_GROUP_BY_VALUES = ['status', 'day'] as const;
export type OrdersGroupBy = (typeof ORDERS_GROUP_BY_VALUES)[number];

export class DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Ngày bắt đầu theo chuẩn YYYY-MM-DD (múi giờ UTC+7)',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from phải có định dạng YYYY-MM-DD',
  })
  from?: string;

  @ApiPropertyOptional({
    description:
      'Ngày kết thúc theo chuẩn YYYY-MM-DD (múi giờ UTC+7, loại trừ boundary [from, to))',
    example: '2026-09-08',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to phải có định dạng YYYY-MM-DD',
  })
  to?: string;
}

export class RevenueSeriesQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    enum: GRANULARITY_VALUES,
    description:
      'Bước nhảy gom nhóm chuỗi thời gian doanh thu (day, week, month)',
    default: 'day',
  })
  @IsOptional()
  @IsIn(GRANULARITY_VALUES, {
    message: 'granularity phải là một trong: day, week, month',
  })
  granularity?: Granularity;
}

export class OrdersReportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    enum: ORDERS_GROUP_BY_VALUES,
    description: 'Tiêu chí gom nhóm báo cáo đơn hàng (status, day)',
    default: 'status',
  })
  @IsOptional()
  @IsIn(ORDERS_GROUP_BY_VALUES, {
    message: 'groupBy phải là một trong: status, day',
  })
  groupBy?: OrdersGroupBy;
}

export class TopProductsQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Số lượng sản phẩm bán chạy cần lấy (1-50)',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    enum: TOP_PRODUCTS_SORT_VALUES,
    description: 'Tiêu chí xếp hạng sản phẩm (revenue, units)',
    default: 'revenue',
  })
  @IsOptional()
  @IsIn(TOP_PRODUCTS_SORT_VALUES, {
    message: 'sortBy phải là revenue hoặc units',
  })
  sortBy: TopProductsSort = 'revenue';
}

export class InventoryAlertsQueryDto {
  @ApiPropertyOptional({
    description:
      'Ngưỡng tồn kho khả dụng để cảnh báo sắp hết hàng (available <= threshold)',
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  threshold = 5;

  @ApiPropertyOptional({
    description: 'Giới hạn số lượng bản ghi trả về (1-100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    enum: INVENTORY_STATUS_FILTER,
    description:
      'Lọc biến thể theo trạng thái tồn: all, out-of-stock, low-stock',
    default: 'all',
  })
  @IsOptional()
  @IsIn(INVENTORY_STATUS_FILTER, {
    message: 'status phải là một trong: all, out-of-stock, low-stock',
  })
  status: InventoryStatusFilter = 'all';
}

export class CouponsReportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Giới hạn số mã giảm giá trả về',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}

export class PaymentsReportQueryDto extends DateRangeQueryDto {}
