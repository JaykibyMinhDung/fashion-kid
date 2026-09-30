import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../generated/prisma/client';
import type { Granularity } from './reporting-query.dto';

export class ReportMetadataDto {
  @ApiProperty({
    description: 'Ngày bắt đầu khoảng thống kê (YYYY-MM-DD)',
    example: '2026-09-01',
  })
  from: string;

  @ApiProperty({
    description:
      'Ngày kết thúc khoảng thống kê (YYYY-MM-DD, boundary loại trừ)',
    example: '2026-09-08',
  })
  to: string;

  @ApiProperty({
    description: 'Múi giờ chuẩn thống kê',
    example: 'Asia/Ho_Chi_Minh',
  })
  timezone: string;

  @ApiProperty({
    description: 'Thời điểm báo cáo được tạo ra (ISO 8601)',
    example: '2026-09-08T10:00:00.000Z',
  })
  generatedAt: string;
}

export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Doanh thu gộp đơn hoàn tất (VND, decimal string)',
    example: '800000',
  })
  grossRevenue: string;

  @ApiProperty({
    description:
      'Doanh thu thuần chưa thuế VAT của đơn hoàn tất (VND, decimal string)',
    example: '740741',
  })
  netRevenue: string;

  @ApiProperty({
    description: 'Tiền thuế VAT của đơn hoàn tất (VND, decimal string)',
    example: '59259',
  })
  vatAmount: string;

  @ApiProperty({ description: 'Tổng số đơn hàng hoàn tất', example: 2 })
  completedOrders: number;

  @ApiProperty({
    description:
      'Giá trị đơn hàng trung bình (AOV = grossRevenue / completedOrders)',
    example: '400000',
  })
  averageOrderValue: string;

  @ApiProperty({
    description: 'Tổng số lượng sản phẩm bán ra từ các đơn hoàn tất',
    example: 5,
  })
  unitsSold: number;

  @ApiProperty({
    description: 'Số biến thể đã hết hàng (available = 0)',
    example: 1,
  })
  outOfStockVariants: number;

  @ApiProperty({
    description: 'Số biến thể sắp hết hàng (available <= threshold)',
    example: 3,
  })
  lowStockVariants: number;

  @ApiProperty({
    description: 'Số khách hàng mới đăng ký trong khoảng thời gian',
    example: 10,
  })
  newCustomers: number;

  @ApiProperty({ type: ReportMetadataDto })
  metadata: ReportMetadataDto;
}

export class RevenuePointDto {
  @ApiProperty({
    description: 'Mốc thời gian (YYYY-MM-DD hoặc YYYY-MM)',
    example: '2026-09-01',
  })
  date: string;

  @ApiProperty({
    description: 'Doanh thu hoàn tất tại mốc thời gian (decimal string)',
    example: '300000',
  })
  grossRevenue: string;

  @ApiProperty({ description: 'Số đơn hoàn tất tại mốc thời gian', example: 1 })
  completedOrders: number;
}

export class RevenueSeriesResponseDto {
  @ApiProperty({
    description: 'Bước nhảy chuỗi thời gian',
    enum: ['day', 'week', 'month'],
  })
  granularity: Granularity;

  @ApiProperty({ type: [RevenuePointDto] })
  series: RevenuePointDto[];

  @ApiProperty({
    description: 'Tổng doanh thu cả chuỗi (decimal string)',
    example: '800000',
  })
  totalRevenue: string;

  @ApiProperty({ description: 'Tổng đơn hoàn tất cả chuỗi', example: 2 })
  totalOrders: number;

  @ApiProperty({ type: ReportMetadataDto })
  metadata: ReportMetadataDto;
}

export class OrderStatusItemDto {
  @ApiProperty({ enum: OrderStatus, description: 'Trạng thái đơn hàng' })
  status: OrderStatus;

  @ApiProperty({ description: 'Số lượng đơn hàng', example: 15 })
  count: number;

  @ApiProperty({ description: 'Tỷ lệ phần trăm (0 - 100)', example: 45.5 })
  percentage: number;
}

export class OrdersReportResponseDto {
  @ApiProperty({
    type: [OrderStatusItemDto],
    description: 'Phân bổ đơn hàng hiện tại theo trạng thái',
  })
  currentDistribution: OrderStatusItemDto[];

  @ApiProperty({
    description: 'Tổng số đơn hàng hiện hữu trong hệ thống',
    example: 33,
  })
  totalCurrentOrders: number;

  @ApiProperty({
    description: 'Số đơn tạo mới trong khoảng thời gian',
    example: 20,
  })
  periodCreatedOrders: number;

  @ApiProperty({
    description: 'Số đơn chuyển sang hoàn tất trong khoảng thời gian',
    example: 14,
  })
  periodCompletedOrders: number;

  @ApiProperty({
    description: 'Số đơn bị hủy trong khoảng thời gian',
    example: 2,
  })
  periodCancelledOrders: number;

  @ApiProperty({ type: ReportMetadataDto })
  metadata: ReportMetadataDto;
}

export class TopProductItemDto {
  @ApiProperty({ description: 'ID sản phẩm' })
  productId: string;

  @ApiProperty({
    description: 'Tên sản phẩm',
    example: 'Áo Thun Bé Trai In Hình',
  })
  productName: string;

  @ApiProperty({ description: 'ID biến thể' })
  variantId: string;

  @ApiProperty({ description: 'SKU biến thể' })
  sku: string;

  @ApiProperty({
    description: 'Tên biến thể / size / màu',
    example: 'Trắng - 2T',
  })
  variantName: string;

  @ApiProperty({
    description: 'Số lượng đã bán trong các đơn hoàn tất',
    example: 12,
  })
  unitsSold: number;

