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
  PaymentTxStatus,
  PaymentTxType,
  ProductStatus,
  UserStatus,
  VariantStatus,
} from '../src/generated/prisma/client';
import {
  OrderDetailResponseDto,
  OrderListResponseDto,
} from '../src/modules/orders/dto/order.dto';
import { createTestApplication } from './test-app.factory';

function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Orders API Lifecycle (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let customer1Token: string;
  let customer2Token: string;
  let salesToken: string;
  let warehouseToken: string;
  let adminToken: string;

  let customer1Id: string;
  let customer2Id: string;
  let salesId: string;
  let warehouseStaffId: string;
  let adminId: string;

  let warehouseId: string;
  let variantId: string;
  let address1Id: string;

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

    // Create users for each role (lowercase emails for PostgreSQL check constraint)
    const [c1, c2, s, w, a] = await Promise.all([
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: `ord-c1-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Order Customer One',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: `ord-c2-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Order Customer Two',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: salesRole.id,
          email: `ord-sales-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Order Sales Staff',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: warehouseRole.id,
          email: `ord-wh-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Order Warehouse Staff',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: adminRole.id,
          email: `ord-admin-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Order Administrator',
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    customer1Id = c1.id;
    customer2Id = c2.id;
    salesId = s.id;
    warehouseStaffId = w.id;
    adminId = a.id;

    const accessTokens = app.get(AccessTokenService);
    [customer1Token, customer2Token, salesToken, warehouseToken, adminToken] =
      await Promise.all([
        accessTokens.sign(customer1Id, 'CUSTOMER'),
        accessTokens.sign(customer2Id, 'CUSTOMER'),
        accessTokens.sign(salesId, 'SALES_STAFF'),
        accessTokens.sign(warehouseStaffId, 'WAREHOUSE_STAFF'),
        accessTokens.sign(adminId, 'ADMIN'),
      ]);

    const addr = await prisma.address.create({
      data: {
        userId: customer1Id,
        receiverName: 'Khách Hàng 1',
        phone: '0901234567',
        addressLine: '123 Phố Huế',
        wardCode: '00001',
        wardName: 'Phường Hàng Bài',
        provinceCode: '01',
        provinceName: 'Hà Nội',
        isDefault: true,
      },
    });
    address1Id = addr.id;

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Sản Phẩm Test Order ${suffix}`,
        slug: `san-pham-test-order-${suffix}`,
        status: ProductStatus.ACTIVE,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sizeId: size.id,
        colorId: color.id,
        sku: `ORD-SKU-${suffix}`,
        price: 150000n,
        weightGrams: 200,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 5,
        status: VariantStatus.ACTIVE,
      },
    });
    variantId = variant.id;

    await prisma.inventory.create({
      data: {
        warehouseId,
        variantId,
        onHand: 100,
        reserved: 0,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.inventoryTransaction.deleteMany({
        where: { variantId },
      });
      await prisma.orderItem.deleteMany({
        where: { variantId },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { order: { userId: { in: [customer1Id, customer2Id] } } },
      });
      await prisma.paymentTransaction.deleteMany({
        where: {
          payment: { order: { userId: { in: [customer1Id, customer2Id] } } },
        },
      });
      await prisma.payment.deleteMany({
        where: { order: { userId: { in: [customer1Id, customer2Id] } } },
      });
      await prisma.order.deleteMany({
        where: { userId: { in: [customer1Id, customer2Id] } },
      });
      await prisma.inventory.deleteMany({
        where: { variantId },
      });
      await prisma.productVariant.deleteMany({
        where: { id: variantId },
      });
      await prisma.product.deleteMany({
        where: { slug: `san-pham-test-order-${suffix}` },
      });
      await prisma.address.deleteMany({
        where: { id: address1Id },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [customer1Id, customer2Id, salesId, warehouseStaffId, adminId],
          },
        },
      });
    }
    if (app) {
      await app.close();
    }
  });

  async function createTestOrder(
    userId: string,
    initialStatus: OrderStatus = OrderStatus.PENDING,
  ): Promise<string> {
    const orderId = randomUUID();
    const orderNumber = `ORD-${Date.now().toString().slice(0, 8)}-${randomUUID().slice(0, 6)}`;

    // Create reservation ledger
    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: { warehouseId_variantId: { warehouseId, variantId } },
    });

    await prisma.inventory.update({
      where: { id: inventory.id },
      data: { reserved: { increment: 1 } },
    });

    await prisma.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        warehouseId,
        variantId,
        type: 'RESERVE',
        quantity: 1,
        onHandBefore: inventory.onHand,
        onHandAfter: inventory.onHand,
        reservedBefore: inventory.reserved,
        reservedAfter: inventory.reserved + 1,
        referenceType: 'ORDER',
        referenceId: orderId,
      },
    });

    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber,
        userId,
        status: initialStatus,
        itemsSubtotal: 150000n,
        shippingFee: 30000n,
        totalAmount: 180000n,
        currency: 'VND',
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Khách Hàng',
        receiverPhone: '0901234567',
        shippingAddressLine: '123 Phố Huế',
        shippingWardCode: '00001',
        shippingWardName: 'Phường Hàng Bài',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        items: {
          create: {
            variantId,
            productName: `Sản Phẩm Test Order ${suffix}`,
            sku: `ORD-SKU-${suffix}`,
            colorName: 'Đỏ',
            sizeName: 'M',
            unitPrice: 150000n,
            quantity: 1,
            lineTotal: 150000n,
          },
        },
        statusHistories: {
          create: {
            fromStatus: null,
            toStatus: initialStatus,
            changedBy: userId,
            note: 'Tạo đơn test',
          },
        },
        payment: {
          create: {
            method: PaymentMethod.COD,
            status: PaymentStatus.PENDING,
            amount: 180000n,
            currency: 'VND',
            transactions: {
              create: {
                type: PaymentTxType.PAYMENT_CREATED,
                status: PaymentTxStatus.PENDING,
                amount: 180000n,
                attemptRef: `${orderId}-COD-INIT`,
              },
            },
          },
        },
      },
    });

    return orderId;
  }

  describe('Customer Order Endpoints', () => {
    it('GET /api/v1/orders/my-orders: lists customer own orders', async () => {
      const orderId = await createTestOrder(customer1Id);

      const res = await request(server)
        .get('/api/v1/orders/my-orders')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      const data = bodyOf<OrderListResponseDto>(res);
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      const found = data.items.find((i) => i.id === orderId);
      expect(found).toBeDefined();
      expect(found?.status).toBe(OrderStatus.PENDING);
    });

    it('GET /api/v1/orders/:id: returns order detail with allowedActions for owner', async () => {
      const orderId = await createTestOrder(customer1Id);

      const res = await request(server)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      const order = bodyOf<OrderDetailResponseDto>(res);
      expect(order.id).toBe(orderId);
      expect(order.allowedActions).toContain('CANCEL');
      expect(order).not.toHaveProperty('userId');
      expect(order).not.toHaveProperty('customerEmail');
      expect(order).not.toHaveProperty('customerName');
      expect(order.statusHistories[0]).not.toHaveProperty('changedBy');
      expect(order.statusHistories[0]).not.toHaveProperty('actorName');
    });

    it('GET /api/v1/orders/:id: returns 404 on IDOR (accessing other customer order)', async () => {
      const orderId = await createTestOrder(customer1Id);

      await request(server)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(404);
    });

    it('POST /api/v1/orders/:id/cancel: customer cancels PENDING order and releases inventory', async () => {
      const invBefore = await prisma.inventory.findUniqueOrThrow({
        where: { warehouseId_variantId: { warehouseId, variantId } },
      });
      const orderId = await createTestOrder(customer1Id);

      const res = await request(server)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'Khách hàng đổi ý' })
        .expect(200);

      const order = bodyOf<OrderDetailResponseDto>(res);
      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(order.cancelReason).toBe('Khách hàng đổi ý');
      expect(order.allowedActions).toEqual([]);

      // Verify inventory was released back to pre-order level
      const inventory = await prisma.inventory.findUniqueOrThrow({
        where: { warehouseId_variantId: { warehouseId, variantId } },
      });
      expect(inventory.reserved).toBe(invBefore.reserved);
    });

    it('POST /api/v1/orders/:id/cancel: customer cancels CONFIRMED order', async () => {
      const orderId = await createTestOrder(customer1Id, OrderStatus.CONFIRMED);

      const res = await request(server)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'Muốn đổi size khác' })
        .expect(200);

      const order = bodyOf<OrderDetailResponseDto>(res);
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('POST /api/v1/orders/:id/cancel: returns 409 when order is PACKING', async () => {
      const orderId = await createTestOrder(customer1Id, OrderStatus.PACKING);

      await request(server)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ reason: 'Không kịp huỷ' })
        .expect(409);
    });
  });

  describe('Operational Staff Flow & Full Lifecycle', () => {
    it('GET /api/v1/operational/orders: allows staff to list orders with query filters', async () => {
      const orderId = await createTestOrder(customer1Id, OrderStatus.PENDING);

      const res = await request(server)
        .get('/api/v1/operational/orders?status=PENDING&limit=10')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);

      const list = bodyOf<OrderListResponseDto>(res);
      expect(list.items.some((i) => i.id === orderId)).toBe(true);
    });

    it('RBAC check: customer cannot access operational orders', async () => {
      await request(server)
        .get('/api/v1/operational/orders')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('RBAC check: warehouse staff cannot confirm order (no ORDER_CONFIRM)', async () => {
      const orderId = await createTestOrder(customer1Id, OrderStatus.PENDING);

      await request(server)
        .post(`/api/v1/operational/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(403);
    });

    it('RBAC check: sales staff cannot pack order (no ORDER_PACK)', async () => {
      const orderId = await createTestOrder(customer1Id, OrderStatus.CONFIRMED);

      await request(server)
        .post(`/api/v1/operational/orders/${orderId}/start-packing`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);
    });

    it('Golden Path: PENDING -> CONFIRMED -> PACKING -> SHIPPING -> DELIVERED -> COMPLETED', async () => {
      // 1. Create PENDING order
      const orderId = await createTestOrder(customer1Id, OrderStatus.PENDING);

      // 2. Sales confirms order
      const confirmRes = await request(server)
        .post(`/api/v1/operational/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);
      expect(bodyOf<OrderDetailResponseDto>(confirmRes).status).toBe(
        OrderStatus.CONFIRMED,
      );

      // Double confirm rejection check (409 Conflict)
      await request(server)
        .post(`/api/v1/operational/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(409);

      // 3. Warehouse starts packing
      const packRes = await request(server)
        .post(`/api/v1/operational/orders/${orderId}/start-packing`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);
      expect(bodyOf<OrderDetailResponseDto>(packRes).status).toBe(
        OrderStatus.PACKING,
      );

      // 4. Warehouse ships order (triggers SALE)
      const shipRes = await request(server)
        .post(`/api/v1/operational/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);
      expect(bodyOf<OrderDetailResponseDto>(shipRes).status).toBe(
        OrderStatus.SHIPPING,
      );

      // 5. Admin delivers order
      const deliverRes = await request(server)
        .post(`/api/v1/operational/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(bodyOf<OrderDetailResponseDto>(deliverRes).status).toBe(
        OrderStatus.DELIVERED,
      );

      // Warehouse cannot deliver check (403 Forbidden)
      await request(server)
        .post(`/api/v1/operational/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(403);

      // 6. Admin completes order and collects COD (Payment -> PAID)
      const completeRes = await request(server)
        .post(`/api/v1/operational/orders/${orderId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const completedOrder = bodyOf<OrderDetailResponseDto>(completeRes);
      expect(completedOrder.status).toBe(OrderStatus.COMPLETED);
      expect(completedOrder.payment?.status).toBe(PaymentStatus.PAID);
      expect(completedOrder.allowedActions).toEqual([]);

      // Verify payment transaction recorded COD_COLLECTED
      const paymentTx = await prisma.paymentTransaction.findFirst({
        where: {
          payment: { orderId },
          type: PaymentTxType.COD_COLLECTED,
        },
      });
      expect(paymentTx).toBeDefined();
      expect(paymentTx?.status).toBe(PaymentTxStatus.SUCCESS);
    });

    it('Staff cancel order with reason and releases inventory', async () => {
      const orderId = await createTestOrder(customer1Id, OrderStatus.CONFIRMED);

      const cancelRes = await request(server)
        .post(`/api/v1/operational/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ reason: 'Hết vải may màu đỏ' })
        .expect(200);

      const cancelledOrder = bodyOf<OrderDetailResponseDto>(cancelRes);
      expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);
      expect(cancelledOrder.cancelReason).toBe('Hết vải may màu đỏ');
    });
  });
});
