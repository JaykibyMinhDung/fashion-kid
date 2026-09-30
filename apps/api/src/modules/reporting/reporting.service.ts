import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';
import { OrderStatus } from '../../generated/prisma/client';
import {
  CouponsReportQueryDto,
  DateRangeQueryDto,
  Granularity,
  GRANULARITY_VALUES,
  InventoryAlertsQueryDto,
  OrdersReportQueryDto,
  RevenueSeriesQueryDto,
  TopProductsQueryDto,
} from './dto/reporting-query.dto';
import {
  CouponsReportResponseDto,
  DashboardSummaryDto,
  InventoryAlertsResponseDto,
  OrdersReportResponseDto,
  OrderStatusItemDto,
  PaymentsReportResponseDto,
  ReportMetadataDto,
  RevenuePointDto,
  RevenueSeriesResponseDto,
  ReviewsReportResponseDto,
  TaxSummaryResponseDto,
  TopProductsResponseDto,
} from './dto/reporting-response.dto';
import { ReportingRepository } from './repositories/reporting.repository';

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const UTC_OFFSET_HOURS = 7;
const MAX_RANGE_DAYS = 366;

export interface NormalizedDateRange {
  fromStr: string;
  toStr: string;
  fromUtc: Date;
  toUtc: Date;
}

@Injectable()
export class ReportingService {
  constructor(private readonly repository: ReportingRepository) {}