  @ApiProperty({
    description: 'Doanh số giá trị hàng bán (line_total, decimal string)',
    example: '1800000',
  })
  productRevenue: string;
}

export class TopProductsResponseDto {
  @ApiProperty({ type: [TopProductItemDto] })
  items: TopProductItemDto[];

  @ApiProperty({
    description: 'Tổng doanh thu các sản phẩm trong top',
    example: '5400000',
  })
  totalRevenueRanked: string;

  @ApiProperty({
    description: 'Tổng số lượng các sản phẩm trong top',
    example: 36,
  })
  totalUnitsRanked: number;

  @ApiProperty({ type: ReportMetadataDto })
  metadata: ReportMetadataDto;
}

export class InventoryAlertItemDto {
  @ApiProperty({ description: 'ID biến thể' })
  variantId: string;

  @ApiProperty({ description: 'ID sản phẩm' })
  productId: string;

  @ApiProperty({ description: 'Tên sản phẩm' })
  productName: string;

  @ApiProperty({ description: 'SKU biến thể' })
  sku: string;

  @ApiProperty({ description: 'Kích cỡ' })
  sizeName: string;

  @ApiProperty({ description: 'Màu sắc' })
  colorName: string;

  @ApiProperty({ description: 'Tồn thực tế on-hand', example: 5 })
  onHand: number;

  @ApiProperty({ description: 'Đã giữ chỗ reserved', example: 3 })
  reserved: number;

  @ApiProperty({
    description: 'Tồn khả dụng available = on_hand - reserved',
    example: 2,
  })
  available: number;

  @ApiProperty({
    description: 'Biến thể đã hết hàng hoàn toàn (available <= 0)',
    example: false,
  })
  isOutOfStock: boolean;
}

export class InventoryAlertsResponseDto {
  @ApiProperty({ type: [InventoryAlertItemDto] })
  items: InventoryAlertItemDto[];

  @ApiProperty({ description: 'Số lượng biến thể hết hàng', example: 2 })
  outOfStockCount: number;

  @ApiProperty({ description: 'Số lượng biến thể sắp hết hàng', example: 5 })
  lowStockCount: number;

  @ApiProperty({ description: 'Ngưỡng cấu hình cảnh báo', example: 5 })
  threshold: number;
}

export class CouponUsageItemDto {
  @ApiProperty({ description: 'ID coupon' })
  couponId: string;

  @ApiProperty({ description: 'Mã coupon', example: 'SUMMER2026' })
  code: string;

  @ApiProperty({ description: 'Tên chương trình' })
  name: string;

  @ApiProperty({
    description:
      'Tổng số tiền giảm thực tế trong đơn hoàn tất (decimal string)',
    example: '150000',
  })
  discountAmount: string;

  @ApiProperty({
    description: 'Số lượt sử dụng trong đơn hoàn tất',
    example: 3,
  })
  usageCount: number;
}

export class CouponsReportResponseDto {
  @ApiProperty({
    description:
      'Tổng tiền giảm giá thực nhận trong các đơn hoàn tất (decimal string)',
    example: '350000',
  })
  realizedDiscountAmount: string;

  @ApiProperty({
    description: 'Tổng lượt áp dụng mã trong đơn hoàn tất',
    example: 7,
  })
  totalCompletedUsages: number;

  @ApiProperty({ type: [CouponUsageItemDto] })
  topCoupons: CouponUsageItemDto[];

  @ApiProperty({ type: ReportMetadataDto })
  metadata: ReportMetadataDto;
}

export class ReviewsReportResponseDto {
  @ApiProperty({
    description: 'Tổng số đánh giá đã duyệt PUBLISHED',
    example: 28,
  })
  publishedReviewCount: number;

  @ApiProperty({
    description: 'Điểm đánh giá trung bình (1.0 - 5.0)',
    example: 4.8,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Phân bổ số sao đánh giá',
    example: { '5': 20, '4': 6, '3': 2, '2': 0, '1': 0 },
  })
  ratingDistribution: Record<number, number>;
}

export class PaymentMethodItemDto {
  @ApiProperty({ description: 'Phương thức thanh toán', example: 'COD' })
  method: string;

  @ApiProperty({
    description: 'Số tiền thanh toán thực nhận (decimal string)',
    example: '2500000',
  })
  amount: string;

  @ApiProperty({ description: 'Số lượng giao dịch thành công', example: 8 })
  count: number;
}

export class PaymentsReportResponseDto {
  @ApiProperty({ type: [PaymentMethodItemDto] })
  methods: PaymentMethodItemDto[];

  @ApiProperty({
    description: 'Tổng tiền đã thanh toán thành công (decimal string)',
    example: '2500000',
  })
  totalPaidAmount: string;

  @ApiProperty({ type: ReportMetadataDto })
  metadata: ReportMetadataDto;
}

export class TaxSummaryResponseDto {
  @ApiProperty({
    description: 'Doanh thu gộp đã gồm thuế VAT (VND, decimal string)',
    example: '800000',
  })
  grossRevenue: string;

  @ApiProperty({
    description: 'Doanh thu thuần chưa thuế VAT (VND, decimal string)',
    example: '740741',
  })
  netRevenue: string;

  @ApiProperty({
    description: 'Tổng tiền thuế VAT bóc tách (VND, decimal string)',
    example: '59259',
  })
  vatAmount: string;

  @ApiProperty({ description: 'Tổng số đơn hàng hoàn tất', example: 2 })
  completedOrders: number;

  @ApiProperty({ type: ReportMetadataDto })
  metadata: ReportMetadataDto;
}
