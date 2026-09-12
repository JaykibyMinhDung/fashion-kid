import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EntityStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTxStatus,
  PaymentTxType,
  PrismaClient,
  ProductStatus,
  ShippingQuoteSource,
  VariantStatus,
} from '../../src/generated/prisma/client';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { PrismaInventoryRepository } from '../../src/modules/inventory/repositories/prisma-inventory.repository';
import { FallbackShippingProvider } from '../../src/modules/shipping/providers/fallback-shipping.provider';
import { ShippingService } from '../../src/modules/shipping/services/shipping.service';
import { ShippingQuoteTokenService } from '../../src/modules/shipping/services/shipping-quote-token.service';
import { PrismaAddressRepository } from '../../src/modules/users/repositories/prisma-address.repository';
import { AddressService } from '../../src/modules/users/address.service';
import { OrderCounterService } from '../../src/modules/checkout/services/order-counter.service';
import { CheckoutService } from '../../src/modules/checkout/services/checkout.service';
import { ConfigService } from '@nestjs/config';

describe('Checkout COD concurrency & invariants (database)', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for checkout database tests');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const prismaService = prisma as unknown as PrismaService;

  const configService = new ConfigService({
    SHIPPING_FALLBACK_FEE: '30000',
    SHIPPING_QUOTE_TTL_SECONDS: 300,
    JWT_ACCESS_SECRET: 'database-test-secret-with-at-least-32-random-bytes',
  });

  const addressRepo = new PrismaAddressRepository(prismaService);
  const addressService = new AddressService(addressRepo);
  const fallbackShippingProvider = new FallbackShippingProvider(configService);
  const quoteTokenService = new ShippingQuoteTokenService(configService);
  const shippingService = new ShippingService(
    addressService,
    fallbackShippingProvider,
    prismaService,
    quoteTokenService,
  );
  const inventoryRepo = new PrismaInventoryRepository();
  const orderCounterService = new OrderCounterService();

  const checkoutService = new CheckoutService(
    prismaService,
    orderCounterService,
    shippingService,
    inventoryRepo,
  );

  let customerRoleId: string;
  let testWarehouseId: string;
  let testCategoryId: string;
  let testSizeId: string;
  let testColorId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: 'CUSTOMER' },
    });
    customerRoleId = role.id;

    // Ensure MAIN_WAREHOUSE exists and is ACTIVE
    const wh = await prisma.warehouse.upsert({
      where: { code: 'MAIN_WAREHOUSE' },
      update: { status: EntityStatus.ACTIVE },
      create: {
        code: 'MAIN_WAREHOUSE',
        name: 'Kho Tổng Hàng Mầm Nhỏ',
        status: EntityStatus.ACTIVE,
      },
    });
    testWarehouseId = wh.id;

    const category = await prisma.category.create({
      data: {
        name: `Test Cat ${randomUUID()}`,
        slug: `test-cat-${randomUUID()}`,
        status: EntityStatus.ACTIVE,
      },
    });
    testCategoryId = category.id;

    const size = await prisma.size.create({
      data: {
        code: `SZ-${randomUUID().slice(0, 8)}`,
        name: 'Size M',
        status: EntityStatus.ACTIVE,
      },
    });
    testSizeId = size.id;

    const color = await prisma.color.create({
      data: {
        code: `CL-${randomUUID().slice(0, 8)}`,
        name: 'Màu Đỏ',
        status: EntityStatus.ACTIVE,
      },
    });
    testColorId = color.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createTestCustomer(suffix: string) {
    const user = await prisma.user.create({
      data: {
        roleId: customerRoleId,
        email: `customer-${suffix.toLowerCase()}-${randomUUID()}@mam-nho.local`,
        passwordHash: 'dummy-hash',
        fullName: `Khách Hàng ${suffix}`,
        status: 'ACTIVE',
      },
    });

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        receiverName: `Người Nhận ${suffix}`,
        phone: '+84901234567',
        addressLine: '123 Đường Số 1',
        wardCode: '00001',
        wardName: 'Phường Hàng Trống',
        provinceCode: '01',
        provinceName: 'Hà Nội',
        isDefault: true,
      },
    });

    const cart = await prisma.cart.create({
      data: {
        userId: user.id,
      },
    });

    return { user, address, cart };
  }

  async function createTestVariant(suffix: string, price = 150_000n) {
    const product = await prisma.product.create({
      data: {
        name: `Sản Phẩm Test ${suffix}`,
        slug: `san-pham-test-${suffix}-${randomUUID()}`,
        categoryId: testCategoryId,
        status: ProductStatus.ACTIVE,
        images: {
          create: {
            url: 'https://example.com/img.jpg',
            sortOrder: 0,
            isPrimary: true,
          },
        },
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sizeId: testSizeId,
        colorId: testColorId,
        sku: `SKU-${suffix}-${randomUUID().slice(0, 8)}`,
        price,
        weightGrams: 200,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 5,
        status: VariantStatus.ACTIVE,
      },
    });

    return variant;
  }

  async function getQuoteFingerprint(userId: string, addressId: string) {
    const quote = await shippingService.calculateQuoteForUserAddress(
      userId,
      addressId,
    );
    return quote.quoteFingerprint;
  }

  it('Happy path: creates order, reserves inventory, creates payment, and clears cart atomically', async () => {
    const { user, address, cart } = await createTestCustomer('Happy');
    const variant = await createTestVariant('HappyVar', 150_000n);

    // Initial inventory: onHand = 10, reserved = 0
    const inventory = await prisma.inventory.create({
      data: {
        warehouseId: testWarehouseId,
        variantId: variant.id,
        onHand: 10,
        reserved: 0,
      },
    });

    // Add 2 items to cart
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: variant.id,
        quantity: 2,
      },
    });

    // Execute checkout
    const quoteFingerprint = await getQuoteFingerprint(user.id, address.id);
    const result = await checkoutService.checkoutCod(user.id, {
      addressId: address.id,
      paymentMethod: 'COD',
      quoteFingerprint,
      customerNote: 'Giao trong giờ hành chính',
    });

    // Assert API Response
    expect(result.id).toBeDefined();
    expect(result.orderNumber).toMatch(/^ORD-\d{8}-\d{6}$/);
    expect(result.status).toBe(OrderStatus.PENDING);
    expect(result.currency).toBe('VND');
    expect(result.itemsSubtotal).toBe('300000');
    expect(result.shippingFee).toBe('30000');
    expect(result.discountAmount).toBe('0');
    expect(result.totalAmount).toBe('330000');
    expect(result.customerNote).toBe('Giao trong giờ hành chính');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].sku).toBe(variant.sku);
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[0].unitPrice).toBe('150000');
    expect(result.items[0].lineTotal).toBe('300000');
    expect(result.payment.amount).toBe('330000');
    expect(result.payment.method).toBe('COD');
    expect(result.payment.status).toBe('PENDING');
    expect(result.shipping.receiverName).toBe(address.receiverName);
    expect(result.shipping.shippingFee).toBe('30000');
    expect(result.shipping.shippingQuoteSource).toBe(
      ShippingQuoteSource.FALLBACK,
    );

    // Assert Database Invariants
    const dbOrder = await prisma.order.findUniqueOrThrow({
      where: { id: result.id },
      include: {
        items: true,
        payment: { include: { transactions: true } },
        statusHistories: true,
      },
    });

    expect(dbOrder.status).toBe(OrderStatus.PENDING);
    expect(dbOrder.itemsSubtotal).toBe(300_000n);
    expect(dbOrder.shippingFee).toBe(30_000n);
    expect(dbOrder.totalAmount).toBe(330_000n);
    expect(dbOrder.receiverName).toBe(address.receiverName);
    expect(dbOrder.receiverPhone).toBe(address.phone);
    expect(dbOrder.shippingAddressLine).toBe(address.addressLine);

    // Inventory invariants: reserved += 2, onHand unchanged
    const dbInventory = await prisma.inventory.findUniqueOrThrow({
      where: { id: inventory.id },
    });
    expect(dbInventory.reserved).toBe(2);
    expect(dbInventory.onHand).toBe(10);

    // InventoryTransaction RESERVE ledger written
    const dbTx = await prisma.inventoryTransaction.findFirstOrThrow({
      where: {
        inventoryId: inventory.id,
        referenceType: 'ORDER',
        referenceId: result.id,
      },
    });
    expect(dbTx.type).toBe('RESERVE');
    expect(dbTx.quantity).toBe(2);
    expect(dbTx.reservedBefore).toBe(0);
    expect(dbTx.reservedAfter).toBe(2);

    // Payment and PaymentTransaction
    expect(dbOrder.payment?.method).toBe(PaymentMethod.COD);
    expect(dbOrder.payment?.status).toBe(PaymentStatus.PENDING);
    expect(dbOrder.payment?.amount).toBe(330_000n);
    expect(dbOrder.payment?.transactions).toHaveLength(1);
    expect(dbOrder.payment?.transactions[0].type).toBe(
      PaymentTxType.PAYMENT_CREATED,
    );
    expect(dbOrder.payment?.transactions[0].status).toBe(
      PaymentTxStatus.PENDING,
    );

    // OrderStatusHistory
    expect(dbOrder.statusHistories).toHaveLength(1);
    expect(dbOrder.statusHistories[0].fromStatus).toBeNull();
    expect(dbOrder.statusHistories[0].toStatus).toBe(OrderStatus.PENDING);

    // Cart items cleared
    const remainingCartItems = await prisma.cartItem.count({
      where: { cartId: cart.id },
    });
    expect(remainingCartItems).toBe(0);
  });

  it('Security IDOR: rejects checkout with an address belonging to another user (404)', async () => {
    const userA = await createTestCustomer('UserA');
    const userB = await createTestCustomer('UserB');
    const variant = await createTestVariant('IDORVar', 100_000n);

    await prisma.inventory.create({
      data: {
        warehouseId: testWarehouseId,
        variantId: variant.id,
        onHand: 10,
        reserved: 0,
      },
    });

    await prisma.cartItem.create({
      data: {
        cartId: userA.cart.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    // userA tries to use userB's address
    await expect(
      checkoutService.checkoutCod(userA.user.id, {
        addressId: userB.address.id,
        paymentMethod: 'COD',
        quoteFingerprint: 'untrusted-placeholder',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('Concurrency: two concurrent checkouts on the same Cart result in exactly one Order', async () => {
    const { user, address, cart } = await createTestCustomer('DoubleCheckout');
    const variant = await createTestVariant('DoubleVar', 200_000n);

    await prisma.inventory.create({
      data: {
        warehouseId: testWarehouseId,
        variantId: variant.id,
        onHand: 20,
        reserved: 0,
      },
    });

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    // Run 2 checkouts simultaneously for the same cart
    const quoteFingerprint = await getQuoteFingerprint(user.id, address.id);
    const runCheckout = () =>
      checkoutService
        .checkoutCod(user.id, {
          addressId: address.id,
          paymentMethod: 'COD',
          quoteFingerprint,
        })
        .then(() => true)
        .catch((err) => {
          if (err instanceof UnprocessableEntityException) {
            return false;
          }
          throw err;
        });

    const results = await Promise.all([runCheckout(), runCheckout()]);

    // Exactly one must succeed, one must fail with cart empty
    expect(results.filter(Boolean)).toHaveLength(1);

    const userOrders = await prisma.order.findMany({
      where: { userId: user.id },
    });
    expect(userOrders).toHaveLength(1);
  });

  it('Concurrency: two customers racing for the last SKU (onHand=1) -> 1 success, 1 stock conflict', async () => {
    const user1 = await createTestCustomer('RaceCust1');
    const user2 = await createTestCustomer('RaceCust2');
    const variant = await createTestVariant('LastSkuVar', 100_000n);

    // Exactly 1 in stock!
    await prisma.inventory.create({
      data: {
        warehouseId: testWarehouseId,
        variantId: variant.id,
        onHand: 1,
        reserved: 0,
      },
    });

    // Both put 1 in their cart
    await prisma.cartItem.create({
      data: {
        cartId: user1.cart.id,
        variantId: variant.id,
        quantity: 1,
      },
    });
    await prisma.cartItem.create({
      data: {
        cartId: user2.cart.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    // Race to checkout
    const quote1 = await getQuoteFingerprint(user1.user.id, user1.address.id);
    const quote2 = await getQuoteFingerprint(user2.user.id, user2.address.id);
    const checkoutUser = (
      userId: string,
      addressId: string,
      quoteFingerprint: string,
    ) =>
      checkoutService
        .checkoutCod(userId, {
          addressId,
          paymentMethod: 'COD',
          quoteFingerprint,
        })
        .then(() => 'SUCCESS')
        .catch((err) => {
          if (err instanceof ConflictException) {
            return 'STOCK_CONFLICT';
          }
          throw err;
        });

    const outcomes = await Promise.all([
      checkoutUser(user1.user.id, user1.address.id, quote1),
      checkoutUser(user2.user.id, user2.address.id, quote2),
    ]);

    expect(outcomes.sort()).toEqual(['STOCK_CONFLICT', 'SUCCESS']);

    // Check inventory reserved is 1 (never exceeded onHand)
    const inv = await prisma.inventory.findFirstOrThrow({
      where: {
        warehouseId: testWarehouseId,
        variantId: variant.id,
      },
    });
    expect(inv.reserved).toBe(1);
    expect(inv.onHand).toBe(1);
  });
});
