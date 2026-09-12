import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  InsufficientInventoryError,
  InventoryRepository,
} from '../../src/modules/inventory/repositories/inventory.repository';
import { PrismaInventoryRepository } from '../../src/modules/inventory/repositories/prisma-inventory.repository';

describe('Inventory reservation concurrency (e2e)', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for inventory concurrency tests');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const repository: InventoryRepository = new PrismaInventoryRepository();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('never reserves above on-hand under concurrent transactions', async () => {
    const variant = await prisma.productVariant.findFirstOrThrow();
    const warehouse = await prisma.warehouse.create({
      data: {
        code: `TC-${randomUUID()}`,
        name: 'Test warehouse',
      },
    });
    const inventory = await prisma.inventory.create({
      data: { warehouseId: warehouse.id, variantId: variant.id, onHand: 1 },
    });

    try {
      const reserve = async () =>
        prisma
          .$transaction((transaction) =>
            repository.reserveMany(transaction, {
              lines: [
                {
                  warehouseId: warehouse.id,
                  variantId: variant.id,
                  quantity: 1,
                },
              ],
              referenceType: 'CONCURRENCY_TEST',
              referenceId: variant.id,
            }),
          )
          .then(() => true)
          .catch((error: unknown) => {
            if (error instanceof InsufficientInventoryError) {
              return false;
            }
            throw error;
          });

      const outcomes = await Promise.all([reserve(), reserve()]);
      expect(outcomes.filter(Boolean)).toHaveLength(1);

      const finalInventory = await prisma.inventory.findUniqueOrThrow({
        where: { id: inventory.id },
      });
      const ledgerCount = await prisma.inventoryTransaction.count({
        where: {
          inventoryId: inventory.id,
          referenceType: 'CONCURRENCY_TEST',
        },
      });

      expect(finalInventory.reserved).toBe(1);
      expect(finalInventory.reserved).toBeLessThanOrEqual(
        finalInventory.onHand,
      );
      expect(ledgerCount).toBe(1);
    } finally {
      await prisma.inventoryTransaction.deleteMany({
        where: { inventoryId: inventory.id },
      });
      await prisma.inventory.delete({ where: { id: inventory.id } });
      await prisma.warehouse.delete({ where: { id: warehouse.id } });
    }
  });

  it('creates one inventory row when concurrent first imports race', async () => {
    const variant = await prisma.productVariant.findFirstOrThrow();
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@mam-nho.local' },
    });
    const warehouse = await prisma.warehouse.create({
      data: {
        code: `FI-${randomUUID()}`,
        name: 'First import warehouse',
      },
    });

    try {
      const importStock = (quantity: number) =>
        prisma.$transaction((transaction) =>
          repository.importOne(transaction, {
            warehouseId: warehouse.id,
            variantId: variant.id,
            quantity,
            actorId: admin.id,
            note: 'Concurrent first import',
          }),
        );

      await Promise.all([importStock(3), importStock(4)]);

      const [inventories, ledgerCount] = await Promise.all([
        prisma.inventory.findMany({
          where: { warehouseId: warehouse.id, variantId: variant.id },
        }),
        prisma.inventoryTransaction.count({
          where: {
            warehouseId: warehouse.id,
            variantId: variant.id,
            referenceType: 'ADMIN_IMPORT',
          },
        }),
      ]);
      expect(inventories).toHaveLength(1);
      expect(inventories[0]?.onHand).toBe(7);
      expect(ledgerCount).toBe(2);
    } finally {
      await prisma.inventoryTransaction.deleteMany({
        where: { warehouseId: warehouse.id },
      });
      await prisma.inventory.deleteMany({
        where: { warehouseId: warehouse.id },
      });
      await prisma.warehouse.delete({ where: { id: warehouse.id } });
    }
  });

  it('mutates release and sale under the same row lock and records snapshots', async () => {
    const variant = await prisma.productVariant.findFirstOrThrow();
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@mam-nho.local' },
    });
    const warehouse = await prisma.warehouse.create({
      data: {
        code: `RS-${randomUUID()}`,
        name: 'Release sale warehouse',
      },
    });
    const inventory = await prisma.inventory.create({
      data: {
        warehouseId: warehouse.id,
        variantId: variant.id,
        onHand: 3,
        reserved: 2,
      },
    });

    try {
      const released = await prisma.$transaction((transaction) =>
        repository.releaseMany(transaction, {
          lines: [
            { warehouseId: warehouse.id, variantId: variant.id, quantity: 1 },
          ],
          referenceType: 'RELEASE_SALE_TEST',
          actorId: admin.id,
        }),
      );
      expect(released[0]).toEqual(
        expect.objectContaining({ reservedBefore: 2, reservedAfter: 1 }),
      );

      const sold = await prisma.$transaction((transaction) =>
        repository.saleMany(transaction, {
          lines: [
            { warehouseId: warehouse.id, variantId: variant.id, quantity: 1 },
          ],
          referenceType: 'RELEASE_SALE_TEST',
          actorId: admin.id,
        }),
      );
      expect(sold[0]).toEqual(
        expect.objectContaining({
          onHandBefore: 3,
          onHandAfter: 2,
          reservedBefore: 1,
          reservedAfter: 0,
        }),
      );
      await expect(
        prisma.inventory.findUniqueOrThrow({ where: { id: inventory.id } }),
      ).resolves.toEqual(expect.objectContaining({ onHand: 2, reserved: 0 }));
    } finally {
      await prisma.inventoryTransaction.deleteMany({
        where: { inventoryId: inventory.id },
      });
      await prisma.inventory.delete({ where: { id: inventory.id } });
      await prisma.warehouse.delete({ where: { id: warehouse.id } });
    }
  });

  it('rolls back earlier reservations and ledger rows when a later line fails', async () => {
    const variants = await prisma.productVariant.findMany({
      orderBy: { id: 'asc' },
      take: 2,
    });
    expect(variants).toHaveLength(2);

    const warehouse = await prisma.warehouse.create({
      data: {
        code: `TR-${randomUUID()}`,
        name: 'Rollback warehouse',
      },
    });
    const firstInventory = await prisma.inventory.create({
      data: {
        warehouseId: warehouse.id,
        variantId: variants[0].id,
        onHand: 1,
      },
    });
    const secondInventory = await prisma.inventory.create({
      data: {
        warehouseId: warehouse.id,
        variantId: variants[1].id,
        onHand: 0,
      },
    });

    try {
      await expect(
        prisma.$transaction((transaction) =>
          repository.reserveMany(transaction, {
            lines: variants.map((variant) => ({
              warehouseId: warehouse.id,
              variantId: variant.id,
              quantity: 1,
            })),
            referenceType: 'ROLLBACK_TEST',
            referenceId: warehouse.id,
          }),
        ),
      ).rejects.toBeInstanceOf(InsufficientInventoryError);

      const [freshFirstInventory, ledgerCount] = await Promise.all([
        prisma.inventory.findUniqueOrThrow({
          where: { id: firstInventory.id },
        }),
        prisma.inventoryTransaction.count({
          where: {
            warehouseId: warehouse.id,
            referenceType: 'ROLLBACK_TEST',
          },
        }),
      ]);

      expect(freshFirstInventory.reserved).toBe(0);
      expect(ledgerCount).toBe(0);
    } finally {
      await prisma.inventory.deleteMany({
        where: { id: { in: [firstInventory.id, secondInventory.id] } },
      });
      await prisma.warehouse.delete({ where: { id: warehouse.id } });
    }
  });
});
