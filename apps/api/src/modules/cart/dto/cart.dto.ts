import { IsInt, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CART_AVAILABILITY_VALUES = [
  'AVAILABLE',
  'OUT_OF_STOCK',
  'INSUFFICIENT_STOCK',
  'NOT_SELLABLE',
] as const;
export type CartAvailability = (typeof CART_AVAILABILITY_VALUES)[number];

export const CART_WARNING_VALUES = [
  'OUT_OF_STOCK',
  'INSUFFICIENT_AVAILABLE_STOCK',
  'VARIANT_NOT_SELLABLE',
] as const;
export type CartWarningCode = (typeof CART_WARNING_VALUES)[number];

export class AddCartItemRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, description: 'Số lượng cần thêm' })
  @IsInt()
  quantity!: number;
}

export class UpdateCartItemRequestDto {
  @ApiProperty({ minimum: 1, description: 'Số lượng mới, không dùng 0 để xóa' })
  @IsInt()
  quantity!: number;
}

export class CartProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class CartSizeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class CartColorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  hexCode!: string | null;
}

export class CartImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uri' })
  url!: string;

  @ApiPropertyOptional({ nullable: true })
  altText!: string | null;
}

export class CartWarningResponseDto {
  @ApiProperty({ enum: CART_WARNING_VALUES })
  code!: CartWarningCode;

  @ApiProperty({ format: 'uuid' })
  cartItemId!: string;

  @ApiProperty()
  message!: string;
}

export class CartItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  cartItemId!: string;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty({ type: CartProductResponseDto })
  product!: CartProductResponseDto;

  @ApiProperty({ type: CartSizeResponseDto })
  size!: CartSizeResponseDto;

  @ApiProperty({ type: CartColorResponseDto })
  color!: CartColorResponseDto;

  @ApiPropertyOptional({ type: CartImageResponseDto, nullable: true })
  primaryImage!: CartImageResponseDto | null;

  @ApiProperty({ minimum: 1 })
  quantity!: number;

  @ApiProperty({
    type: String,
    description: 'Giá hiện tại dạng decimal string',
  })
  currentUnitPrice!: string;

  @ApiProperty({
    type: String,
    description: 'Thành tiền hiện tại dạng decimal string',
  })
  lineSubtotal!: string;

  @ApiProperty({ enum: CART_AVAILABILITY_VALUES })
  availability!: CartAvailability;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  maxAvailableForPreview!: number | null;

  @ApiProperty()
  isPurchasable!: boolean;

  @ApiPropertyOptional({ enum: CART_WARNING_VALUES, nullable: true })
  warning!: CartWarningCode | null;
}

export class CartResponseDto {
  @ApiProperty({ type: CartItemResponseDto, isArray: true })
  items!: CartItemResponseDto[];

  @ApiProperty({
    type: String,
    description: 'Tổng tiền hiện tại dạng decimal string',
  })
  subtotal!: string;

  @ApiProperty({ minimum: 0 })
  itemCount!: number;

  @ApiProperty()
  isCheckoutReady!: boolean;

  @ApiProperty({ type: CartWarningResponseDto, isArray: true })
  warnings!: CartWarningResponseDto[];
}
