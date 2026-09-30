import { OrderStatus } from '../../../generated/prisma/client';
import {
  Granularity,
  InventoryStatusFilter,
  TopProductsSort,
} from '../dto/reporting-query.dto';

export abstract class ReportingRepository {
  abstract getCompletedRevenueSummary(
    fromUtc: Date,
    toUtc: Date,
  ): Promise<{
    grossRevenue: bigint;
    netRevenue: bigint;
    vatAmount: bigint;
    completedOrders: number;
    unitsSold: number;
  }>;

  abstract getNewCustomersCount(fromUtc: Date, toUtc: Date): Promise<number>;

  abstract getInventoryAlertCounts(
    threshold: number,
  ): Promise<{ outOfStockCount: number; lowStockCount: number }>;

  abstract getRevenueSeries(
    fromUtc: Date,
    toUtc: Date,
    granularity: Granularity,
  ): Promise<Array<{ bucket: string; revenue: bigint; count: number }>>;

  abstract getCurrentOrderStatusCounts(): Promise<
    Array<{ status: OrderStatus; count: number }>
  >;

  abstract getPeriodOrderCounts(
    fromUtc: Date,
    toUtc: Date,
  ): Promise<{ created: number; completed: number; cancelled: number }>;

  abstract getTopProducts(
    fromUtc: Date,
    toUtc: Date,
    limit: number,
    sortBy: TopProductsSort,
  ): Promise<
    Array<{
      productId: string;
      productName: string;
      variantId: string;
      sku: string;
      variantName: string;
      unitsSold: number;
      productRevenue: bigint;
    }>
  >;

  abstract getInventoryAlerts(
    threshold: number,
    limit: number,
    status: InventoryStatusFilter,
  ): Promise<
    Array<{
      variantId: string;
      productId: string;
      productName: string;
      sku: string;
      sizeName: string;
      colorName: string;
      onHand: number;
      reserved: number;
      available: number;
    }>
  >;

  abstract getCompletedCouponUsage(
    fromUtc: Date,
    toUtc: Date,
    limit: number,
  ): Promise<{
    totalDiscount: bigint;
    totalUsages: number;
    topCoupons: Array<{
      couponId: string;
      code: string;
      name: string;
      discountAmount: bigint;
      usageCount: number;
    }>;
  }>;

  abstract getReviewSummary(): Promise<{
    totalPublished: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }>;

  abstract getPaymentMethodBreakdown(
    fromUtc: Date,
    toUtc: Date,
  ): Promise<Array<{ method: string; amount: bigint; count: number }>>;
}
