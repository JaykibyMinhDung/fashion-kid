import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../generated/prisma/client';

export const ALLOWED_ACTIONS = [
  'CONFIRM',
  'CANCEL',
  'START_PACKING',
  'SHIP',
  'DELIVER',
  'COMPLETE',
] as const;

export type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

export const ORDER_SORT_VALUES = ['createdAt:desc', 'createdAt:asc'] as const;

export type OrderSort = (typeof ORDER_SORT_VALUES)[number];

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CustomerOrderQueryDto {
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

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

export class OperationalOrderQueryDto {
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

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã đơn hàng' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  orderNumber?: string;

  @ApiPropertyOptional({ enum: ORDER_SORT_VALUES, default: 'createdAt:desc' })
  @IsOptional()
  @IsIn(ORDER_SORT_VALUES)
  sort: OrderSort = 'createdAt:desc';
}

export class CancelOrderRequestDto {
  @ApiProperty({
    description: 'Lý do huỷ đơn hàng (tối đa 500 ký tự)',
    example: 'Khách hàng đổi ý muốn đặt mẫu khác',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Lý do huỷ đơn hàng không được để trống' })
  @MaxLength(500, {
    message: 'Lý do huỷ đơn hàng không được vượt quá 500 ký tự',
  })
  reason!: string;
}

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty({ example: 'Áo polo bé trai' })
  productName!: string;

  @ApiProperty({ example: 'POLO-BOY-01-NAVY-M' })
  sku!: string;

  @ApiProperty({ example: 'Xanh navy' })
  colorName!: string;

  @ApiProperty({ example: 'M' })
  sizeName!: string;

  @ApiProperty({ example: '150000', description: 'Đơn giá dạng chuỗi số' })
  unitPrice!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: '300000', description: 'Thành tiền dạng chuỗi số' })
  lineTotal!: string;
}

export class OrderPaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.COD })
  method!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @ApiProperty({ example: '330000' })
  amount!: string;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  paidAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  cancelledAt!: string | null;
}

export class OrderShippingResponseDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  receiverName!: string;

  @ApiProperty({ example: '0901234567' })
  receiverPhone!: string;

  @ApiProperty({ example: '123 Đường Số 1' })
  shippingAddressLine!: string;

  @ApiProperty({ example: '00001' })
  shippingWardCode!: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  shippingWardName!: string;

  @ApiProperty({ example: '01' })
  shippingProvinceCode!: string;

  @ApiProperty({ example: 'Hà Nội' })
  shippingProvinceName!: string;

  @ApiPropertyOptional({ example: 'STANDARD_FALLBACK', nullable: true })
  shippingProvider!: string | null;

  @ApiPropertyOptional({ example: 'STANDARD', nullable: true })
  shippingServiceCode!: string | null;

  @ApiPropertyOptional({ example: 'Giao hàng tiêu chuẩn', nullable: true })
  shippingServiceName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  shippingTrackingCode!: string | null;

  @ApiProperty({ example: '30000' })
  shippingFee!: string;
}

export class OrderStatusHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ enum: OrderStatus, nullable: true })
  fromStatus!: OrderStatus | null;

  @ApiProperty({ enum: OrderStatus })
  toStatus!: OrderStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  changedBy?: string | null;

  @ApiPropertyOptional({ nullable: true })
  actorName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class OrderListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ORD-20260908-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: '330000' })
  totalAmount!: string;

  @ApiProperty({ example: '300000' })
  itemsSubtotal!: string;

  @ApiProperty({ example: '30000' })
  shippingFee!: string;

  @ApiProperty({ example: 2 })
  itemCount!: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  receiverName!: string;

  @ApiProperty({ example: '0901234567' })
  receiverPhone!: string;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus!: PaymentStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class OrderListResponseDto {
  @ApiProperty({ type: OrderListItemResponseDto, isArray: true })
  items!: OrderListItemResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class OrderDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ORD-20260908-000001' })
  orderNumber!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  userId?: string;

  @ApiPropertyOptional({ example: 'user@example.com', nullable: true })
  customerEmail?: string | null;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', nullable: true })
  customerName?: string | null;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: '300000' })
  itemsSubtotal!: string;

  @ApiProperty({ example: '0' })
  discountAmount!: string;

  @ApiProperty({ example: '30000' })
  shippingFee!: string;

  @ApiProperty({ example: '330000' })
  totalAmount!: string;

  @ApiPropertyOptional({ nullable: true })
  customerNote!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancelReason!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  confirmedAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  packingAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  shippingAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deliveredAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  cancelledAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  completedAt!: string | null;

  @ApiProperty({ type: OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];

  @ApiPropertyOptional({ type: OrderPaymentResponseDto, nullable: true })
  payment!: OrderPaymentResponseDto | null;

  @ApiProperty({ type: OrderShippingResponseDto })
  shipping!: OrderShippingResponseDto;

  @ApiProperty({ type: OrderStatusHistoryResponseDto, isArray: true })
  statusHistories!: OrderStatusHistoryResponseDto[];

  @ApiProperty({
    enum: ALLOWED_ACTIONS,
    isArray: true,
    description:
      'Danh sách các hành động người dùng hiện tại được phép thực hiện trên đơn',
    example: ['CONFIRM', 'CANCEL'],
  })
  allowedActions!: AllowedAction[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
