import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateShippingQuoteRequestDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID của địa chỉ nhận hàng thuộc sở hữu của user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  addressId!: string;
}

export class ShippingQuoteResponseDto {
  @ApiProperty({
    example: '30000',
    description: 'Phí vận chuyển tính bằng VND (chuỗi số thập phân)',
  })
  fee!: string;

  @ApiProperty({ enum: ['PROVIDER', 'FALLBACK'], example: 'FALLBACK' })
  source!: 'PROVIDER' | 'FALLBACK';

  @ApiPropertyOptional({ example: 'STANDARD_FALLBACK' })
  provider?: string;

  @ApiPropertyOptional({ example: 'STANDARD' })
  serviceCode?: string;

  @ApiPropertyOptional({ example: 'Giao hàng tiêu chuẩn' })
  serviceName?: string;

  @ApiPropertyOptional({ example: 3 })
  estimatedDays?: number;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Chữ ký báo giá gắn với user, địa chỉ và nội dung giỏ hàng',
  })
  quoteFingerprint!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

export class GhnWebhookPayloadDto {
  @ApiProperty({ example: 'GHN-ABC-123' })
  @IsNotEmpty()
  OrderCode!: string;

  @ApiPropertyOptional({ example: 'ORD-20260915-000001' })
  ClientOrderCode?: string;

  @ApiProperty({ example: 'delivered' })
  @IsNotEmpty()
  Status!: string;

  @ApiPropertyOptional()
  Time?: string | number;

  @ApiPropertyOptional()
  TotalFee?: number;

  @ApiPropertyOptional()
  Reason?: string;

  @ApiPropertyOptional()
  ReasonCode?: string;

  @ApiPropertyOptional()
  Type?: string;

  @ApiPropertyOptional()
  CODAmount?: number;
}
