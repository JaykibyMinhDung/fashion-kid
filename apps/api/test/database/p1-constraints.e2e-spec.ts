import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CouponType,
  PrismaClient,
  ShippingQuoteSource,
} from '../../src/generated/prisma/client';

describe('P1 database constraints (e2e)', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for P1 database tests');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects percentage coupons above 100', async () => {
    await expect(
      prisma.coupon.create({
        data: {
          code: `INVALID-PERCENT-${Date.now()}`,
          name: 'Invalid percentage',
          type: CouponType.PERCENTAGE,
          value: 101n,
          startsAt: new Date('2026-09-01T00:00:00.000Z'),
          endsAt: new Date('2026-09-02T00:00:00.000Z'),
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects an invalid coupon active window and usage limit', async () => {
    await expect(
      prisma.coupon.create({
        data: {
          code: `INVALID-WINDOW-${Date.now()}`,
          name: 'Invalid window',
          type: CouponType.FIXED_AMOUNT,
          value: 10_000n,
          usageLimit: 0,
          startsAt: new Date('2026-09-02T00:00:00.000Z'),
          endsAt: new Date('2026-09-01T00:00:00.000Z'),
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects review ratings outside 1 to 5', async () => {
    const [customer, variant] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { email: 'customer@mam-nho.local' },
      }),
      prisma.productVariant.findFirstOrThrow(),
    ]);

    await expect(
      prisma.$transaction(async (transaction) => {
        const order = await transaction.order.create({
          data: {
            orderNumber: `P1-REVIEW-${Date.now()}`,
            userId: customer.id,
            itemsSubtotal: variant.price,
            totalAmount: variant.price,
            shippingQuoteSource: ShippingQuoteSource.FALLBACK,
            receiverName: customer.fullName,
            receiverPhone: '0900000000',
            shippingAddressLine: '1 Đường Demo',
            shippingWardCode: '00001',
            shippingWardName: 'Phường Demo',
            shippingProvinceCode: '01',
            shippingProvinceName: 'Hà Nội',
          },
        });
        const orderItem = await transaction.orderItem.create({
          data: {
            orderId: order.id,
            variantId: variant.id,
            productName: 'Snapshot product',
            sku: variant.sku,
            colorName: 'Snapshot color',
            sizeName: 'Snapshot size',
            unitPrice: variant.price,
            quantity: 1,
            lineTotal: variant.price,
          },
        });

        await transaction.review.create({
          data: {
            userId: customer.id,
            productId: variant.productId,
            orderItemId: orderItem.id,
            rating: 6,
          },
        });
      }),
    ).rejects.toThrow();
  });

  it('rejects a negative coupon-usage discount', async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@mam-nho.local' },
    });

    await expect(
      prisma.$transaction(async (transaction) => {
        const coupon = await transaction.coupon.create({
          data: {
            code: `P1-USAGE-${Date.now()}`,
            name: 'Usage test',
            type: CouponType.FIXED_AMOUNT,
            value: 10_000n,
            startsAt: new Date('2026-09-01T00:00:00.000Z'),
            endsAt: new Date('2026-09-02T00:00:00.000Z'),
          },
        });
        const order = await transaction.order.create({
          data: {
            orderNumber: `P1-COUPON-${Date.now()}`,
            userId: customer.id,
            itemsSubtotal: 100_000n,
            totalAmount: 100_000n,
            shippingQuoteSource: ShippingQuoteSource.FALLBACK,
            receiverName: customer.fullName,
            receiverPhone: '0900000000',
            shippingAddressLine: '1 Đường Demo',
            shippingWardCode: '00001',
            shippingWardName: 'Phường Demo',
            shippingProvinceCode: '01',
            shippingProvinceName: 'Hà Nội',
          },
        });

        await transaction.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId: customer.id,
            orderId: order.id,
            couponCodeSnapshot: coupon.code,
            discountAmount: -1n,
          },
        });
      }),
    ).rejects.toThrow();
  });
});
