import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  OrderStatus,
  ProductStatus,
  VariantStatus,
} from '../../generated/prisma/client';
import {
  ReportRangeQueryDto,
  ProductReportQueryDto,
  InventoryReportQueryDto,
} from './dto/report-range.dto';

const TZ = 'Asia/Ho_Chi_Minh';
const DAY = 86_400_000;
@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}
  range(q: ReportRangeQueryDto) {
    const to = q.to ? new Date(q.to) : new Date();
    const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * DAY);
    if (
      Number.isNaN(from.valueOf()) ||
      Number.isNaN(to.valueOf()) ||
      from >= to
    )
      throw new BadRequestException('REPORT_INVALID_DATE_RANGE');
    if (to.getTime() - from.getTime() > 366 * DAY)
      throw new BadRequestException('REPORT_RANGE_TOO_LARGE');
    const days = (to.getTime() - from.getTime()) / DAY;
    const granularity =
      q.granularity ?? (days <= 31 ? 'day' : days <= 180 ? 'week' : 'month');
    return { from, to, granularity, timezone: TZ };
  }
  async summary(q: ReportRangeQueryDto) {
    const r = this.range(q);
    const completed = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        completedAt: { gte: r.from, lt: r.to },
      },
      select: {
        id: true,
        totalAmount: true,
        userId: true,
        items: { select: { quantity: true } },
      },
    });
    const [
      createdOrders,
      cancelledOrders,
      newCustomers,
      statusRows,
      inventory,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: r.from, lt: r.to } },
      }),
      this.prisma.order.count({
        where: { cancelledAt: { gte: r.from, lt: r.to } },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: r.from, lt: r.to },
          role: { code: 'CUSTOMER' },
        },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.inventory.findMany({
        select: {
          onHand: true,
          reserved: true,
          variant: {
            select: { status: true, product: { select: { status: true } } },
          },
        },
      }),
    ]);
    const gross = completed.reduce((s, o) => s + o.totalAmount, 0n);
    const units = completed
      .flatMap((o) => o.items)
      .reduce((s, i) => s + BigInt(i.quantity), 0n);
    return {
      range: r,
      generatedAt: new Date(),
      kpis: {
        grossRevenue: gross,
        completedOrders: completed.length,
        createdOrders,
        cancelledOrders,
        averageOrderValue: completed.length
          ? gross / BigInt(completed.length)
          : 0n,
        unitsSold: units,
        newCustomers,
        outOfStockVariants: inventory.filter(
          (i) =>
            i.variant.status === VariantStatus.ACTIVE &&
            i.variant.product.status === ProductStatus.ACTIVE &&
            i.onHand - i.reserved <= 0,
        ).length,
      },
      orderStatusSnapshot: Object.fromEntries(
        statusRows.map((x) => [x.status, x._count._all]),
      ),
    };
  }
  async revenue(q: ReportRangeQueryDto) {
    const r = this.range(q);
    const rows = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        completedAt: { gte: r.from, lt: r.to },
      },
      select: { totalAmount: true, completedAt: true },
    });
    const map = new Map<
      string,
      { grossRevenue: bigint; completedOrders: number }
    >();
    for (const x of rows) {
      const d = new Date(x.completedAt!);
      const key = this.bucket(d, r.granularity);
      const v = map.get(key) ?? { grossRevenue: 0n, completedOrders: 0 };
      v.grossRevenue += x.totalAmount;
      v.completedOrders++;
      map.set(key, v);
    }
    return {
      range: r,
      points: [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([periodStart, v]) => ({
          periodStart,
          ...v,
          averageOrderValue: v.completedOrders
            ? v.grossRevenue / BigInt(v.completedOrders)
            : 0n,
        })),
    };
  }
  private bucket(d: Date, g: string) {
    const local = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
    if (g === 'month')
      return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-01`;
    if (g === 'week') {
      const x = new Date(local);
      x.setDate(local.getDate() - ((local.getDay() + 6) % 7));
      return x.toISOString().slice(0, 10);
    }
    return local.toISOString().slice(0, 10);
  }
  async products(q: ProductReportQueryDto) {
    const r = this.range(q);
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          status: OrderStatus.COMPLETED,
          completedAt: { gte: r.from, lt: r.to },
        },
      },
      select: {
        productName: true,
        quantity: true,
        lineTotal: true,
        orderId: true,
      },
    });
    const m = new Map<
      string,
      { unitsSold: number; revenue: bigint; orders: Set<string> }
    >();
    for (const i of items) {
      const v = m.get(i.productName) ?? {
        unitsSold: 0,
        revenue: 0n,
        orders: new Set<string>(),
      };
      v.unitsSold += i.quantity;
      v.revenue += i.lineTotal;
      v.orders.add(i.orderId);
      m.set(i.productName, v);
    }
    return [...m.entries()]
      .sort((a, b) =>
        q.sortBy === 'units'
          ? b[1].unitsSold - a[1].unitsSold
          : b[1].revenue > a[1].revenue
            ? 1
            : b[1].revenue < a[1].revenue
              ? -1
              : a[0].localeCompare(b[0]),
      )
      .slice(0, q.limit)
      .map(([name, v]) => ({ name, ...v, orderCount: v.orders.size }));
  }
  async inventory(q: InventoryReportQueryDto) {
    const rows = await this.prisma.inventory.findMany({
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      where: {
        variant: {
          status: VariantStatus.ACTIVE,
          product: { status: ProductStatus.ACTIVE },
        },
      },
      select: {
        onHand: true,
        reserved: true,
        updatedAt: true,
        variant: {
          select: { id: true, sku: true, product: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const items = rows
      .map((x) => ({ ...x, available: x.onHand - x.reserved }))
      .filter(
        (x) =>
          q.status === 'all' ||
          (q.status === 'out-of-stock'
            ? x.available <= 0
            : x.available > 0 && x.available <= 5),
      );
    return { items, page: q.page, limit: q.limit };
  }
}
