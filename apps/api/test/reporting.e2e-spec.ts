import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../src/common/security/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import {
  EntityStatus,
  OrderStatus,
  PaymentMethod,
  ProductStatus,
  UserStatus,
  VariantStatus,
} from '../src/generated/prisma/client';
import {
  DashboardSummaryDto,
  InventoryAlertsResponseDto,
  OrdersReportResponseDto,
  RevenuePointDto,
  RevenueSeriesResponseDto,
  TopProductsResponseDto,
} from '../src/modules/reporting/dto/reporting-response.dto';
import { createTestApplication } from './test-app.factory';

function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Reporting Module (e2e) - Gate M7', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let customerToken: string;
  let salesToken: string;
  let warehouseToken: string;
  let adminToken: string;

  let customerId: string;
  let salesId: string;
  let warehouseStaffId: string;
  let adminId: string;

  let warehouseId: string;
  let productId: string;
  let variantId: string;

  const createdOrderIds: string[] = [];
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    app = await createTestApplication();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);

    const [
      customerRole,
      salesRole,
      warehouseRole,
      adminRole,
      category,
      size,
      color,
      wh,
    ] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'SALES_STAFF' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'WAREHOUSE_STAFF' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } }),
      prisma.category.findFirstOrThrow({
        where: { status: EntityStatus.ACTIVE },
      }),
      prisma.size.findFirstOrThrow({
        where: { status: EntityStatus.ACTIVE },
      }),
      prisma.color.findFirstOrThrow({
        where: { status: EntityStatus.ACTIVE },
      }),
      prisma.warehouse.findFirstOrThrow({
        where: { code: 'MAIN_WAREHOUSE', status: EntityStatus.ACTIVE },
      }),
    ]);
    warehouseId = wh.id;

    // 1. Create users for RBAC testing
    const [c, s, w, a] = await Promise.all([
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: `rep-c-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Reporting Customer',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: salesRole.id,
          email: `rep-s-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Reporting Sales',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: warehouseRole.id,
          email: `rep-w-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Reporting Warehouse',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: adminRole.id,
          email: `rep-a-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Reporting Admin',
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    customerId = c.id;
    salesId = s.id;
    warehouseStaffId = w.id;
    adminId = a.id;

    const accessTokens = app.get(AccessTokenService);
    const [cToken, sToken, wToken, aToken] = await Promise.all([
      accessTokens.sign(customerId, 'CUSTOMER'),
      accessTokens.sign(salesId, 'SALES_STAFF'),
      accessTokens.sign(warehouseStaffId, 'WAREHOUSE_STAFF'),
      accessTokens.sign(adminId, 'ADMIN'),
    ]);
    customerToken = cToken;
    salesToken = sToken;
    warehouseToken = wToken;
    adminToken = aToken;

    // 2. Create catalog fixtures for top products & inventory alerts
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Sản Phẩm Reporting ${suffix}`,
        slug: `san-pham-reporting-${suffix}`,
        status: ProductStatus.ACTIVE,
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sizeId: size.id,
        colorId: color.id,
        sku: `REP-${suffix}`,
        price: 150000n,
        status: VariantStatus.ACTIVE,
      },
    });
    variantId = variant.id;

    await prisma.inventory.create({
      data: {
        warehouseId,
        variantId: variant.id,
        onHand: 3,
        reserved: 0,
      },
    });

    // 3. Create Gate M7 Deterministic Fixtures
    // Dates chosen: 2026-09-11 and 2026-09-12 (isolated window)
    // O1: COMPLETED, 300,000 VND, 2 units (2026-09-11 10:00 local = 03:00 UTC)
    const o1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-M7-01-${suffix}`,
        userId: customerId,
        status: OrderStatus.COMPLETED,
        itemsSubtotal: 300000n,
        totalAmount: 300000n,
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Khách Hàng 1',
        receiverPhone: '0901234561',
        shippingAddressLine: '123 Đường 1',
        shippingWardCode: '00001',
        shippingWardName: 'Phường 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        completedAt: new Date('2026-09-11T03:00:00.000Z'),
        createdAt: new Date('2026-09-11T02:00:00.000Z'),
        items: {
          create: {
            variantId,
            productName: product.name,
            sku: variant.sku,
            sizeName: size.name,
            colorName: color.name,
            unitPrice: 150000n,
            quantity: 2,
            lineTotal: 300000n,
          },
        },
      },
    });
    createdOrderIds.push(o1.id);

    // O2: COMPLETED, 500,000 VND, 3 units (2026-09-12 10:00 local = 03:00 UTC)
    const o2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-M7-02-${suffix}`,
        userId: customerId,
        status: OrderStatus.COMPLETED,
        itemsSubtotal: 500000n,
        totalAmount: 500000n,
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Khách Hàng 2',
        receiverPhone: '0901234562',
        shippingAddressLine: '456 Đường 2',
        shippingWardCode: '00001',
        shippingWardName: 'Phường 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        completedAt: new Date('2026-09-12T03:00:00.000Z'),
        createdAt: new Date('2026-09-12T02:00:00.000Z'),
        items: {
          create: [
            {
              variantId,
              productName: product.name,
              sku: variant.sku,
              sizeName: size.name,
              colorName: color.name,
              unitPrice: 200000n,
              quantity: 2,
              lineTotal: 400000n,
            },
            {
              variantId,
              productName: product.name,
              sku: variant.sku,
              sizeName: size.name,
              colorName: color.name,
              unitPrice: 100000n,
              quantity: 1,
              lineTotal: 100000n,
            },
          ],
        },
      },
    });
    createdOrderIds.push(o2.id);

    // O3: CANCELLED, 200,000 VND (Must be excluded)
    const o3 = await prisma.order.create({
      data: {
        orderNumber: `ORD-M7-03-${suffix}`,
        userId: customerId,
        status: OrderStatus.CANCELLED,
        itemsSubtotal: 200000n,
        totalAmount: 200000n,
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Khách Hàng 3',
        receiverPhone: '0901234563',
        shippingAddressLine: '789 Đường 3',
        shippingWardCode: '00001',
        shippingWardName: 'Phường 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        cancelledAt: new Date('2026-09-11T05:00:00.000Z'),
        createdAt: new Date('2026-09-11T04:00:00.000Z'),
      },
    });
    createdOrderIds.push(o3.id);

    // O4: SHIPPING, 400,000 VND (Must be excluded)
    const o4 = await prisma.order.create({
      data: {
        orderNumber: `ORD-M7-04-${suffix}`,
        userId: customerId,
        status: OrderStatus.SHIPPING,
        itemsSubtotal: 400000n,
        totalAmount: 400000n,
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Khách Hàng 4',
        receiverPhone: '0901234564',
        shippingAddressLine: '101 Đường 4',
        shippingWardCode: '00001',
        shippingWardName: 'Phường 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        shippingAt: new Date('2026-09-12T05:00:00.000Z'),
        createdAt: new Date('2026-09-12T04:00:00.000Z'),
      },
    });
    createdOrderIds.push(o4.id);

    // 4. Create Timezone Boundary Fixtures (window: 2026-09-20 to 2026-09-22)
    // OB1: 2026-09-20T16:59:59.000Z -> 2026-09-20 23:59:59 UTC+7 (Day 2026-09-20)
    const ob1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-M7-B1-${suffix}`,
        userId: customerId,
        status: OrderStatus.COMPLETED,
        itemsSubtotal: 150000n,
        totalAmount: 150000n,
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Khách Hàng Boundary 1',
        receiverPhone: '0901234565',
        shippingAddressLine: '102 Đường B1',
        shippingWardCode: '00001',
        shippingWardName: 'Phường 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        completedAt: new Date('2026-09-20T16:59:59.000Z'),
        createdAt: new Date('2026-09-20T16:00:00.000Z'),
        items: {
          create: {
            variantId,
            productName: product.name,
            sku: variant.sku,
            sizeName: size.name,
            colorName: color.name,
            unitPrice: 150000n,
            quantity: 1,
            lineTotal: 150000n,
          },
        },
      },
    });
    createdOrderIds.push(ob1.id);

    // OB2: 2026-09-20T17:00:00.000Z -> 2026-09-21 00:00:00 UTC+7 (Day 2026-09-21)
    const ob2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-M7-B2-${suffix}`,
        userId: customerId,
        status: OrderStatus.COMPLETED,
        itemsSubtotal: 250000n,
        totalAmount: 250000n,
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Khách Hàng Boundary 2',
        receiverPhone: '0901234566',
        shippingAddressLine: '103 Đường B2',
        shippingWardCode: '00001',
        shippingWardName: 'Phường 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        completedAt: new Date('2026-09-20T17:00:00.000Z'),
        createdAt: new Date('2026-09-20T16:30:00.000Z'),
        items: {
          create: {
            variantId,
            productName: product.name,
            sku: variant.sku,
            sizeName: size.name,
            colorName: color.name,
            unitPrice: 250000n,
            quantity: 1,
            lineTotal: 250000n,
          },
        },
      },
    });
    createdOrderIds.push(ob2.id);
  });

  afterAll(async () => {
    // Clean up created orders & items
    if (createdOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }

    // Clean up inventory & variants & products
    if (variantId) {
      await prisma.inventory.deleteMany({ where: { variantId } });
      await prisma.productVariant.deleteMany({ where: { id: variantId } });
    }
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }

    // Clean up users
    const userIds = [customerId, salesId, warehouseStaffId, adminId].filter(
      Boolean,
    );
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await app.close();
  });

  describe('RBAC Access Control', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const response = await request(server).get('/api/v1/reporting/summary');
      expect(response.status).toBe(401);
    });

    it('should reject CUSTOMER role with 403', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/summary')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(response.status).toBe(403);
    });

    it('should reject SALES_STAFF role with 403', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/summary')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(response.status).toBe(403);
    });

    it('should reject WAREHOUSE_STAFF role with 403', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/summary')
        .set('Authorization', `Bearer ${warehouseToken}`);
      expect(response.status).toBe(403);
    });

    it('should allow ADMIN role with 200', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/summary?from=2026-09-11&to=2026-09-13')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe('Gate M7: Deterministic KPI Fixture', () => {
    it('should compute exact KPI: grossRevenue=800000, completedOrders=2, AOV=400000, unitsSold=5', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/summary?from=2026-09-11&to=2026-09-13')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const data = bodyOf<DashboardSummaryDto>(response);

      expect(data.grossRevenue).toBe('800000');
      expect(data.completedOrders).toBe(2);
      expect(data.averageOrderValue).toBe('400000');
      expect(data.unitsSold).toBe(5);
      expect(data.metadata.timezone).toBe('Asia/Ho_Chi_Minh');
    });

    it('should exclude CANCELLED and SHIPPING orders from revenue series', async () => {
      const response = await request(server)
        .get(
          '/api/v1/reporting/revenue?from=2026-09-11&to=2026-09-13&granularity=day',
        )
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const data = bodyOf<RevenueSeriesResponseDto>(response);

      expect(data.totalRevenue).toBe('800000');
      expect(data.totalOrders).toBe(2);

      const day1 = data.series.find(
        (s: RevenuePointDto) => s.date === '2026-09-11',
      );
      const day2 = data.series.find(
        (s: RevenuePointDto) => s.date === '2026-09-12',
      );

      expect(day1).toBeDefined();
      expect(day1?.grossRevenue).toBe('300000');
      expect(day1?.completedOrders).toBe(1);

      expect(day2).toBeDefined();
      expect(day2?.grossRevenue).toBe('500000');
      expect(day2?.completedOrders).toBe(1);
    });
  });

  describe('Gate M7: Timezone Boundary (16:59:59Z vs 17:00:00Z)', () => {
    it('should correctly allocate 16:59:59Z to local date and 17:00:00Z to next local date', async () => {
      const response = await request(server)
        .get(
          '/api/v1/reporting/revenue?from=2026-09-20&to=2026-09-22&granularity=day',
        )
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const data = bodyOf<RevenueSeriesResponseDto>(response);

      const day20 = data.series.find(
        (s: RevenuePointDto) => s.date === '2026-09-20',
      );
      const day21 = data.series.find(
        (s: RevenuePointDto) => s.date === '2026-09-21',
      );

      expect(day20).toBeDefined();
      expect(day20?.grossRevenue).toBe('150000');
      expect(day20?.completedOrders).toBe(1);

      expect(day21).toBeDefined();
      expect(day21?.grossRevenue).toBe('250000');
      expect(day21?.completedOrders).toBe(1);
    });
  });

  describe('No-Data Graceful Handling', () => {
    it('should return zeros for date ranges with no completed orders', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/summary?from=2025-01-01&to=2025-01-05')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const data = bodyOf<DashboardSummaryDto>(response);

      expect(data.grossRevenue).toBe('0');
      expect(data.completedOrders).toBe(0);
      expect(data.averageOrderValue).toBe('0');
      expect(data.unitsSold).toBe(0);
    });
  });

  describe('Security & PII Leaks', () => {
    it('should not contain any PII fields in summary or series response', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/summary?from=2026-09-11&to=2026-09-13')
        .set('Authorization', `Bearer ${adminToken}`);

      const bodyText = JSON.stringify(response.body);
      expect(bodyText).not.toContain('Khách Hàng');
      expect(bodyText).not.toContain('090123456');
      expect(bodyText).not.toContain('Đường');
      expect(bodyText).not.toContain('@mam-nho.local');
    });
  });

  describe('Additional Reporting Endpoints', () => {
    it('GET /api/v1/reporting/orders should return status breakdown', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/orders?from=2026-09-11&to=2026-09-13')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const data = bodyOf<OrdersReportResponseDto>(response);
      expect(data.currentDistribution).toBeInstanceOf(Array);
      expect(data.currentDistribution.length).toBe(7);
      expect(data.periodCompletedOrders).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/v1/reporting/products should return top products', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/products?from=2026-09-11&to=2026-09-13')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const data = bodyOf<TopProductsResponseDto>(response);
      expect(data.items).toBeInstanceOf(Array);
      expect(data.totalRevenueRanked).toBe('800000');
      expect(data.totalUnitsRanked).toBe(5);
    });

    it('GET /api/v1/reporting/inventory should return stock alerts', async () => {
      const response = await request(server)
        .get('/api/v1/reporting/inventory?threshold=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const data = bodyOf<InventoryAlertsResponseDto>(response);
      expect(data.threshold).toBe(5);
      expect(data.items).toBeInstanceOf(Array);
    });
  });
});
