/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars */
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
import { createTestApplication } from './test-app.factory';

describe('Billing & Tax (VAT 8%) Integration (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let customerAToken: string;
  let customerBToken: string;
  let adminToken: string;

  let customerAId: string;
  let customerBId: string;
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

    const [customerRole, adminRole, category, size, color] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
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

    const accessTokens = app.get(AccessTokenService);

    // 1. Create Customer A
    customerAId = randomUUID();
    await prisma.user.create({
      data: {
        id: customerAId,
        email: `tax-cust-a-${suffix}@example.com`,
        passwordHash: 'dummyhash',
        fullName: 'Khách hàng A Thuế',
        roleId: customerRole.id,
        status: UserStatus.ACTIVE,
      },
    });

    // 2. Create Customer B (for anti-IDOR test)
    customerBId = randomUUID();
    await prisma.user.create({
      data: {
        id: customerBId,
        email: `tax-cust-b-${suffix}@example.com`,
        passwordHash: 'dummyhash',
        fullName: 'Khách hàng B Thuế',
        roleId: customerRole.id,
        status: UserStatus.ACTIVE,
      },
    });

    // 3. Create Admin
    adminId = randomUUID();
    await prisma.user.create({
      data: {
        id: adminId,
        email: `tax-admin-${suffix}@example.com`,
        passwordHash: 'dummyhash',
        fullName: 'Quản trị viên Thuế',
        roleId: adminRole.id,
        status: UserStatus.ACTIVE,
      },
    });

    [customerAToken, customerBToken, adminToken] = await Promise.all([
      accessTokens.sign(customerAId, 'CUSTOMER'),
      accessTokens.sign(customerBId, 'CUSTOMER'),
      accessTokens.sign(adminId, 'ADMIN'),
    ]);

    // 4. Create Address for Customer A
    addressId = randomUUID();
    await prisma.address.create({
      data: {
        id: addressId,
        userId: customerAId,
        receiverName: 'Khách hàng A Thuế',
        phone: '0901234567',
        addressLine: '123 Cầu Giấy',
        wardCode: '20101',
        wardName: 'Dịch Vọng',
        provinceCode: '01',
        provinceName: 'Hà Nội',
        isDefault: true,
      },
    });

    // 5. Create Product & Variant
    const productId = randomUUID();
    await prisma.product.create({
      data: {
        id: productId,
        name: `Áo Thun Thuế VAT ${suffix}`,
        slug: `ao-thun-thue-vat-${suffix}`,
        categoryId: category.id,
        status: ProductStatus.ACTIVE,
        images: {
          create: {
            url: `https://example.test/img-${suffix}.png`,
            altText: 'Áo Thun Thuế VAT',
            isPrimary: true,
          },
        },
      },
    });

    variantId = randomUUID();
    await prisma.productVariant.create({
      data: {
        id: variantId,
        productId,
        sku: `VAT-VAR-${suffix}`,
        price: 1080000n, // Exact 8% divisible: gross 1,080,000 -> net 1,000,000, vat 80,000
        sizeId: size.id,
        colorId: color.id,
        weightGrams: 300,
        lengthCm: 25,
        widthCm: 20,
        heightCm: 5,
        status: VariantStatus.ACTIVE,
      },
    });

    // 6. Seed stock in Main Warehouse
    const warehouse = await prisma.warehouse.findFirstOrThrow({
      where: { code: 'MAIN_WAREHOUSE' },
    });
    await prisma.inventory.create({
      data: {
        warehouseId: warehouse.id,
        variantId,
        onHand: 100,
        reserved: 0,
      },
    });
  });

  afterAll(async () => {
    if (testOrderId) {
      await prisma.invoice.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: testOrderId },
      });
      await prisma.paymentTransaction.deleteMany({
        where: { payment: { orderId: testOrderId } },
      });
      await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  it('1. Checkout creates order with tax snapshot and issues Invoice with invariant net + vat === gross', async () => {
    // Add item to cart
    await request(server)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ variantId, quantity: 1 })
      .expect(200);

    // Get shipping quote
    const quoteRes = await request(server)
      .post('/api/v1/shipping/quote')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ addressId })
      .expect(200);

    const quoteFingerprint = quoteRes.body.quoteFingerprint;
    expect(quoteFingerprint).toBeDefined();

    // Checkout COD
    const checkoutRes = await request(server)
      .post('/api/v1/checkout/orders')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        addressId,
        paymentMethod: 'COD',
        quoteFingerprint,
      })
      .expect(201);

    testOrderId = checkoutRes.body.id;
    testOrderNumber = checkoutRes.body.orderNumber;
    expect(testOrderId).toBeDefined();

    // Verify tax snapshot on order response
    expect(checkoutRes.body.taxRateBps).toBe(800);
    expect(checkoutRes.body.taxAmount).toBeDefined();
    expect(checkoutRes.body.netAmount).toBeDefined();

    const gross = BigInt(checkoutRes.body.totalAmount);
    const net = BigInt(checkoutRes.body.netAmount);
    const vat = BigInt(checkoutRes.body.taxAmount);
    expect(net + vat).toBe(gross);

    // Verify invoice was automatically created in database
    const dbInvoice = await prisma.invoice.findUnique({
      where: { orderId: testOrderId },
    });
    expect(dbInvoice).toBeDefined();
    expect(dbInvoice?.status).toBe('ISSUED');
    expect(dbInvoice?.invoiceNumber).toMatch(/^INV-\d{6}-\d{6}$/);
    expect(dbInvoice?.grossAmount).toBe(gross);
    expect(dbInvoice?.netAmount).toBe(net);
    expect(dbInvoice?.taxAmount).toBe(vat);
  });

  it('2. Customer can retrieve own invoice via GET /orders/:orderId/invoice', async () => {
    const res = await request(server)
      .get(`/api/v1/orders/${testOrderId}/invoice`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(200);

    expect(res.body.orderId).toBe(testOrderId);
    expect(res.body.invoiceNumber).toMatch(/^INV-\d{6}-\d{6}$/);
    expect(res.body.status).toBe('ISSUED');
    expect(res.body.taxRateBps).toBe(800);
    expect(res.body.taxRatePercent).toBe(8);
    expect(res.body.seller).toBeDefined();
    expect(res.body.seller.name).toBe('Cửa hàng Thời trang Trẻ em Jaykiby');
    expect(res.body.buyer).toBeDefined();
    expect(res.body.buyer.receiverName).toBe('Khách hàng A Thuế');
    expect(res.body.items).toHaveLength(1);

    const gross = BigInt(res.body.grossAmount);
    const net = BigInt(res.body.netAmount);
    const vat = BigInt(res.body.taxAmount);
    expect(net + vat).toBe(gross);
  });

  it('3. Anti-IDOR: Customer B receives 404 NOT_FOUND when accessing Customer A invoice', async () => {
    const res = await request(server)
      .get(`/api/v1/orders/${testOrderId}/invoice`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(404);

    expect(res.body.code).toBe('INVOICE_NOT_FOUND');
  });

  it('4. Unauthenticated request receives 401 UNAUTHORIZED', async () => {
    await request(server)
      .get(`/api/v1/orders/${testOrderId}/invoice`)
      .expect(401);
  });

  it('5. Admin can list and view invoices', async () => {
    // List invoices
    const listRes = await request(server)
      .get('/api/v1/admin/invoices?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body.items).toBeInstanceOf(Array);
    expect(listRes.body.total).toBeGreaterThanOrEqual(1);

    const target = listRes.body.items.find(
      (inv: any) => inv.orderId === testOrderId,
    );
    expect(target).toBeDefined();
    expect(target.status).toBe('ISSUED');

    // Get detail by invoice ID
    const detailRes = await request(server)
      .get(`/api/v1/admin/invoices/${target.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(detailRes.body.id).toBe(target.id);
    expect(detailRes.body.orderNumber).toBe(testOrderNumber);
  });

  it('6. Reporting tax endpoint returns tax aggregation', async () => {
    const res = await request(server)
      .get('/api/v1/reporting/tax?from=2026-01-01&to=2026-12-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.grossRevenue).toBeDefined();
    expect(res.body.netRevenue).toBeDefined();
    expect(res.body.vatAmount).toBeDefined();
    expect(res.body.completedOrders).toBeDefined();
    expect(res.body.metadata).toBeDefined();
  });

  it('7. Dashboard summary includes netRevenue and vatAmount', async () => {
    const res = await request(server)
      .get('/api/v1/reporting/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.grossRevenue).toBeDefined();
    expect(res.body.netRevenue).toBeDefined();
    expect(res.body.vatAmount).toBeDefined();
  });

  it('8. Cancelling order automatically voids the invoice (status VOID, voidedAt set)', async () => {
    // Customer cancels order
    await request(server)
      .post(`/api/v1/orders/${testOrderId}/cancel`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ reason: 'Đổi ý không muốn mua nữa' })
      .expect(200);

    // Verify invoice is now VOID
    const invoiceRes = await request(server)
      .get(`/api/v1/orders/${testOrderId}/invoice`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(200);

    expect(invoiceRes.body.status).toBe('VOID');
    expect(invoiceRes.body.voidedAt).toBeDefined();
    expect(invoiceRes.body.voidedAt).not.toBeNull();
  });
});
