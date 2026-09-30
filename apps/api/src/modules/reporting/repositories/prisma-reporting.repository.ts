import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { OrderStatus } from '../../../generated/prisma/client';
import {
  Granularity,
  InventoryStatusFilter,
  TopProductsSort,
} from '../dto/reporting-query.dto';
import { ReportingRepository } from './reporting.repository';

@Injectable()
export class PrismaReportingRepository implements ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCompletedRevenueSummary(
    fromUtc: Date,
    toUtc: Date,
  ): Promise<{
    grossRevenue: bigint;
    netRevenue: bigint;
    vatAmount: bigint;
    completedOrders: number;
    unitsSold: number;
  }> {
    const [revenueResult, unitsResult] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          gross_revenue: string;
          net_revenue: string;
          vat_amount: string;
          completed_orders: number;
        }>
      >`
        SELECT
          COALESCE(SUM(total_amount), 0)::text AS gross_revenue,
          COALESCE(SUM(COALESCE(net_amount, total_amount)), 0)::text AS net_revenue,
          COALESCE(SUM(COALESCE(tax_amount, 0)), 0)::text AS vat_amount,
          COUNT(*)::int AS completed_orders
        FROM orders
        WHERE status = 'COMPLETED'
          AND completed_at >= ${fromUtc}
          AND completed_at < ${toUtc}
      `,
      this.prisma.$queryRaw<Array<{ units_sold: number }>>`
        SELECT
          COALESCE(SUM(oi.quantity), 0)::int AS units_sold
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'COMPLETED'
          AND o.completed_at >= ${fromUtc}
          AND o.completed_at < ${toUtc}
      `,
    ]);

    const revRow = revenueResult[0];
    const unitRow = unitsResult[0];

    return {
      grossRevenue: BigInt(revRow?.gross_revenue ?? '0'),
      netRevenue: BigInt(revRow?.net_revenue ?? '0'),
      vatAmount: BigInt(revRow?.vat_amount ?? '0'),
      completedOrders: Number(revRow?.completed_orders ?? 0),
      unitsSold: Number(unitRow?.units_sold ?? 0),
    };
  }

  async getNewCustomersCount(fromUtc: Date, toUtc: Date): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'CUSTOMER'
        AND u.created_at >= ${fromUtc}
        AND u.created_at < ${toUtc}
    `;

    return Number(result[0]?.count ?? 0);
  }

  async getInventoryAlertCounts(
    threshold: number,
  ): Promise<{ outOfStockCount: number; lowStockCount: number }> {
    const safeThreshold = Math.max(0, threshold);
    const result = await this.prisma.$queryRaw<
      Array<{ out_of_stock_count: number; low_stock_count: number }>
    >`
      SELECT
        COUNT(*) FILTER (
          WHERE (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) <= 0
        )::int AS out_of_stock_count,
        COUNT(*) FILTER (
          WHERE (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) > 0 
            AND (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) <= ${safeThreshold}
        )::int AS low_stock_count
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN inventories i ON i.variant_id = pv.id
      WHERE p.status = 'ACTIVE' AND pv.status = 'ACTIVE'
    `;

    return {
      outOfStockCount: Number(result[0]?.out_of_stock_count ?? 0),
      lowStockCount: Number(result[0]?.low_stock_count ?? 0),
    };
  }

  async getRevenueSeries(
    fromUtc: Date,
    toUtc: Date,
    granularity: Granularity,
  ): Promise<Array<{ bucket: string; revenue: bigint; count: number }>> {
    const validGranularity =
      granularity === 'month'
        ? 'month'
        : granularity === 'week'
          ? 'week'
          : 'day';
    const format = validGranularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ bucket: string; revenue: string; count: number }>
    >(
      `
      SELECT
        to_char(date_trunc($1, completed_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), $2) AS bucket,
        COALESCE(SUM(total_amount), 0)::text AS revenue,
        COUNT(*)::int AS count
      FROM orders
      WHERE status = 'COMPLETED'
        AND completed_at >= $3
        AND completed_at < $4
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      validGranularity,
      format,
      fromUtc,
      toUtc,
    );

    return rows.map((r) => ({
      bucket: r.bucket,
      revenue: BigInt(r.revenue ?? '0'),
      count: Number(r.count ?? 0),
    }));
  }

  async getCurrentOrderStatusCounts(): Promise<
    Array<{ status: OrderStatus; count: number }>
  > {
    const result = await this.prisma.order.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    return result.map((r) => ({
      status: r.status,
      count: r._count._all,
    }));
  }

  async getPeriodOrderCounts(
    fromUtc: Date,
    toUtc: Date,
  ): Promise<{ created: number; completed: number; cancelled: number }> {
    const [created, completed, cancelled] = await Promise.all([
      this.prisma.order.count({
        where: {
          createdAt: { gte: fromUtc, lt: toUtc },
        },
      }),
      this.prisma.order.count({
        where: {
          status: OrderStatus.COMPLETED,
          completedAt: { gte: fromUtc, lt: toUtc },
        },
      }),
      this.prisma.order.count({
        where: {
          status: OrderStatus.CANCELLED,
          cancelledAt: { gte: fromUtc, lt: toUtc },
        },
      }),
    ]);

    return { created, completed, cancelled };
  }

  async getTopProducts(
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
  > {
    const orderByClause =
      sortBy === 'units'
        ? 'units_sold DESC, product_revenue DESC'
        : 'product_revenue DESC, units_sold DESC';

    const safeLimit = Math.max(1, Math.min(50, limit));

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        product_id: string;
        product_name: string;
        variant_id: string;
        sku: string;
        size_name: string;
        color_name: string;
        units_sold: number;
        product_revenue: string;
      }>
    >(
      `
      SELECT
        pv.product_id::text AS product_id,
        oi.product_name,
        oi.variant_id::text AS variant_id,
        oi.sku,
        oi.size_name,
        oi.color_name,
        COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
        COALESCE(SUM(oi.line_total), 0)::text AS product_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.status = 'COMPLETED'
        AND o.completed_at >= $1
        AND o.completed_at < $2
      GROUP BY pv.product_id, oi.product_name, oi.variant_id, oi.sku, oi.size_name, oi.color_name
      ORDER BY ${orderByClause}
      LIMIT $3
      `,
      fromUtc,
      toUtc,
      safeLimit,
    );

    return rows.map((r) => {
      const parts = [r.color_name, r.size_name].filter(Boolean);
      const variantName = parts.length > 0 ? parts.join(' - ') : r.sku;

      return {
        productId: r.product_id,
        productName: r.product_name,
        variantId: r.variant_id,
        sku: r.sku,
        variantName,
        unitsSold: Number(r.units_sold),
        productRevenue: BigInt(r.product_revenue ?? '0'),
      };
    });
  }

  async getInventoryAlerts(
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
  > {
    const safeLimit = Math.max(1, Math.min(100, limit));
    const safeThreshold = Math.max(0, threshold);

    // Threshold luôn truyền qua tham số ($2::int) thay vì nội suy chuỗi,
    // giữ nguyên tắc parameterized SQL của Day 21 (dù đã validate là int).
    let filterClause = '';
    if (status === 'out-of-stock') {
      filterClause =
        'AND (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) <= 0';
    } else if (status === 'low-stock') {
      filterClause =
        'AND (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) > 0 AND (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) <= $2::int';
    } else {
      filterClause =
        'AND (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0)) <= $2::int';
    }

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        variant_id: string;
        product_id: string;
        product_name: string;
        sku: string;
        size_name: string | null;
        color_name: string | null;
        on_hand: number;
        reserved: number;
        available: number;
      }>
    >(
      `
      SELECT
        pv.id::text AS variant_id,
        p.id::text AS product_id,
        p.name AS product_name,
        pv.sku,
        COALESCE(s.name, '')::text AS size_name,
        COALESCE(c.name, '')::text AS color_name,
        COALESCE(i.on_hand, 0)::int AS on_hand,
        COALESCE(i.reserved, 0)::int AS reserved,
        (COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0))::int AS available
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN sizes s ON s.id = pv.size_id
      LEFT JOIN colors c ON c.id = pv.color_id
      LEFT JOIN inventories i ON i.variant_id = pv.id
      WHERE p.status = 'ACTIVE' AND pv.status = 'ACTIVE'
        ${filterClause}
      ORDER BY available ASC, p.name ASC
      LIMIT $1
      `,
      // $2 chỉ tồn tại khi filterClause tham chiếu tới nó (out-of-stock không dùng).
      ...(status === 'out-of-stock' ? [safeLimit] : [safeLimit, safeThreshold]),
    );

    return rows.map((r) => ({
      variantId: r.variant_id,
      productId: r.product_id,
      productName: r.product_name,
      sku: r.sku,
      sizeName: r.size_name ?? '',
      colorName: r.color_name ?? '',
      onHand: Number(r.on_hand),
      reserved: Number(r.reserved),
      available: Number(r.available),
    }));
  }

  async getCompletedCouponUsage(
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
  }> {
    const safeLimit = Math.max(1, Math.min(50, limit));

    const [totalRows, itemRows] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ total_discount: string; total_usages: number }>
      >`
        SELECT
          COALESCE(SUM(cu.discount_amount), 0)::text AS total_discount,
          COUNT(cu.id)::int AS total_usages
        FROM coupon_usages cu
        JOIN orders o ON o.id = cu.order_id
        WHERE o.status = 'COMPLETED'
          AND o.completed_at >= ${fromUtc}
          AND o.completed_at < ${toUtc}
      `,
      this.prisma.$queryRawUnsafe<
        Array<{
          coupon_id: string;
          code: string;
          name: string;
          discount_amount: string;
          usage_count: number;
        }>
      >(
        `
        SELECT
          c.id::text AS coupon_id,
          c.code,
          c.name,
          COALESCE(SUM(cu.discount_amount), 0)::text AS discount_amount,
          COUNT(cu.id)::int AS usage_count
        FROM coupon_usages cu
        JOIN coupons c ON c.id = cu.coupon_id
        JOIN orders o ON o.id = cu.order_id
        WHERE o.status = 'COMPLETED'
          AND o.completed_at >= $1
          AND o.completed_at < $2
        GROUP BY c.id, c.code, c.name
        ORDER BY discount_amount DESC
        LIMIT $3
        `,
        fromUtc,
        toUtc,
        safeLimit,
      ),
    ]);

    const total = totalRows[0];

    return {
      totalDiscount: BigInt(total?.total_discount ?? '0'),
      totalUsages: Number(total?.total_usages ?? 0),
      topCoupons: itemRows.map((r) => ({
        couponId: r.coupon_id,
        code: r.code,
        name: r.name,
        discountAmount: BigInt(r.discount_amount ?? '0'),
        usageCount: Number(r.usage_count ?? 0),
      })),
    };
  }

  async getReviewSummary(): Promise<{
    totalPublished: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const [general, distribution] = await Promise.all([
      this.prisma.review.aggregate({
        where: { status: 'PUBLISHED' },
        _count: { _all: true },
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { status: 'PUBLISHED' },
        _count: { _all: true },
      }),
    ]);

    const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      ratingMap[d.rating] = d._count._all;
    });

    return {
      totalPublished: general._count._all,
      averageRating: general._avg.rating
        ? Math.round(general._avg.rating * 10) / 10
        : 0,
      ratingDistribution: ratingMap,
    };
  }

  async getPaymentMethodBreakdown(
    fromUtc: Date,
    toUtc: Date,
  ): Promise<Array<{ method: string; amount: bigint; count: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ method: string; amount: string; count: number }>
    >`
      SELECT
        p.method::text AS method,
        COALESCE(SUM(p.amount), 0)::text AS amount,
        COUNT(p.id)::int AS count
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE o.status = 'COMPLETED'
        AND o.completed_at >= ${fromUtc}
        AND o.completed_at < ${toUtc}
        AND p.status = 'PAID'
      GROUP BY p.method
      ORDER BY amount DESC
    `;

    return rows.map((r) => ({
      method: r.method,
      amount: BigInt(r.amount ?? '0'),
      count: Number(r.count ?? 0),
    }));
  }
}
