import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
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
  UserStatus,
  VariantStatus,
} from '../../src/generated/prisma/client';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { PrismaInventoryRepository } from '../../src/modules/inventory/repositories/prisma-inventory.repository';
import { PrismaOrderRepository } from '../../src/modules/orders/repositories/prisma-order.repository';
import { OrderTransitionService } from '../../src/modules/orders/services/order-transition.service';

describe('Order Lifecycle Concurrency & Race Conditions (database)', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for concurrency database tests');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const prismaService = prisma as unknown as PrismaService;

  const orderRepository = new PrismaOrderRepository(prismaService);
  const inventoryRepository = new PrismaInventoryRepository();
  const transitionService = new OrderTransitionService(
    prismaService,
    orderRepository,
    inventoryRepository,
  );

  let warehouseId: string;
  let variantId: string;
  let customerId: string;
  let salesId: string;
  let warehouseStaffId: string;
  let adminId: string;

  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
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

    const [c, s, w, a] = await Promise.all([
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: `occ-c-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Concurrency Customer',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: salesRole.id,
          email: `occ-s-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Concurrency Sales',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: warehouseRole.id,
          email: `occ-w-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Concurrency Warehouse',
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          roleId: adminRole.id,
          email: `occ-a-${suffix}@mam-nho.local`,
          passwordHash: 'hash',
          fullName: 'Concurrency Admin',
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    customerId = c.id;
    salesId = s.id;
    warehouseStaffId = w.id;
    adminId = a.id;

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Sản Phẩm Concurrency ${suffix}`,
        slug: `san-pham-concurrency-${suffix}`,
        status: ProductStatus.ACTIVE,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sizeId: size.id,
        colorId: color.id,
        sku: `OCC-SKU-${suffix}`,
        price: 200000n,
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
    await prisma.inventoryTransaction.deleteMany({
      where: { variantId },
    });
    await prisma.orderItem.deleteMany({
      where: { variantId },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { order: { userId: customerId } },
    });
    await prisma.paymentTransaction.deleteMany({
      where: { payment: { order: { userId: customerId } } },
    });
    await prisma.payment.deleteMany({
      where: { order: { userId: customerId } },
    });
    await prisma.order.deleteMany({
      where: { userId: customerId },
    });
    await prisma.inventory.deleteMany({
      where: { variantId },
    });
    await prisma.productVariant.deleteMany({
      where: { id: variantId },
    });
    await prisma.product.deleteMany({
      where: { slug: `san-pham-concurrency-${suffix}` },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customerId, salesId, warehouseStaffId, adminId] } },
    });
    await prisma.$disconnect();
  });

  async function createOrderFixture(status: OrderStatus): Promise<string> {
    const orderId = randomUUID();
    const orderNumber = `ORD-${Date.now().toString().slice(0, 8)}-${randomUUID().slice(0, 6)}`;

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
        userId: customerId,
        status,
        itemsSubtotal: 200000n,
        shippingFee: 30000n,
        totalAmount: 230000n,
        currency: 'VND',
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Người Nhận',
        receiverPhone: '0901234567',
        shippingAddressLine: '123 Đinh Tiên Hoàng',
        shippingWardCode: '00001',
        shippingWardName: 'Hàng Bạc',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hà Nội',
        items: {
          create: {
            variantId,
            productName: `Sản Phẩm Concurrency ${suffix}`,
            sku: `OCC-SKU-${suffix}`,
            colorName: 'Đỏ',
            sizeName: 'M',
            unitPrice: 200000n,
            quantity: 1,
            lineTotal: 200000n,
          },
        },
        payment: {
          create: {
            method: PaymentMethod.COD,
            status: PaymentStatus.PENDING,
            amount: 230000n,
            currency: 'VND',
            transactions: {
              create: {
                type: PaymentTxType.PAYMENT_CREATED,
                status: PaymentTxStatus.PENDING,
                amount: 230000n,
                attemptRef: `${orderId}-COD-INIT`,
              },
            },
          },
        },
      },
    });

    return orderId;
  }

  it('Race 1: Double Confirm -> exactly 1 succeeds, 1 gets 409 Conflict', async () => {
    const orderId = await createOrderFixture(OrderStatus.PENDING);

    const results = await Promise.allSettled([
      transitionService.confirm(orderId, salesId, 'SALES_STAFF'),
      transitionService.confirm(orderId, salesId, 'SALES_STAFF'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectedItem = rejected[0] as unknown as
      { reason: unknown } | undefined;
    expect(rejectedItem?.reason).toBeInstanceOf(ConflictException);

    // Verify exactly 1 history row was created
    const histories = await prisma.orderStatusHistory.findMany({
      where: { orderId, toStatus: OrderStatus.CONFIRMED },
    });
    expect(histories).toHaveLength(1);
  });

  it('Race 2: Cancel vs StartPacking -> exactly 1 succeeds, loser gets 409 Conflict', async () => {
    const orderId = await createOrderFixture(OrderStatus.CONFIRMED);

    const results = await Promise.allSettled([
      transitionService.cancelByStaff(
        orderId,
        salesId,
        'SALES_STAFF',
        'Cancel in race',
      ),
      transitionService.startPacking(
        orderId,
        warehouseStaffId,
        'WAREHOUSE_STAFF',
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectedItem = rejected[0] as unknown as
      { reason: unknown } | undefined;
    expect(rejectedItem?.reason).toBeInstanceOf(ConflictException);

    const finalOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect([OrderStatus.PACKING, OrderStatus.CANCELLED]).toContain(
      finalOrder.status,
    );
  });

  it('Race 3: Double Ship -> exactly 1 succeeds, exactly 1 SALE ledger created', async () => {
    const orderId = await createOrderFixture(OrderStatus.PACKING);

    const results = await Promise.allSettled([
      transitionService.ship(orderId, warehouseStaffId, 'WAREHOUSE_STAFF'),
      transitionService.ship(orderId, warehouseStaffId, 'WAREHOUSE_STAFF'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectedItem = rejected[0] as unknown as
      { reason: unknown } | undefined;
    expect(rejectedItem?.reason).toBeInstanceOf(ConflictException);

    const salesLedgers = await prisma.inventoryTransaction.findMany({
      where: {
        referenceType: 'ORDER',
        referenceId: orderId,
        type: 'SALE',
      },
    });
    expect(salesLedgers).toHaveLength(1);
  });

  it('Race 4: Duplicate Complete -> exactly 1 succeeds, exactly 1 COD_COLLECTED created', async () => {
    const orderId = await createOrderFixture(OrderStatus.DELIVERED);

    const results = await Promise.allSettled([
      transitionService.complete(orderId, adminId, 'ADMIN'),
      transitionService.complete(orderId, adminId, 'ADMIN'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectedItem = rejected[0] as unknown as
      { reason: unknown } | undefined;
    expect(rejectedItem?.reason).toBeInstanceOf(ConflictException);

    const collectedTx = await prisma.paymentTransaction.findMany({
      where: {
        payment: { orderId },
        type: PaymentTxType.COD_COLLECTED,
      },
    });
    expect(collectedTx).toHaveLength(1);
  });
});