  normalizeDateRange(query?: DateRangeQueryDto): NormalizedDateRange {
    let fromStr = query?.from;
    let toStr = query?.to;

    // Default: 30 ngày gần nhất (tính theo ngày hiện tại UTC+7)
    if (!fromStr || !toStr) {
      const now = new Date();
      // Chuyển sang giờ UTC+7
      const localNow = new Date(now.getTime() + UTC_OFFSET_HOURS * 3600 * 1000);

      if (!toStr) {
        // toStr mặc định là ngày mai theo UTC+7 để bao trọn ngày hôm nay [from, to)
        const tomorrow = new Date(localNow.getTime() + 24 * 3600 * 1000);
        const tYear = tomorrow.getUTCFullYear();
        const tMonth = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
        const tDay = String(tomorrow.getUTCDate()).padStart(2, '0');
        toStr = `${tYear}-${tMonth}-${tDay}`;
      }

      if (!fromStr) {
        const thirtyDaysAgo = new Date(
          localNow.getTime() - 29 * 24 * 3600 * 1000,
        );
        const fYear = thirtyDaysAgo.getUTCFullYear();
        const fMonth = String(thirtyDaysAgo.getUTCMonth() + 1).padStart(2, '0');
        const fDay = String(thirtyDaysAgo.getUTCDate()).padStart(2, '0');
        fromStr = `${fYear}-${fMonth}-${fDay}`;
      }
    }

    const fromParts = fromStr.split('-').map(Number);
    const toParts = toStr.split('-').map(Number);

    if (
      fromParts.length !== 3 ||
      toParts.length !== 3 ||
      fromParts.some(isNaN) ||
      toParts.some(isNaN)
    ) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'REPORT_INVALID_DATE_RANGE',
        'Ngày bắt đầu hoặc kết thúc không hợp lệ (định dạng đúng: YYYY-MM-DD)',
      );
    }

    // Convert YYYY-MM-DD 00:00:00 UTC+7 sang UTC timestamp
    const fromUtc = new Date(
      Date.UTC(
        fromParts[0],
        fromParts[1] - 1,
        fromParts[2],
        -UTC_OFFSET_HOURS,
        0,
        0,
        0,
      ),
    );
    const toUtc = new Date(
      Date.UTC(
        toParts[0],
        toParts[1] - 1,
        toParts[2],
        -UTC_OFFSET_HOURS,
        0,
        0,
        0,
      ),
    );

    if (fromUtc.getTime() >= toUtc.getTime()) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'REPORT_INVALID_DATE_RANGE',
        'Ngày bắt đầu (from) phải trước ngày kết thúc (to)',
      );
    }

    const diffDays = (toUtc.getTime() - fromUtc.getTime()) / (24 * 3600 * 1000);
    if (diffDays > MAX_RANGE_DAYS) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'REPORT_RANGE_TOO_LARGE',
        `Khoảng thời gian báo cáo không được vượt quá ${MAX_RANGE_DAYS} ngày`,
      );
    }

    return { fromStr, toStr, fromUtc, toUtc };
  }

  buildMetadata(range: NormalizedDateRange): ReportMetadataDto {
    return {
      from: range.fromStr,
      to: range.toStr,
      timezone: TIMEZONE,
      generatedAt: new Date().toISOString(),
    };
  }

  async getDashboardSummary(
    query?: DateRangeQueryDto,
  ): Promise<DashboardSummaryDto> {
    const range = this.normalizeDateRange(query);

    const [revenueSummary, newCustomers, inventoryAlerts] = await Promise.all([
      this.repository.getCompletedRevenueSummary(range.fromUtc, range.toUtc),
      this.repository.getNewCustomersCount(range.fromUtc, range.toUtc),
      this.repository.getInventoryAlertCounts(5),
    ]);

    const averageOrderValue =
      revenueSummary.completedOrders > 0
        ? (
            revenueSummary.grossRevenue / BigInt(revenueSummary.completedOrders)
          ).toString()
        : '0';

    return {
      grossRevenue: revenueSummary.grossRevenue.toString(),
      netRevenue: (
        revenueSummary.netRevenue ?? revenueSummary.grossRevenue
      ).toString(),
      vatAmount: (revenueSummary.vatAmount ?? 0n).toString(),
      completedOrders: revenueSummary.completedOrders,
      averageOrderValue,
      unitsSold: revenueSummary.unitsSold,
      outOfStockVariants: inventoryAlerts.outOfStockCount,
      lowStockVariants: inventoryAlerts.lowStockCount,
      newCustomers,
      metadata: this.buildMetadata(range),
    };
  }

  async getTaxSummary(
    query?: DateRangeQueryDto,
  ): Promise<TaxSummaryResponseDto> {
    const range = this.normalizeDateRange(query);
    const revenueSummary = await this.repository.getCompletedRevenueSummary(
      range.fromUtc,
      range.toUtc,
    );

    return {
      grossRevenue: revenueSummary.grossRevenue.toString(),
      netRevenue: (
        revenueSummary.netRevenue ?? revenueSummary.grossRevenue
      ).toString(),
      vatAmount: (revenueSummary.vatAmount ?? 0n).toString(),
      completedOrders: revenueSummary.completedOrders,
      metadata: this.buildMetadata(range),
    };
  }

  async getRevenueSeries(
    query?: RevenueSeriesQueryDto,
  ): Promise<RevenueSeriesResponseDto> {
    const range = this.normalizeDateRange(query);
    const granularity: Granularity = query?.granularity ?? 'day';

    if (!GRANULARITY_VALUES.includes(granularity)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'REPORT_INVALID_GRANULARITY',
        'Bước nhảy granularity phải là: day, week, month',
      );
    }

    const rawSeries = await this.repository.getRevenueSeries(
      range.fromUtc,
      range.toUtc,
      granularity,
    );

    // Map bucket sang map để zero-fill
    const rowMap = new Map<string, { revenue: bigint; count: number }>();
    let totalRevenue = 0n;
    let totalOrders = 0;

    for (const r of rawSeries) {
      rowMap.set(r.bucket, { revenue: r.revenue, count: r.count });
      totalRevenue += r.revenue;
      totalOrders += r.count;
    }

    // Zero-fill để biểu đồ không bị đứt quãng — áp dụng cho CẢ day/week/month.
    // Mọi mốc tính theo giờ địa phương UTC+7 bằng offset cố định (VN không có DST),
    // sinh đúng bucket-key mà Postgres tạo qua `... AT TIME ZONE 'Asia/Ho_Chi_Minh'`.
    const OFFSET_MS = UTC_OFFSET_HOURS * 3600 * 1000;
    const DAY_MS = 24 * 3600 * 1000;
    const pad = (n: number) => String(n).padStart(2, '0');
    const startLocalMs = range.fromUtc.getTime() + OFFSET_MS;
    const endLocalMs = range.toUtc.getTime() + OFFSET_MS;

    const series: RevenuePointDto[] = [];
    const pushBucket = (bucket: string) => {
      const found = rowMap.get(bucket);
      series.push({
        date: bucket,
        grossRevenue: found ? found.revenue.toString() : '0',
        completedOrders: found ? found.count : 0,
      });
    };

    if (granularity === 'month') {
      const start = new Date(startLocalMs);
      let y = start.getUTCFullYear();
      let m = start.getUTCMonth(); // 0-based, trong không gian local đã dịch
      while (Date.UTC(y, m, 1) < endLocalMs) {
        pushBucket(`${y}-${pad(m + 1)}`);
        m += 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
      }
    } else if (granularity === 'week') {
      // date_trunc('week') của Postgres = thứ Hai (ISO). Sinh các mốc thứ Hai local.
      const start = new Date(startLocalMs);
      const mondayOffset = (start.getUTCDay() + 6) % 7; // 0=CN..6=T7
      let weekStartMs =
        Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate(),
        ) -
        mondayOffset * DAY_MS;
      while (weekStartMs < endLocalMs) {
        const w = new Date(weekStartMs);
        pushBucket(
          `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(
            w.getUTCDate(),
          )}`,
        );
        weekStartMs += 7 * DAY_MS;
      }
    } else {
      let dayMs = startLocalMs;
      while (dayMs < endLocalMs) {
        const d = new Date(dayMs);
        pushBucket(
          `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
            d.getUTCDate(),
          )}`,
        );
        dayMs += DAY_MS;
      }
    }

    return {
      granularity,
      series,
      totalRevenue: totalRevenue.toString(),
      totalOrders,
      metadata: this.buildMetadata(range),
    };
  }

  async getOrdersReport(
    query?: OrdersReportQueryDto,
  ): Promise<OrdersReportResponseDto> {
    const range = this.normalizeDateRange(query);

    const [statusCounts, periodCounts] = await Promise.all([
      this.repository.getCurrentOrderStatusCounts(),
      this.repository.getPeriodOrderCounts(range.fromUtc, range.toUtc),
    ]);

    const totalCurrentOrders = statusCounts.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    const allStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PACKING,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ];

    const countMap = new Map<OrderStatus, number>();
    statusCounts.forEach((sc) => countMap.set(sc.status, sc.count));

    const currentDistribution: OrderStatusItemDto[] = allStatuses.map(
      (status) => {
        const count = countMap.get(status) ?? 0;
        const percentage =
          totalCurrentOrders > 0
            ? Math.round((count / totalCurrentOrders) * 1000) / 10
            : 0;
        return { status, count, percentage };
      },
    );

    return {
      currentDistribution,
      totalCurrentOrders,
      periodCreatedOrders: periodCounts.created,
      periodCompletedOrders: periodCounts.completed,
      periodCancelledOrders: periodCounts.cancelled,
      metadata: this.buildMetadata(range),
    };
  }

  async getTopProducts(
    query?: TopProductsQueryDto,
  ): Promise<TopProductsResponseDto> {
    const range = this.normalizeDateRange(query);
    const limit = query?.limit ?? 10;
    const sortBy = query?.sortBy ?? 'revenue';

    const items = await this.repository.getTopProducts(
      range.fromUtc,
      range.toUtc,
      limit,
      sortBy,
    );

    let totalRevenueRanked = 0n;
    let totalUnitsRanked = 0;

    const formattedItems = items.map((item) => {
      totalRevenueRanked += item.productRevenue;
      totalUnitsRanked += item.unitsSold;

      return {
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        sku: item.sku,
        variantName: item.variantName,
        unitsSold: item.unitsSold,
        productRevenue: item.productRevenue.toString(),
      };
    });

    return {
      items: formattedItems,
      totalRevenueRanked: totalRevenueRanked.toString(),
      totalUnitsRanked,
      metadata: this.buildMetadata(range),
    };
  }

  async getInventoryAlerts(
    query?: InventoryAlertsQueryDto,
  ): Promise<InventoryAlertsResponseDto> {
    const threshold = query?.threshold ?? 5;
    const limit = query?.limit ?? 20;
    const status = query?.status ?? 'all';

    const [items, counts] = await Promise.all([
      this.repository.getInventoryAlerts(threshold, limit, status),
      this.repository.getInventoryAlertCounts(threshold),
    ]);

    const formattedItems = items.map((item) => ({
      variantId: item.variantId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      sizeName: item.sizeName,
      colorName: item.colorName,
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.available,
      isOutOfStock: item.available <= 0,
    }));

    return {
      items: formattedItems,
      outOfStockCount: counts.outOfStockCount,
      lowStockCount: counts.lowStockCount,
      threshold,
    };
  }

  async getCouponsReport(
    query?: CouponsReportQueryDto,
  ): Promise<CouponsReportResponseDto> {
    const range = this.normalizeDateRange(query);
    const limit = query?.limit ?? 10;

    const result = await this.repository.getCompletedCouponUsage(
      range.fromUtc,
      range.toUtc,
      limit,
    );

    return {
      realizedDiscountAmount: result.totalDiscount.toString(),
      totalCompletedUsages: result.totalUsages,
      topCoupons: result.topCoupons.map((c) => ({
        couponId: c.couponId,
        code: c.code,
        name: c.name,
        discountAmount: c.discountAmount.toString(),
        usageCount: c.usageCount,
      })),
      metadata: this.buildMetadata(range),
    };
  }

  async getReviewsReport(): Promise<ReviewsReportResponseDto> {
    const summary = await this.repository.getReviewSummary();
    return {
      publishedReviewCount: summary.totalPublished,
      averageRating: summary.averageRating,
      ratingDistribution: summary.ratingDistribution,
    };
  }

  async getPaymentsReport(
    query?: DateRangeQueryDto,
  ): Promise<PaymentsReportResponseDto> {
    const range = this.normalizeDateRange(query);

    const methods = await this.repository.getPaymentMethodBreakdown(
      range.fromUtc,
      range.toUtc,
    );

    let totalPaid = 0n;
    const formattedMethods = methods.map((m) => {
      totalPaid += m.amount;
      return {
        method: m.method,
        amount: m.amount.toString(),
        count: m.count,
      };
    });

    return {
      methods: formattedMethods,
      totalPaidAmount: totalPaid.toString(),
      metadata: this.buildMetadata(range),
    };
  }
}
