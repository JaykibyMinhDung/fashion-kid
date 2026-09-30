/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars */
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
  PaymentStatus,
  ProductStatus,
  UserStatus,
  VariantStatus,
} from '../src/generated/prisma/client';
import { GhnClient } from '../src/modules/shipping/providers/ghn/ghn-client';
import { createTestApplication } from './test-app.factory';

describe('Shipping API & GHN Integration (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let ghnClient: GhnClient;

  let customerToken: string;
  let warehouseToken: string;
  let adminToken: string;

  let customerId: string;
  let warehouseStaffId: string;
  let adminId: string;

  let addressId: string;
  let variantId: string;
  let testOrderId: string;
  let testOrderNumber: string;

  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    app = await createTestApplication();
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
    ghnClient = app.get(GhnClient);

    const [customerRole, warehouseRole, adminRole, category, size, color] =
      await Promise.all([
        prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
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
      ]);

    // Create users
    const [customer, warehouse, admin] = await Promise.all([
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: `cust-ship-${suffix}@test.local`,
          passwordHash: 'dummy',
          fullName: 'Customer Shipping Tester',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: warehouseRole.id,
          email: `wh-ship-${suffix}@test.local`,
          passwordHash: 'dummy',
          fullName: 'Warehouse Shipping Tester',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: adminRole.id,
          email: `admin-ship-${suffix}@test.local`,
          passwordHash: 'dummy',
          fullName: 'Admin Shipping Tester',
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    customerId = customer.id;
    warehouseStaffId = warehouse.id;
    adminId = admin.id;

    // Issue tokens
    const accessTokens = app.get(AccessTokenService);
    [customerToken, warehouseToken, adminToken] = await Promise.all([
      accessTokens.sign(customerId, 'CUSTOMER'),
      accessTokens.sign(warehouseStaffId, 'WAREHOUSE_STAFF'),
      accessTokens.sign(adminId, 'ADMIN'),
    ]);

    // Create address for customer
    const addr = await prisma.address.create({
      data: {
        userId: customerId,
        receiverName: 'Nguyen Van Ship',
        phone: '0987654321',
        addressLine: '244 Hoang Quoc Viet',
        wardCode: '11001',
        wardName: 'Phường Cổ Nhuế 1',
        provinceCode: '01',
        provinceName: 'Hà Nội',
        isDefault: true,
      },
    });
    addressId = addr.id;

    // Create a product & variant
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Áo khoác gió ${suffix}`,
        slug: `ao-khoac-gio-${suffix}`,
        status: ProductStatus.ACTIVE,
        variants: {
          create: {
            sku: `AKG-${suffix}`,
            price: 250000n,
            originalPrice: 250000n,
            colorId: color.id,
            sizeId: size.id,
            weightGrams: 300,
            status: VariantStatus.ACTIVE,
          },
        },
      },
      include: { variants: true },
    });
    variantId = product.variants[0].id;

    // Add item to customer's cart
    await prisma.cart.upsert({
      where: { userId: customerId },
      create: {
        userId: customerId,
        items: {
          create: {
            variantId,
            quantity: 2,
          },
        },
      },
      update: {
        items: {
          deleteMany: {},
          create: {
            variantId,
            quantity: 2,
          },
        },
      },
    });

    // Create test order in CONFIRMED state
    testOrderNumber = `ORD-SHIP-${suffix}`;
    const order = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        userId: customerId,
        status: OrderStatus.CONFIRMED,
        itemsSubtotal: 500000n,
        shippingFee: 30000n,
        totalAmount: 530000n,
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Nguyen Van Ship',
        receiverPhone: '0987654321',
        shippingAddressLine: '244 Hoang Quoc Viet, Bac Tu Liem',
        shippingWardCode: '11001',
        shippingWardName: 'Phường Cổ Nhuế 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        items: {
          create: {
            variantId,
            productName: `Áo khoác gió ${suffix}`,
            sku: `AKG-${suffix}`,
            colorName: 'Xanh',
            sizeName: 'M',
            unitPrice: 250000n,
            quantity: 2,
            lineTotal: 50000n,
          },
        },
        payment: {
          create: {
            method: PaymentMethod.COD,
            status: PaymentStatus.PENDING,
            amount: 530000n,
          },
        },
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testOrderId) {
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: testOrderId },
      });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    if (addressId) {
      await prisma.address.deleteMany({ where: { id: addressId } });
    }
    if (customerId) {
      await prisma.cartItem.deleteMany({
        where: { cart: { userId: customerId } },
      });
      await prisma.cart.deleteMany({ where: { userId: customerId } });
      await prisma.user.deleteMany({
        where: { id: { in: [customerId, warehouseStaffId, adminId] } },
      });
    }
    if (variantId) {
      await prisma.productVariant.deleteMany({ where: { id: variantId } });
      await prisma.product.deleteMany({
        where: { slug: `ao-khoac-gio-${suffix}` },
      });
    }
    await app.close();
  });

  describe('POST /api/v1/shipping/quote', () => {
    it('returns shipping quote for valid customer address', async () => {
      const res = await request(server)
        .post('/api/v1/shipping/quote')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId })
        .expect(200);

      expect(res.body).toHaveProperty('fee');
      expect(res.body).toHaveProperty('source');
      expect(res.body).toHaveProperty('provider');
      expect(res.body).toHaveProperty('quoteFingerprint');
      expect(res.body).toHaveProperty('expiresAt');
    });

    it('rejects quote when unauthorized', async () => {
      await request(server)
        .post('/api/v1/shipping/quote')
        .send({ addressId })
        .expect(401);
    });
  });

  describe('POST /api/v1/operational/orders/:id/shipping/create', () => {
    it('rejects creation for CUSTOMER role (RBAC 403)', async () => {
      await request(server)
        .post(`/api/v1/operational/orders/${testOrderId}/shipping/create`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('creates shipment for CONFIRMED order with WAREHOUSE_STAFF role', async () => {
      // Mock createOrder on ghnClient to avoid creating fake shipment in live GHN gateway
      jest.spyOn(ghnClient, 'createOrder').mockResolvedValueOnce({
        order_code: `GHN-${suffix}`,
        sort_code: 'HN-123',
        trans_type: 'truck',
        ward_encode: '11001',
        district_encode: '1482',
        fee: {
          main_service: 30000,
          insurance: 0,
          station_do: 0,
          station_pu: 0,
          return: 0,
          r2s: 0,
          return_again: 0,
          coupon: 0,
          document_return: 0,
          double_check: 0,
          double_check_deliver: 0,
          pick_remote_areas_fee: 0,
          deliver_remote_areas_fee: 0,
          cod_failed_fee: 0,
        },
        total_fee: 30000,
        expected_delivery_time: '2026-09-18T10:00:00Z',
      });

      const res = await request(server)
        .post(`/api/v1/operational/orders/${testOrderId}/shipping/create`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);

      expect(res.body.shippingTrackingCode).toBe(`GHN-${suffix}`);
      expect(res.body.shippingProvider).toBe('GHN');
      expect(res.body.isCreated).toBe(true);
    });

    it('idempotently returns existing shipment when called again', async () => {
      const res = await request(server)
        .post(`/api/v1/operational/orders/${testOrderId}/shipping/create`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);

      expect(res.body.shippingTrackingCode).toBe(`GHN-${suffix}`);
    });
  });

  describe('GET /api/v1/orders/:id/shipping', () => {
    it('returns shipping block with tracking code', async () => {
      const res = await request(server)
        .get(`/api/v1/orders/${testOrderId}/shipping`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.shippingTrackingCode).toBe(`GHN-${suffix}`);
      expect(res.body.isCreated).toBe(true);
      expect(res.body.simplifiedStatus).toBeTruthy();
    });
  });

  describe('POST /api/v1/webhooks/shipping/ghn', () => {
    it('is @Public and safely ignores unknown orders without error', async () => {
      const res = await request(server)
        .post('/api/v1/webhooks/shipping/ghn')
        .send({
          OrderCode: 'UNKNOWN-GHN-TRACKING',
          Status: 'delivered',
        })
        .expect(200);

      expect(res.body).toEqual({ received: true, ignored: true });
    });

    it('processes webhook and transitions order to DELIVERED when order is SHIPPING', async () => {
      // First update order to SHIPPING status
      await prisma.order.update({
        where: { id: testOrderId },
        data: { status: OrderStatus.SHIPPING },
      });

      const res = await request(server)
        .post('/api/v1/webhooks/shipping/ghn')
        .send({
          OrderCode: `GHN-${suffix}`,
          Status: 'delivered',
        })
        .expect(200);

      expect(res.body.received).toBe(true);
      expect(res.body.status).toBe('DELIVERED');

      // Verify order status in database was updated to DELIVERED
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(updatedOrder?.status).toBe(OrderStatus.DELIVERED);
      expect(updatedOrder?.deliveredAt).toBeTruthy();
    });
  });
});
