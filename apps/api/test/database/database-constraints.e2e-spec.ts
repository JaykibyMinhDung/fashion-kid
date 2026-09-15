import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  ShippingQuoteSource,
} from '../../src/generated/prisma/client';
import { verifyPassword } from '../../src/common/security/password-hasher';

describe('Database constraints (e2e)', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for database constraint tests');
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

  it('keeps the idempotent seed business-key counts stable', async () => {
    const [roles, users, products, variants, inventories, ledgerEntries] =
      await Promise.all([
        prisma.role.count(),
        prisma.user.count({
          where: {
            email: {
              in: [
                'customer@mam-nho.local',
                'disabled-customer@mam-nho.local',
                'sales@mam-nho.local',
                'warehouse@mam-nho.local',
                'admin@mam-nho.local',
              ],
            },
          },
        }),
        prisma.product.count({
          where: {
            slug: {
              in: [
                'set-ao-khoac-coral',
                'set-so-mi-sage',
                'romper-muslin-apricot',
              ],
            },
          },
        }),
        prisma.productVariant.count({
          where: {
            sku: { in: ['MAM-CORAL-90', 'MAM-SAGE-100', 'MAM-APRICOT-70'] },
          },
        }),
        prisma.inventory.count({
          where: {
            variant: {
              sku: { in: ['MAM-CORAL-90', 'MAM-SAGE-100', 'MAM-APRICOT-70'] },
            },
          },
        }),
        prisma.inventoryTransaction.count({ where: { referenceType: 'SEED' } }),
      ]);

    expect({
      roles,
      users,
      products,
      variants,
      inventories,
      ledgerEntries,
    }).toEqual({
      roles: 4,
      users: 5,
      products: 3,
      variants: 3,
      inventories: 3,
      ledgerEntries: 3,
    });
  });

  it('stores demo passwords with the shared password primitive', async () => {
    const demoPassword = process.env.DEMO_PASSWORD;
    if (!demoPassword) {
      throw new Error('DEMO_PASSWORD is required for database seed tests');
    }

    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'customer@mam-nho.local',
            'disabled-customer@mam-nho.local',
            'sales@mam-nho.local',
            'warehouse@mam-nho.local',
            'admin@mam-nho.local',
          ],
        },
      },
      select: { passwordHash: true },
    });
    const verificationResults = await Promise.all(
      users.map((user) => verifyPassword(user.passwordHash, demoPassword)),
    );

    expect(verificationResults).toHaveLength(5);
    expect(verificationResults.every(Boolean)).toBe(true);
  });

  it('rejects a duplicate user email', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@mam-nho.local' },
    });

    await expect(
      prisma.user.create({
        data: {
          roleId: admin.roleId,
          email: admin.email,
          passwordHash: 'not-persisted-because-the-insert-must-fail',
          fullName: 'Duplicate Admin',
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a duplicate SKU', async () => {
    const variant = await prisma.productVariant.findFirstOrThrow();
    const anotherSize = await prisma.size.findFirstOrThrow({
      where: { id: { not: variant.sizeId } },
    });

    await expect(
      prisma.productVariant.create({
        data: {
          productId: variant.productId,
          sizeId: anotherSize.id,
          colorId: variant.colorId,
          sku: variant.sku,
          price: variant.price,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a duplicate product-size-color variant', async () => {
    const variant = await prisma.productVariant.findFirstOrThrow();

    await expect(
      prisma.productVariant.create({
        data: {
          productId: variant.productId,
          sizeId: variant.sizeId,
          colorId: variant.colorId,
          sku: `DUPLICATE-DIMENSION-${Date.now()}`,
          price: variant.price,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a second cart for the same user', async () => {
    const cart = await prisma.cart.findFirstOrThrow();

    await expect(
      prisma.cart.create({ data: { userId: cart.userId } }),
    ).rejects.toThrow();
  });

  it('rejects inventory where reserved is greater than on-hand', async () => {
    const inventory = await prisma.inventory.findFirstOrThrow();

    await expect(
      prisma.inventory.update({
        where: { id: inventory.id },
        data: { reserved: inventory.onHand + 1 },
      }),
    ).rejects.toThrow();
  });

  it('rejects negative inventory state and zero-quantity ledger rows', async () => {
    const inventory = await prisma.inventory.findFirstOrThrow();

    await expect(
      prisma.inventory.update({
        where: { id: inventory.id },
        data: { onHand: -1 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.inventory.update({
        where: { id: inventory.id },
        data: { reserved: -1 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          variantId: inventory.variantId,
          warehouseId: inventory.warehouseId,
          type: 'ADJUSTMENT',
          quantity: 0,
          onHandBefore: inventory.onHand,
          onHandAfter: inventory.onHand,
          reservedBefore: inventory.reserved,
          reservedAfter: inventory.reserved,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects cart item quantity equal to zero', async () => {
    const cart = await prisma.cart.findFirstOrThrow();
    const variant = await prisma.productVariant.findFirstOrThrow();

    await expect(
      prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: variant.id,
          quantity: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects negative money and non-positive shipping dimensions', async () => {
    const variant = await prisma.productVariant.findFirstOrThrow();

    await expect(
      prisma.productVariant.update({
        where: { id: variant.id },
        data: { price: -1n },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.productVariant.update({
        where: { id: variant.id },
        data: { weightGrams: 0 },
      }),
    ).rejects.toThrow();
  });

  it('rejects a second default address for the same user', async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@mam-nho.local' },
    });

    await expect(
      prisma.address.create({
        data: {
          userId: customer.id,
          receiverName: 'Khách hàng Demo',
          phone: '0900000000',
          addressLine: '2 Đường Demo',
          wardCode: '00001',
          wardName: 'Phường Demo',
          provinceCode: '01',
          provinceName: 'Hà Nội',
          isDefault: true,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a second primary image for the same product', async () => {
    const product = await prisma.product.findUniqueOrThrow({
      where: { slug: 'set-ao-khoac-coral' },
    });

    await expect(
      prisma.productImage.create({
        data: {
          productId: product.id,
          url: '/images/second-primary.png',
          isPrimary: true,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects an order whose total does not match its components', async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@mam-nho.local' },
    });

    await expect(
      prisma.order.create({
        data: {
          orderNumber: `INVALID-${Date.now()}`,
          userId: customer.id,
          itemsSubtotal: 100_000n,
          discountAmount: 10_000n,
          shippingFee: 20_000n,
          totalAmount: 999_999n,
          shippingQuoteSource: ShippingQuoteSource.FALLBACK,
          receiverName: 'Khách hàng Demo',
          receiverPhone: '0900000000',
          shippingAddressLine: '1 Đường Demo',
          shippingWardCode: '00001',
          shippingWardName: 'Phường Demo',
          shippingProvinceCode: '01',
          shippingProvinceName: 'Hà Nội',
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a duplicate order number', async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@mam-nho.local' },
    });
    const orderNumber = `DUP-ORDER-${Date.now()}`;
    const orderData = {
      orderNumber,
      userId: customer.id,
      itemsSubtotal: 100_000n,
      discountAmount: 10_000n,
      shippingFee: 20_000n,
      totalAmount: 110_000n,
      shippingQuoteSource: ShippingQuoteSource.FALLBACK,
      receiverName: 'Khách hàng Demo',
      receiverPhone: '0900000000',
      shippingAddressLine: '1 Đường Demo',
      shippingWardCode: '00001',
      shippingWardName: 'Phường Demo',
      shippingProvinceCode: '01',
      shippingProvinceName: 'Hà Nội',
    };

    await expect(
      prisma.$transaction(async (transaction) => {
        await transaction.order.create({ data: orderData });
        await transaction.order.create({ data: orderData });
      }),
    ).rejects.toThrow();
  });

  it('rejects a second payment for the same order', async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@mam-nho.local' },
    });

    await expect(
      prisma.$transaction(async (transaction) => {
        const order = await transaction.order.create({
          data: {
            orderNumber: `PAYMENT-ONE-${Date.now()}`,
            userId: customer.id,
            itemsSubtotal: 100_000n,
            totalAmount: 100_000n,
            shippingQuoteSource: ShippingQuoteSource.FALLBACK,
            receiverName: 'Khách hàng Demo',
            receiverPhone: '0900000000',
            shippingAddressLine: '1 Đường Demo',
            shippingWardCode: '00001',
            shippingWardName: 'Phường Demo',
            shippingProvinceCode: '01',
            shippingProvinceName: 'Hà Nội',
          },
        });

        await transaction.payment.create({
          data: { orderId: order.id, method: 'COD', amount: 100_000n },
        });
        await transaction.payment.create({
          data: { orderId: order.id, method: 'COD', amount: 100_000n },
        });
      }),
    ).rejects.toThrow();
  });

  it('restricts deletion of a role referenced by users', async () => {
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: 'ADMIN' },
    });

    await expect(
      prisma.role.delete({ where: { id: role.id } }),
    ).rejects.toThrow();
  });
});
