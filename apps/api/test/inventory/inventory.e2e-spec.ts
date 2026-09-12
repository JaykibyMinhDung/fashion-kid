import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../../src/common/security/access-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { PrismaInventoryRepository } from '../../src/modules/inventory/repositories/prisma-inventory.repository';
import { createTestApplication } from '../test-app.factory';

function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Admin Inventory API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let repository: PrismaInventoryRepository;
  let adminToken: string;
  let warehouseToken: string;
  let customerToken: string;
  let productId: string | undefined;
  let variantId: string | undefined;
  let warehouseId: string;
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
    repository = app.get(PrismaInventoryRepository);

    const [
      admin,
      warehouseUser,
      customer,
      warehouse,
      category,
      brand,
      size,
      color,
    ] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { email: 'admin@mam-nho.local' },
      }),
      prisma.user.findUniqueOrThrow({
        where: { email: 'warehouse@mam-nho.local' },
      }),
      prisma.user.findUniqueOrThrow({
        where: { email: 'customer@mam-nho.local' },
      }),
      prisma.warehouse.findUniqueOrThrow({
        where: { code: 'MAIN_WAREHOUSE' },
      }),
      prisma.category.findUniqueOrThrow({ where: { slug: 'be-trai' } }),
      prisma.brand.findUniqueOrThrow({ where: { slug: 'mam-nho' } }),
      prisma.size.findUniqueOrThrow({ where: { code: '90' } }),
      prisma.color.findUniqueOrThrow({ where: { code: 'CORAL' } }),
    ]);
    warehouseId = warehouse.id;

    const accessTokens = app.get(AccessTokenService);
    [adminToken, warehouseToken, customerToken] = await Promise.all([
      accessTokens.sign(admin.id, 'ADMIN'),
      accessTokens.sign(warehouseUser.id, 'WAREHOUSE_STAFF'),
      accessTokens.sign(customer.id, 'CUSTOMER'),
    ]);

    const product = await request(server)
      .post('/api/v1/admin/catalog/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: category.id,
        brandId: brand.id,
        name: `Inventory E2E ${suffix}`,
        slug: `inventory-e2e-${suffix}`,
      })
      .expect(201);
    productId = bodyOf<{ id: string }>(product).id;

    const variant = await request(server)
      .post(`/api/v1/admin/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sizeId: size.id,
        colorId: color.id,
        sku: `INV-E2E-${suffix}`,
        price: '159000',
        weightGrams: 250,
        lengthCm: 20,
        widthCm: 18,
        heightCm: 5,
      })
      .expect(201);
    variantId = bodyOf<{ id: string }>(variant).id;
  });

  afterAll(async () => {
    if (variantId) {
      await prisma.inventoryTransaction.deleteMany({
        where: { variantId },
      });
      await prisma.inventory.deleteMany({ where: { variantId } });
    }
    if (productId) {
      await prisma.productVariant.deleteMany({ where: { productId } });
      await prisma.productImage.deleteMany({ where: { productId } });
      await prisma.auditLog.deleteMany({ where: { entityId: productId } });
      await prisma.product.delete({ where: { id: productId } });
    }
    await app.close();
  });

  it('enforces inventory permissions and exposes zero stock before first import', async () => {
    await request(server)
      .get('/api/v1/admin/inventory')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const list = await request(server)
      .get('/api/v1/admin/inventory')
      .query({ q: `INV-E2E-${suffix}`, limit: 20 })
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(200);
    expect(
      bodyOf<{
        total: number;
        items: Array<{
          variantId: string;
          inventoryId: string | null;
          onHand: number;
          reserved: number;
          available: number;
        }>;
      }>(list),
    ).toEqual(
      expect.objectContaining({
        total: 1,
        items: [
          expect.objectContaining({
            variantId,
            inventoryId: null,
            onHand: 0,
            reserved: 0,
            available: 0,
          }),
        ],
      }),
    );
  });

  it('imports stock, creates the first row atomically and records history', async () => {
    const imported = await request(server)
      .post('/api/v1/admin/inventory/import')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ variantId, quantity: 5, note: 'Lô đầu tiên' })
      .expect(201);
    const importedBody = bodyOf<{
      inventory: { onHand: number; reserved: number; available: number };
      transaction: { type: string; quantity: number; onHandBefore: number };
    }>(imported);
    expect(importedBody.inventory).toMatchObject({
      onHand: 5,
      reserved: 0,
      available: 5,
    });
    expect(importedBody.transaction).toMatchObject({
      type: 'IMPORT',
      quantity: 5,
      onHandBefore: 0,
    });

    const second = await request(server)
      .post('/api/v1/admin/inventory/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ variantId, quantity: 2 })
      .expect(201);
    expect(
      bodyOf<{ inventory: { onHand: number } }>(second).inventory.onHand,
    ).toBe(7);

    const detail = await request(server)
      .get(`/api/v1/admin/inventory/${variantId}`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(200);
    expect(bodyOf<{ onHand: number; reserved: number }>(detail)).toEqual(
      expect.objectContaining({ onHand: 7, reserved: 0 }),
    );

    const history = await request(server)
      .get(`/api/v1/admin/inventory/${variantId}/history`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(200);
    const historyBody = bodyOf<{
      total: number;
      items: Array<{ type: string }>;
    }>(history);
    expect(historyBody.total).toBe(2);
    expect(historyBody.items.map((item) => item.type)).toContain('IMPORT');
  });

  it('rejects no-op/unsafe target adjustment and keeps decimal-independent stock integers', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@mam-nho.local' },
    });
    await prisma.$transaction((transaction) =>
      repository.reserveMany(transaction, {
        lines: [{ warehouseId, variantId: variantId!, quantity: 2 }],
        referenceType: 'INVENTORY_E2E_RESERVE',
        actorId: admin.id,
        referenceId: variantId,
      }),
    );

    await request(server)
      .post(`/api/v1/admin/inventory/${variantId}/adjust`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ targetOnHand: 1, reason: 'Kiểm kê' })
      .expect(409)
      .expect((response) => {
        expect(bodyOf<{ code: string }>(response).code).toBe(
          'INVENTORY_TARGET_BELOW_RESERVED',
        );
      });

    await request(server)
      .post(`/api/v1/admin/inventory/${variantId}/adjust`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ targetOnHand: 7, reason: 'Không thay đổi' })
      .expect(409)
      .expect((response) => {
        expect(bodyOf<{ code: string }>(response).code).toBe('INVENTORY_NOOP');
      });

    const adjusted = await request(server)
      .post(`/api/v1/admin/inventory/${variantId}/adjust`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ targetOnHand: 10, reason: 'Kiểm kê thực tế' })
      .expect(201);
    const adjustedBody = bodyOf<{
      inventory: { onHand: number; reserved: number };
      transaction: { type: string; quantity: number };
    }>(adjusted);
    expect(adjustedBody.inventory).toMatchObject({ onHand: 10, reserved: 2 });
    expect(adjustedBody.transaction).toMatchObject({
      type: 'ADJUSTMENT',
      quantity: 3,
    });
  });

  it('supports release and sale primitives with append-only ledger rows', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@mam-nho.local' },
    });
    const released = await prisma.$transaction((transaction) =>
      repository.releaseMany(transaction, {
        lines: [{ warehouseId, variantId: variantId!, quantity: 1 }],
        referenceType: 'INVENTORY_E2E_RELEASE',
        actorId: admin.id,
      }),
    );
    expect(released[0]).toEqual(
      expect.objectContaining({
        onHandBefore: 10,
        onHandAfter: 10,
        reservedBefore: 2,
        reservedAfter: 1,
      }),
    );

    const sold = await prisma.$transaction((transaction) =>
      repository.saleMany(transaction, {
        lines: [{ warehouseId, variantId: variantId!, quantity: 1 }],
        referenceType: 'INVENTORY_E2E_SALE',
        actorId: admin.id,
      }),
    );
    expect(sold[0]).toEqual(
      expect.objectContaining({
        onHandBefore: 10,
        onHandAfter: 9,
        reservedBefore: 1,
        reservedAfter: 0,
      }),
    );

    await expect(
      prisma.inventoryTransaction.count({
        where: {
          variantId,
          type: { in: ['RELEASE', 'SALE'] },
        },
      }),
    ).resolves.toBe(2);
  });
});
