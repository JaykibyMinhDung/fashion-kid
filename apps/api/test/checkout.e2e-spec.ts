import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../src/common/security/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import {
  EntityStatus,
  ProductStatus,
  UserStatus,
  VariantStatus,
} from '../src/generated/prisma/client';
import { CartResponseDto } from '../src/modules/cart/dto/cart.dto';
import { CheckoutOrderResponseDto } from '../src/modules/checkout/dto/checkout.dto';
import { createTestApplication } from './test-app.factory';

function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Checkout and Shipping API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let customerToken: string;
  let warehouseStaffToken: string;
  let customerId: string;
  let addressId: string;
  let otherAddressId: string;
  let variantId: string;
  let warehouseId: string;
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    app = await createTestApplication();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);

    const [customerRole, warehouseRole, category, size, color, wh] =
      await Promise.all([
        prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
        prisma.role.findUniqueOrThrow({ where: { code: 'WAREHOUSE_STAFF' } }),
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

    // Create 2 customers
    const customer = await prisma.user.create({
      data: {
        roleId: customerRole.id,
        email: `chk-cust-${suffix}@mam-nho.local`,
        passwordHash: 'e2e-hash',
        fullName: 'Checkout Main Customer',
        status: UserStatus.ACTIVE,
      },
    });
    customerId = customer.id;

    const otherCustomer = await prisma.user.create({
      data: {
        roleId: customerRole.id,
        email: `chk-other-${suffix}@mam-nho.local`,
        passwordHash: 'e2e-hash',
        fullName: 'Checkout Other Customer',
        status: UserStatus.ACTIVE,
      },
    });

    const warehouseStaff = await prisma.user.create({
      data: {
        roleId: warehouseRole.id,
        email: `chk-wh-${suffix}@mam-nho.local`,
        passwordHash: 'e2e-hash',
        fullName: 'Checkout Warehouse Staff',
        status: UserStatus.ACTIVE,
      },
    });

    const accessTokens = app.get(AccessTokenService);
    [customerToken, warehouseStaffToken] = await Promise.all([
      accessTokens.sign(customer.id, 'CUSTOMER'),
      accessTokens.sign(warehouseStaff.id, 'WAREHOUSE_STAFF'),
    ]);

    // Create addresses for both
    const addr1 = await prisma.address.create({
      data: {
        userId: customer.id,
        receiverName: 'Khách Hàng Chính',
        phone: '+84912345678',
        addressLine: '100 Hai Ba Trung',
        wardCode: '00001',
        wardName: 'Phường Hàng Trống',
        provinceCode: '01',
        provinceName: 'Hà Nội',
        isDefault: true,
      },
    });
    addressId = addr1.id;

    const addr2 = await prisma.address.create({
      data: {
        userId: otherCustomer.id,
        receiverName: 'Khách Hàng Phụ',
        phone: '+84987654321',
        addressLine: '200 Tran Hung Dao',
        wardCode: '00002',
        wardName: 'Phường Cửa Nam',
        provinceCode: '01',
        provinceName: 'Hà Nội',
        isDefault: true,
      },
    });
    otherAddressId = addr2.id;

    // Create product & variant
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Checkout Product ${suffix}`,
        slug: `checkout-product-${suffix}`,
        status: ProductStatus.ACTIVE,
        images: {
          create: {
            url: `https://example.test/img-${suffix}.png`,
            altText: 'Checkout Product',
            isPrimary: true,
          },
        },
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sizeId: size.id,
        colorId: color.id,
        sku: `CHK-SKU-${suffix}`,
        price: 200_000n,
        weightGrams: 300,
        lengthCm: 25,
        widthCm: 20,
        heightCm: 5,
        status: VariantStatus.ACTIVE,
      },
    });
    variantId = variant.id;

    // Add inventory
    await prisma.inventory.create({
      data: {
        warehouseId,
        variantId,
        onHand: 50,
        reserved: 0,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/shipping/quote', () => {
    it('returns 401 when request has no auth token', async () => {
      await request(server)
        .post('/api/v1/shipping/quote')
        .send({ addressId })
        .expect(401);
    });

    it('returns 400 for invalid body schema', async () => {
      await request(server)
        .post('/api/v1/shipping/quote')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId: 'not-a-uuid' })
        .expect(400);
    });

    it('returns 404 when querying an address owned by another user', async () => {
      await request(server)
        .post('/api/v1/shipping/quote')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId: otherAddressId })
        .expect(404);
    });

    it('returns 200 with quote details when valid owned address is provided', async () => {
      const cart = await prisma.cart.upsert({
        where: { userId: customerId },
        update: {},
        create: { userId: customerId },
      });
      await prisma.cartItem.create({
        data: { cartId: cart.id, variantId, quantity: 1 },
      });
      const response = await request(server)
        .post('/api/v1/shipping/quote')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId })
        .expect(200);

      const body = bodyOf<{
        fee: string;
        source: string;
        serviceName: string;
        quoteFingerprint: string;
        expiresAt: string;
      }>(response);
      expect(body.fee).toBe('30000');
      expect(body.source).toBe('FALLBACK');
      expect(body.serviceName).toBe('Giao hàng tiêu chuẩn');
      expect(body.quoteFingerprint).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    });
  });

  describe('POST /api/v1/checkout/orders', () => {
    it('returns 401 when request has no auth token', async () => {
      await request(server)
        .post('/api/v1/checkout/orders')
        .send({
          addressId,
          paymentMethod: 'COD',
          quoteFingerprint: 'untrusted-placeholder',
        })
        .expect(401);
    });

    it('returns 403 when caller lacks ORDER_CREATE permission', async () => {
      await request(server)
        .post('/api/v1/checkout/orders')
        .set('Authorization', `Bearer ${warehouseStaffToken}`)
        .send({ addressId, paymentMethod: 'COD' })
        .expect(403);
    });

    it('returns 400 when paymentMethod is not COD', async () => {
      await request(server)
        .post('/api/v1/checkout/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId, paymentMethod: 'ONLINE_VNPAY' })
        .expect(400);
    });

    it('returns 422 when cart is empty', async () => {
      await request(server)
        .post('/api/v1/checkout/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          addressId,
          paymentMethod: 'COD',
          quoteFingerprint: 'untrusted-placeholder',
        })
        .expect(422);
    });

    it('rejects request with forged price/status properties (400)', async () => {
      await request(server)
        .post('/api/v1/checkout/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          addressId,
          paymentMethod: 'COD',
          totalAmount: '1000',
          shippingFee: '0',
          status: 'DELIVERED',
        })
        .expect(400);
    });

    it('returns SHIPPING_QUOTE_STALE when the cart changes after quoting', async () => {
      const added = bodyOf<CartResponseDto>(
        await request(server)
          .post('/api/v1/cart/items')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ variantId, quantity: 1 })
          .expect(200),
      );
      const quote = bodyOf<{ quoteFingerprint: string }>(
        await request(server)
          .post('/api/v1/shipping/quote')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ addressId })
          .expect(200),
      );

      await request(server)
        .patch(`/api/v1/cart/items/${added.items[0].cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 2 })
        .expect(200);

      const response = await request(server)
        .post('/api/v1/checkout/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          addressId,
          paymentMethod: 'COD',
          quoteFingerprint: quote.quoteFingerprint,
        })
        .expect(409);
      expect(response.body).toEqual(
        expect.objectContaining({ code: 'SHIPPING_QUOTE_STALE' }),
      );

      await request(server)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
    });

    it('happy path: successfully checks out COD order with price recalculation and clears cart', async () => {
      // 1. Add item to cart via Cart API
      await request(server)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId, quantity: 2 })
        .expect(200);

      // Verify cart has 1 item
      const cartCheck = bodyOf<CartResponseDto>(
        await request(server)
          .get('/api/v1/cart')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200),
      );
      expect(cartCheck.items).toHaveLength(1);

      const quote = bodyOf<{ quoteFingerprint: string }>(
        await request(server)
          .post('/api/v1/shipping/quote')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ addressId })
          .expect(200),
      );

      // 2. Submit checkout COD
      const checkoutRes = await request(server)
        .post('/api/v1/checkout/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          addressId,
          paymentMethod: 'COD',
          quoteFingerprint: quote.quoteFingerprint,
          customerNote: 'Xin gói hàng cẩn thận',
        })
        .expect(201);

      const order = bodyOf<CheckoutOrderResponseDto>(checkoutRes);
      expect(order.orderNumber).toMatch(/^ORD-\d{8}-\d{6}$/);
      expect(order.status).toBe('PENDING');
      expect(order.itemsSubtotal).toBe('400000'); // 200,000 * 2
      expect(order.shippingFee).toBe('30000');
      expect(order.totalAmount).toBe('430000');
      expect(order.customerNote).toBe('Xin gói hàng cẩn thận');
      expect(order.payment.method).toBe('COD');
      expect(order.payment.status).toBe('PENDING');
      expect(order.payment.amount).toBe('430000');
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(2);
      expect(order.items[0].unitPrice).toBe('200000');
      expect(order.items[0].lineTotal).toBe('400000');

      // 3. Verify cart is now completely empty
      const afterCart = bodyOf<CartResponseDto>(
        await request(server)
          .get('/api/v1/cart')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200),
      );
      expect(afterCart.items).toHaveLength(0);
      expect(afterCart.itemCount).toBe(0);
      expect(afterCart.subtotal).toBe('0');
    });
  });
});
