import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function trimOptionalString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class CreateOrderCheckoutRequestDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID của địa chỉ nhận hàng thuộc sở hữu của user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  addressId!: string;

  @ApiProperty({
    enum: ['COD'],
    default: 'COD',
    description: 'Phương thức thanh toán (giai đoạn P0 chỉ hỗ trợ COD)',
    example: 'COD',
  })
  @IsIn(['COD'], { message: 'Phương thức thanh toán phải là COD' })
  paymentMethod = 'COD' as const;

  @ApiProperty({
    maxLength: 4096,
    description: 'Chữ ký báo giá nhận từ API shipping quote',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  quoteFingerprint!: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Ghi chú đơn hàng từ khách hàng (tối đa 500 ký tự)',
    example: 'Giao giờ hành chính giúp tôi',
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú đơn hàng tối đa 500 ký tự' })
  customerNote?: string | null;
}

export class CheckoutOrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty({ example: 'Áo thun bé trai' })
  productName!: string;

  @ApiProperty({ example: 'AT-BOY-01-RED-M' })
  sku!: string;

  @ApiProperty({ example: 'Đỏ' })
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

export class CheckoutOrderPaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['COD'], example: 'COD' })
  method!: string;

  @ApiProperty({ enum: ['PENDING'], example: 'PENDING' })
  status!: string;

  @ApiProperty({
    example: '330000',
    description: 'Số tiền thanh toán dạng chuỗi số',
  })
  amount!: string;

  @ApiProperty({ example: 'VND' })
  currency!: string;
}

export class CheckoutOrderShippingResponseDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  receiverName!: string;

  @ApiProperty({ example: '+84901234567' })
  receiverPhone!: string;

  @ApiProperty({ example: '123 Lê Lợi' })
  shippingAddressLine!: string;

  @ApiProperty({ example: '00001' })
  shippingWardCode!: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  shippingWardName!: string;

  @ApiProperty({ example: '01' })
  shippingProvinceCode!: string;

  @ApiProperty({ example: 'Hà Nội' })
  shippingProvinceName!: string;

  @ApiPropertyOptional({ example: 'STANDARD_FALLBACK' })
  shippingProvider?: string | null;

  @ApiPropertyOptional({ example: 'STANDARD' })
  shippingServiceCode?: string | null;

  @ApiPropertyOptional({ example: 'Giao hàng tiêu chuẩn' })
  shippingServiceName?: string | null;

  @ApiProperty({ enum: ['PROVIDER', 'FALLBACK'], example: 'FALLBACK' })
  shippingQuoteSource!: 'PROVIDER' | 'FALLBACK';

  @ApiProperty({ example: '30000' })
  shippingFee!: string;
}

export class CheckoutOrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ORD-20260907-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: ['PENDING'], example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: '300000', description: 'Tạm tính tiền hàng' })
  itemsSubtotal!: string;

  @ApiProperty({ example: '0', description: 'Số tiền giảm giá' })
  discountAmount!: string;

  @ApiProperty({ example: '30000', description: 'Phí vận chuyển' })
  shippingFee!: string;

  @ApiProperty({ example: '330000', description: 'Tổng tiền thanh toán' })
  totalAmount!: string;

  @ApiPropertyOptional({
    example: 'Giao giờ hành chính giúp tôi',
    nullable: true,
  })
  customerNote!: string | null;

  @ApiProperty({ type: [CheckoutOrderItemResponseDto] })
  items!: CheckoutOrderItemResponseDto[];

  @ApiProperty({ type: CheckoutOrderPaymentResponseDto })
  payment!: CheckoutOrderPaymentResponseDto;

  @ApiProperty({ type: CheckoutOrderShippingResponseDto })
  shipping!: CheckoutOrderShippingResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date | string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date | string;
}
