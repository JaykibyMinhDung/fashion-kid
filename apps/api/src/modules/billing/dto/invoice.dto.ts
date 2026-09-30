import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '../../../generated/prisma/client';
import type { BuyerSnapshot, SellerSnapshot } from '../domain/billing.types';

export class InvoiceItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  variantId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  colorName: string;

  @ApiProperty()
  sizeName: string;

  @ApiProperty({ description: 'Đơn giá đã gồm VAT (string)' })
  unitPrice: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ description: 'Thành tiền đã gồm VAT (string)' })
  lineTotal: string;
}

export class InvoiceDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ example: 'INV-202609-000001' })
  invoiceNumber: string;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty()
  issuedAt: string;

  @ApiProperty({ required: false, nullable: true })
  voidedAt?: string | null;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({
    description: 'Doanh thu trước thuế (string)',
    example: '92593',
  })
  netAmount: string;

  @ApiProperty({ description: 'Thuế suất tính bằng bps', example: 800 })
  taxRateBps: number;

  @ApiProperty({ description: 'Thuế suất % hiển thị', example: 8 })
  taxRatePercent: number;

  @ApiProperty({ description: 'Tiền thuế VAT (string)', example: '7407' })
  taxAmount: string;

  @ApiProperty({
    description: 'Tổng tiền thanh toán (string)',
    example: '100000',
  })
  grossAmount: string;

  @ApiProperty({ description: 'Tạm tính tiền hàng (string)' })
  itemsSubtotal: string;

  @ApiProperty({ description: 'Tiền giảm giá (string)' })
  discountAmount: string;

  @ApiProperty({ description: 'Phí vận chuyển (string)' })
  shippingFee: string;

  @ApiProperty()
  seller: SellerSnapshot;

  @ApiProperty()
  buyer: BuyerSnapshot;

  @ApiProperty({ type: [InvoiceItemDto] })
  items: InvoiceItemDto[];
}

export class InvoiceListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'INV-202609-000001' })
  invoiceNumber: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty()
  issuedAt: string;

  @ApiProperty({ required: false, nullable: true })
  voidedAt?: string | null;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ description: 'Tiền trước thuế (string)' })
  netAmount: string;

  @ApiProperty({ example: 800 })
  taxRateBps: number;

  @ApiProperty({ description: 'Tiền thuế VAT (string)' })
  taxAmount: string;

  @ApiProperty({ description: 'Tổng thanh toán (string)' })
  grossAmount: string;

  @ApiProperty()
  receiverName: string;

  @ApiProperty()
  receiverPhone: string;
}

export class InvoicePaginatedResponseDto {
  @ApiProperty({ type: [InvoiceListItemDto] })
  items: InvoiceListItemDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
