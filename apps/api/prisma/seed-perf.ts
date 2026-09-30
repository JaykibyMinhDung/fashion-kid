/**
 * Perf seed (Day 22) — dữ liệu đại diện để benchmark & phát hiện N+1.
 * KHÁC seed demo golden-path: script này tạo HÀNG TRĂM product + HÀNG NGHÌN order
 * ở nhiều trạng thái, để đo p95 / query-count / EXPLAIN sát thực tế.
 *
 * Yêu cầu: chạy `pnpm db:seed` (demo seed) TRƯỚC để có master data
 * (roles, sizes, colors, category, brand, warehouse, customer/admin).
 *
 * Cách chạy (trên máy Node 24):
 *   PERF_PRODUCTS=300 PERF_ORDERS=2000 pnpm db:seed:perf
 * (mặc định 300 product / 2000 order nếu không set env)
 *
 * Idempotency: chạy trên DB đã reset (`pnpm db:migrate:reset` rồi `db:seed`).
 * Nếu dữ liệu perf đã tồn tại, script dừng và yêu cầu reset để tránh trùng unique.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import {
  InventoryTxType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductGender,
  ProductStatus,
  VariantStatus,
} from '../src/generated/prisma/client';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Perf seed bị vô hiệu ở production.');
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const connectionString = requireEnv('DATABASE_URL');
const PERF_PRODUCTS = intEnv('PERF_PRODUCTS', 300);
const PERF_ORDERS = intEnv('PERF_ORDERS', 2000);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main(): Promise<void> {
  // --- Master data (từ demo seed) ---
  const warehouse = await prisma.warehouse.findUniqueOrThrow({
    where: { code: 'MAIN_WAREHOUSE' },
  });
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { slug: 'mam-nho' },
  });
  const category = await prisma.category.findUniqueOrThrow({
    where: { slug: 'be-trai' },
  });
  const sizes = await prisma.size.findMany();
  const colors = await prisma.color.findMany();
  const customer = await prisma.user.findUniqueOrThrow({
    where: { email: 'customer@mam-nho.local' },
  });
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: 'admin@mam-nho.local' },
  });
  if (sizes.length === 0 || colors.length === 0) {
    throw new Error('Thiếu sizes/colors — hãy chạy `pnpm db:seed` trước.');
  }

  // --- Idempotency guard ---
  const already = await prisma.product.findUnique({
    where: { slug: 'perf-product-1' },
  });
  if (already) {
    throw new Error(
      'Dữ liệu perf đã tồn tại. Hãy `pnpm db:migrate:reset` + `pnpm db:seed` rồi chạy lại perf seed.',
    );
  }

  // --- 1. Products + variants + inventory (+ import tx) ---
  const products: Prisma.ProductCreateManyInput[] = [];
  const variants: Prisma.ProductVariantCreateManyInput[] = [];
  const inventories: Prisma.InventoryCreateManyInput[] = [];
  const invTx: Prisma.InventoryTransactionCreateManyInput[] = [];

  type VariantMeta = {
    id: string;
    price: bigint;
    productName: string;
    sku: string;
    colorName: string;
    sizeName: string;
  };
  const variantMeta: VariantMeta[] = [];

  for (let i = 1; i <= PERF_PRODUCTS; i++) {
    const productId = randomUUID();
    const variantId = randomUUID();
    const inventoryId = randomUUID();
    const size = pick(sizes, i);
    const color = pick(colors, i);
    const price = BigInt(150_000 + (i % 30) * 10_000);
    const stock = 50 + (i % 50);
    const productName = `Sản phẩm hiệu năng ${i}`;
    const sku = `PERF-SKU-${i}`;

    products.push({
      id: productId,
      categoryId: category.id,
      brandId: brand.id,
      name: productName,
      slug: `perf-product-${i}`,
      gender: ProductGender.UNISEX,
      ageGroup: '2-6 tuổi',
      status: ProductStatus.ACTIVE,
    });
    variants.push({
      id: variantId,
      productId,
      sizeId: size.id,
      colorId: color.id,
      sku,
      price,
      weightGrams: 300,
      status: VariantStatus.ACTIVE,
    });
    inventories.push({
      id: inventoryId,
      warehouseId: warehouse.id,
      variantId,
      onHand: stock,
    });
    invTx.push({
      id: randomUUID(),
      inventoryId,
      warehouseId: warehouse.id,
      variantId,
      actorId: admin.id,
      type: InventoryTxType.IMPORT,
      quantity: stock,
      onHandBefore: 0,
      onHandAfter: stock,
      reservedBefore: 0,
      reservedAfter: 0,
      referenceType: 'PERF_SEED',
      referenceId: variantId,
      note: 'perf seed import',
    });
    variantMeta.push({
      id: variantId,
      price,
      productName,
      sku,
      colorName: color.name,
      sizeName: size.name,
    });
  }

  for (const c of chunk(products, 1000))
    await prisma.product.createMany({ data: c });
  for (const c of chunk(variants, 1000))
    await prisma.productVariant.createMany({ data: c });
  for (const c of chunk(inventories, 1000))
    await prisma.inventory.createMany({ data: c });
  for (const c of chunk(invTx, 1000))
    await prisma.inventoryTransaction.createMany({ data: c });
  console.log(`Seeded ${PERF_PRODUCTS} products/variants/inventory.`);

  // --- 2. Orders (nhiều trạng thái) + items + payment + status history ---
  // Phân bố: COMPLETED 40%, DELIVERED 15%, SHIPPING 15%, PACKING 10%,
  // CONFIRMED 10%, PENDING 5%, CANCELLED 5%.
  function statusFor(i: number): OrderStatus {
    const r = i % 100;
    if (r < 40) return OrderStatus.COMPLETED;
    if (r < 55) return OrderStatus.DELIVERED;
    if (r < 70) return OrderStatus.SHIPPING;
    if (r < 80) return OrderStatus.PACKING;
    if (r < 90) return OrderStatus.CONFIRMED;
    if (r < 95) return OrderStatus.PENDING;
    return OrderStatus.CANCELLED;
  }

  const orders: Prisma.OrderCreateManyInput[] = [];
  const orderItems: Prisma.OrderItemCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const histories: Prisma.OrderStatusHistoryCreateManyInput[] = [];

  for (let n = 1; n <= PERF_ORDERS; n++) {
    const orderId = randomUUID();
    const status = statusFor(n);
    const createdAt = new Date(Date.now() - ((n % 120) + 1) * DAY_MS);

    // 1..3 line items
    const lineCount = 1 + (n % 3);
    let subtotal = 0n;
    for (let k = 0; k < lineCount; k++) {
      const v = pick(variantMeta, n * 7 + k * 13);
      const quantity = 1 + ((n + k) % 2);
      const lineTotal = v.price * BigInt(quantity);
      subtotal += lineTotal;
      orderItems.push({
        id: randomUUID(),
        orderId,
        variantId: v.id,
        productName: v.productName,
        sku: v.sku,
        colorName: v.colorName,
        sizeName: v.sizeName,
        unitPrice: v.price,
        quantity,
        lineTotal,
      });
    }
    const shippingFee = 30_000n;
    const totalAmount = subtotal + shippingFee;

    const isCompleted = status === OrderStatus.COMPLETED;
    const completedAt = isCompleted
      ? new Date(Date.now() - (n % 90) * DAY_MS)
      : null;

    orders.push({
      id: orderId,
      orderNumber: `PERF-${String(n).padStart(6, '0')}`,
      userId: customer.id,
      status,
      itemsSubtotal: subtotal,
      discountAmount: 0n,
      shippingFee,
      totalAmount,
      paymentMethod: PaymentMethod.COD,
      receiverName: 'Khách hàng Demo',
      receiverPhone: '0900000000',
      shippingAddressLine: '1 Đường Demo',
      shippingWardCode: '00001',
      shippingWardName: 'Phường Demo',
      shippingProvinceCode: '01',
      shippingProvinceName: 'Hà Nội',
      createdAt,
      completedAt,
      confirmedAt: status === OrderStatus.PENDING ? null : createdAt,
    });

    payments.push({
      id: randomUUID(),
      orderId,
      method: PaymentMethod.COD,
      amount: totalAmount,
      status: isCompleted ? PaymentStatus.PAID : PaymentStatus.PENDING,
      paidAt: completedAt,
    });

    histories.push({
      id: randomUUID(),
      orderId,
      fromStatus: null,
      toStatus: OrderStatus.PENDING,
      changedBy: customer.id,
      note: 'perf seed create',
    });
    if (status !== OrderStatus.PENDING) {
      histories.push({
        id: randomUUID(),
        orderId,
        fromStatus: OrderStatus.PENDING,
        toStatus: status,
        changedBy: admin.id,
        note: 'perf seed advance',
      });
    }
  }

  for (const c of chunk(orders, 1000))
    await prisma.order.createMany({ data: c });
  for (const c of chunk(orderItems, 1000))
    await prisma.orderItem.createMany({ data: c });
  for (const c of chunk(payments, 1000))
    await prisma.payment.createMany({ data: c });
  for (const c of chunk(histories, 1000))
    await prisma.orderStatusHistory.createMany({ data: c });

  console.log(
    `Seeded ${PERF_ORDERS} orders (+items/payment/history). Perf seed done.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
