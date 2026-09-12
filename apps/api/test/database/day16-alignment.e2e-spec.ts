import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PaymentMethod,
  PaymentTxStatus,
  PaymentTxType,
  PrismaClient,
  ShippingQuoteSource,
} from '../../src/generated/prisma/client';

const BUSINESS_TABLES = [
  'addresses',
  'audit_logs',
  'brands',
  'cart_items',
  'carts',
  'categories',
  'colors',
  'coupon_usages',
  'coupons',
  'inventories',
  'inventory_transactions',
  'order_counters',
  'order_items',
  'order_status_histories',
  'orders',
  'payment_transactions',
  'payments',
  'product_images',
  'product_variants',
  'products',
  'refresh_tokens',
  'reviews',
  'roles',
  'sizes',
  'users',
  'warehouses',
] as const;

type TableRow = { table_name: string };
type RequiredColumnRow = {
  table_name: string;
  column_name: string;
  is_nullable: string;
};
type CounterRow = { last_value: number };
type IndexRow = { indexname: string };

describe('Day 16 database alignment (e2e)', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Day 16 database tests');
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

  it('contains exactly the 26 frozen business tables', async () => {
    const tables = await prisma.$queryRaw<TableRow[]>`
      SELECT "table_name"
      FROM "information_schema"."tables"
      WHERE "table_schema" = current_schema()
        AND "table_type" = 'BASE TABLE'
        AND "table_name" <> '_prisma_migrations'
      ORDER BY "table_name"
    `;

    expect(tables.map(({ table_name }) => table_name)).toEqual(BUSINESS_TABLES);
  });

  it('requires canonical address and order snapshot codes', async () => {
    const columns = await prisma.$queryRaw<RequiredColumnRow[]>`
      SELECT "table_name", "column_name", "is_nullable"
      FROM "information_schema"."columns"
      WHERE "table_schema" = current_schema()
        AND (
          ("table_name" = 'addresses' AND "column_name" IN ('ward_code', 'province_code'))
          OR
          ("table_name" = 'orders' AND "column_name" IN ('shipping_ward_code', 'shipping_province_code'))
          OR
          ("table_name" = 'order_items' AND "column_name" = 'variant_id')
        )
      ORDER BY "table_name", "column_name"
    `;

    expect(columns).toHaveLength(5);
    expect(columns.every(({ is_nullable }) => is_nullable === 'NO')).toBe(true);
  });

  it('publishes the frozen tracking and payment idempotency indexes', async () => {
    const indexes = await prisma.$queryRaw<IndexRow[]>`
      SELECT "indexname"
      FROM "pg_indexes"
      WHERE "schemaname" = current_schema()
        AND "indexname" IN (
          'orders_shipping_provider_shipping_tracking_code_key',
          'payments_provider_transaction_id_key',
          'payment_transactions_attempt_ref_key',
          'payment_transactions_provider_transaction_id_key'
        )
      ORDER BY "indexname"
    `;

    expect(indexes.map(({ indexname }) => indexname)).toEqual([
      'orders_shipping_provider_shipping_tracking_code_key',
      'payment_transactions_attempt_ref_key',
      'payment_transactions_provider_transaction_id_key',
      'payments_provider_transaction_id_key',
    ]);
  });

  it('allocates one monotonic daily order counter under concurrency', async () => {
    const orderDate = new Date('2099-01-01T00:00:00.000Z');
    await prisma.orderCounter.deleteMany({ where: { orderDate } });

    try {
      const allocations = await Promise.all(
        Array.from(
          { length: 20 },
          () =>
            prisma.$queryRaw<CounterRow[]>`
            INSERT INTO "order_counters" ("order_date", "last_value")
            VALUES (${orderDate}, 1)
            ON CONFLICT ("order_date") DO UPDATE
            SET "last_value" = "order_counters"."last_value" + 1
            RETURNING "last_value"
          `,
        ),
      );
      const values = allocations
        .map(([row]) => row?.last_value)
        .sort((left, right) => (left ?? 0) - (right ?? 0));

      expect(values).toEqual(
        Array.from({ length: 20 }, (_, index) => index + 1),
      );
      await expect(
        prisma.orderCounter.update({
          where: { orderDate },
          data: { lastValue: -1 },
        }),
      ).rejects.toThrow();
    } finally {
      await prisma.orderCounter.deleteMany({ where: { orderDate } });
    }
  });

  it('enforces tracking and provider transaction idempotency keys', async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@mam-nho.local' },
    });
    const suffix = Date.now();
    const trackingCode = `TRACK-${suffix}`;
    const providerTransactionId = `PROVIDER-TX-${suffix}`;
    const attemptRef = `ATTEMPT-${suffix}`;

    await expect(
      prisma.$transaction(async (transaction) => {
        const firstOrder = await transaction.order.create({
          data: {
            orderNumber: `DAY16-A-${suffix}`,
            userId: customer.id,
            itemsSubtotal: 100_000n,
            totalAmount: 100_000n,
            paymentMethod: PaymentMethod.ONLINE,
            shippingProvider: 'TEST_PROVIDER',
            shippingTrackingCode: trackingCode,
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
        const secondOrder = await transaction.order.create({
          data: {
            orderNumber: `DAY16-B-${suffix}`,
            userId: customer.id,
            itemsSubtotal: 100_000n,
            totalAmount: 100_000n,
            paymentMethod: PaymentMethod.ONLINE,
            shippingProvider: 'ANOTHER_PROVIDER',
            shippingTrackingCode: `ANOTHER-${trackingCode}`,
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
        const firstPayment = await transaction.payment.create({
          data: {
            orderId: firstOrder.id,
            method: PaymentMethod.ONLINE,
            provider: 'TEST_PROVIDER',
            amount: firstOrder.totalAmount,
            providerTransactionId,
          },
        });

        await transaction.paymentTransaction.create({
          data: {
            paymentId: firstPayment.id,
            type: PaymentTxType.PAYMENT_ATTEMPT,
            status: PaymentTxStatus.PENDING,
            amount: firstPayment.amount,
            attemptRef,
          },
        });
        await transaction.payment.create({
          data: {
            orderId: secondOrder.id,
            method: PaymentMethod.ONLINE,
            provider: 'TEST_PROVIDER',
            amount: secondOrder.totalAmount,
            providerTransactionId,
          },
        });
      }),
    ).rejects.toThrow();

    await expect(
      prisma.$transaction(async (transaction) => {
        await transaction.order.create({
          data: {
            orderNumber: `DAY16-C-${suffix}`,
            userId: customer.id,
            itemsSubtotal: 100_000n,
            totalAmount: 100_000n,
            shippingProvider: 'TEST_PROVIDER',
            shippingTrackingCode: trackingCode,
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
        await transaction.order.create({
          data: {
            orderNumber: `DAY16-D-${suffix}`,
            userId: customer.id,
            itemsSubtotal: 100_000n,
            totalAmount: 100_000n,
            shippingProvider: 'TEST_PROVIDER',
            shippingTrackingCode: trackingCode,
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
      }),
    ).rejects.toThrow();
  });
});
