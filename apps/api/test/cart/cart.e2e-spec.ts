import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../../src/common/security/access-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import {
  ProductStatus,
  UserStatus,
  VariantStatus,
} from '../../src/generated/prisma/client';
import { createTestApplication } from '../test-app.factory';

function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Cart API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let customerToken: string;
  let otherCustomerToken: string;
  let variantId: string;
  let inventoryId: string;
  let cartId: string;
  let cartItemId: string | undefined;
  let productId: string;
  let otherCustomerId: string;
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);

    const [customer, role, category, brand, size, color, warehouse] =
      await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { email: 'customer@mam-nho.local' },
        }),
        prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
        prisma.category.findUniqueOrThrow({ where: { slug: 'be-trai' } }),
        prisma.brand.findUniqueOrThrow({ where: { slug: 'mam-nho' } }),
        prisma.size.findUniqueOrThrow({ where: { code: '90' } }),
        prisma.color.findUniqueOrThrow({ where: { code: 'CORAL' } }),
        prisma.warehouse.findUniqueOrThrow({
          where: { code: 'MAIN_WAREHOUSE' },
        }),
      ]);

    const otherCustomer = await prisma.user.create({
      data: {
        roleId: role.id,
        email: `cart-other-${suffix}@mam-nho.local`,
        passwordHash: 'e2e-only',
        fullName: 'Cart Other Customer',
        status: UserStatus.ACTIVE,
      },
    });
    otherCustomerId = otherCustomer.id;

    const accessTokens = app.get(AccessTokenService);
    [customerToken, otherCustomerToken] = await Promise.all([
      accessTokens.sign(customer.id, 'CUSTOMER'),
      accessTokens.sign(otherCustomer.id, 'CUSTOMER'),
    ]);

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        brandId: brand.id,
        name: `Cart E2E ${suffix}`,
        slug: `cart-e2e-${suffix}`,
        status: ProductStatus.ACTIVE,
        images: {
          create: {
            url: `https://example.test/cart-${suffix}.png`,
            altText: 'Cart E2E',
            isPrimary: true,
          },
        },
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sizeId: size.id,
        colorId: color.id,
        sku: `CART-E2E-${suffix}`,
        price: 125_000n,
        weightGrams: 250,
        lengthCm: 20,
        widthCm: 18,
        heightCm: 5,
        status: VariantStatus.ACTIVE,
      },
    });
    variantId = variant.id;

    const inventory = await prisma.inventory.create({
      data: { warehouseId: warehouse.id, variantId, onHand: 20 },
    });
    inventoryId = inventory.id;

    const cart = await prisma.cart.upsert({
      where: { userId: customer.id },
      update: {},
      create: { userId: customer.id },
      select: { id: true },
    });
    cartId = cart.id;
    await prisma.cartItem.deleteMany({ where: { cartId } });
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cartItem.deleteMany({
      where: { cart: { userId: otherCustomerId } },
    });
    await prisma.cart.deleteMany({ where: { userId: otherCustomerId } });
    await prisma.inventoryTransaction.deleteMany({ where: { inventoryId } });
    await prisma.inventory.delete({ where: { id: inventoryId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.productImage.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.refreshToken.deleteMany({
      where: { userId: otherCustomerId },
    });
    await prisma.user.delete({ where: { id: otherCustomerId } });
    await app.close();
  });

  it('requires authentication and lazy-creates one owned cart', async () => {
    await request(server).get('/api/v1/cart').expect(401);

    const response = await request(server)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(bodyOf<{ items: unknown[]; itemCount: number }>(response)).toEqual(
      expect.objectContaining({ items: [], itemCount: 0 }),
    );
    await expect(prisma.cart.count({ where: { id: cartId } })).resolves.toBe(1);

    const concurrentGets = await Promise.all([
      request(server)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${otherCustomerToken}`),
      request(server)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${otherCustomerToken}`),
    ]);
    expect(concurrentGets.map((item) => item.status)).toEqual([200, 200]);
    await expect(
      prisma.cart.count({ where: { userId: otherCustomerId } }),
    ).resolves.toBe(1);
  });

  it('atomically re-adds the same variant and keeps inventory unchanged', async () => {
    await request(server)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variantId, quantity: 1 })
      .expect(200);
    const second = await request(server)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variantId, quantity: 2 })
      .expect(200);
    const secondBody = bodyOf<{
      items: Array<{ cartItemId: string; quantity: number }>;
      subtotal: string;
    }>(second);
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0]).toEqual(
      expect.objectContaining({ quantity: 3 }),
    );
    expect(secondBody.subtotal).toBe('375000');
    cartItemId = secondBody.items[0]?.cartItemId;

    const before = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    const outcomes = await Promise.all([
      request(server)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId, quantity: 1 }),
      request(server)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId, quantity: 2 }),
    ]);
    expect(outcomes.map((response) => response.status)).toEqual([200, 200]);
    const afterCart = await request(server)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(
      bodyOf<{ items: Array<{ quantity: number }> }>(afterCart).items[0],
    ).toEqual(expect.objectContaining({ quantity: 6 }));
    const after = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(after.onHand).toBe(before.onHand);
    expect(after.reserved).toBe(before.reserved);

    const updated = await request(server)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quantity: 5 })
      .expect(200);
    expect(
      bodyOf<{ items: Array<{ quantity: number }> }>(updated).items[0],
    ).toEqual(expect.objectContaining({ quantity: 5 }));
    const removed = await request(server)
      .delete(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(bodyOf<{ items: unknown[] }>(removed).items).toHaveLength(0);
    const restored = await request(server)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variantId, quantity: 6 })
      .expect(200);
    cartItemId = bodyOf<{ items: Array<{ cartItemId: string }> }>(restored)
      .items[0]?.cartItemId;
  });

  it('blocks invalid quantity and cross-user CartItem access', async () => {
    const zeroQuantity = await request(server)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quantity: 0 })
      .expect(400);
    expect(bodyOf<{ code: string }>(zeroQuantity).code).toBe(
      'CART_QUANTITY_INVALID',
    );
    await request(server)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quantity: '2' })
      .expect(400);
    const overLimit = await request(server)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quantity: 100 })
      .expect(400);
    expect(bodyOf<{ code: string }>(overLimit).code).toBe(
      'CART_QUANTITY_LIMIT_EXCEEDED',
    );

    await request(server)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ quantity: 2 })
      .expect(404);
    await request(server)
      .delete(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(404);
  });

  it('returns current price and warnings without deleting invalid items', async () => {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { price: 150_000n },
    });
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { onHand: 0 },
    });

    const response = await request(server)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const cart = bodyOf<{
      items: Array<{
        quantity: number;
        currentUnitPrice: string;
        warning: string | null;
        availability: string;
        isPurchasable: boolean;
      }>;
      subtotal: string;
      isCheckoutReady: boolean;
    }>(response);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toEqual(
      expect.objectContaining({
        quantity: 6,
        currentUnitPrice: '150000',
        warning: 'OUT_OF_STOCK',
        availability: 'OUT_OF_STOCK',
        isPurchasable: false,
      }),
    );
    expect(cart.subtotal).toBe('900000');
    expect(cart.isCheckoutReady).toBe(false);
  });

  it('clears items but preserves the persistent Cart row', async () => {
    const before = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    const response = await request(server)
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(bodyOf<{ items: unknown[]; itemCount: number }>(response)).toEqual(
      expect.objectContaining({ items: [], itemCount: 0 }),
    );
    await expect(
      prisma.cart.findUnique({ where: { id: cartId } }),
    ).resolves.toEqual(expect.objectContaining({ id: cartId }));
    const after = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    expect(after.onHand).toBe(before.onHand);
    expect(after.reserved).toBe(before.reserved);
  });
});
