import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../../src/common/security/access-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { createTestApplication } from '../test-app.factory';

function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Admin Product/Variant/Image API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let adminToken: string;
  let customerToken: string;
  let productId: string | undefined;
  let variantId: string | undefined;
  let firstImageId: string | undefined;
  let secondImageId: string | undefined;
  const suffix = randomUUID().slice(0, 8);
  const slug = `san-pham-crud-${suffix}`;
  const sku = `crud-${suffix}`.toUpperCase();

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
    const [admin, customer] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { email: 'admin@mam-nho.local' },
      }),
      prisma.user.findUniqueOrThrow({
        where: { email: 'customer@mam-nho.local' },
      }),
    ]);
    const [category, brand] = await Promise.all([
      prisma.category.findUniqueOrThrow({ where: { slug: 'be-trai' } }),
      prisma.brand.findUniqueOrThrow({ where: { slug: 'mam-nho' } }),
    ]);
    const [size, color] = await Promise.all([
      prisma.size.findUniqueOrThrow({ where: { code: '90' } }),
      prisma.color.findUniqueOrThrow({ where: { code: 'CORAL' } }),
    ]);
    const accessTokens = app.get(AccessTokenService);
    [adminToken, customerToken] = await Promise.all([
      accessTokens.sign(admin.id, 'ADMIN'),
      accessTokens.sign(customer.id, 'CUSTOMER'),
    ]);

    const product = await request(server)
      .post('/api/v1/admin/catalog/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: category.id,
        brandId: brand.id,
        name: '  Sản phẩm CRUD  ',
        slug: ` ${slug.toUpperCase()} `,
        description: 'Sản phẩm dùng cho e2e',
      })
      .expect(201);
    productId = bodyOf<{ id: string }>(product).id;

    const variant = await request(server)
      .post(`/api/v1/admin/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sizeId: size.id,
        colorId: color.id,
        sku: ` ${sku.toLowerCase()} `,
        price: '129000',
        weightGrams: 300,
        lengthCm: 20,
        widthCm: 18,
        heightCm: 5,
      })
      .expect(201);
    variantId = bodyOf<{ id: string; sku: string; price: string }>(variant).id;
    expect(bodyOf<{ sku: string; price: string }>(variant)).toEqual(
      expect.objectContaining({ sku, price: '129000' }),
    );
  });

  afterAll(async () => {
    if (productId) {
      await prisma.auditLog.deleteMany({ where: { entityId: productId } });
      const variants = await prisma.productVariant.findMany({
        where: { productId },
        select: { id: true },
      });
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: variants.map((item) => item.id) } },
      });
      await prisma.productVariant.deleteMany({ where: { productId } });
      await prisma.productImage.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } });
    }
    await app.close();
  });

  it('protects CRUD endpoints and keeps product status separate from field updates', async () => {
    await request(server)
      .get('/api/v1/admin/catalog/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(server)
      .patch(`/api/v1/admin/catalog/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(400);

    const list = await request(server)
      .get('/api/v1/admin/catalog/products')
      .query({ q: slug, status: 'DISABLED' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      bodyOf<{ total: number; items: Array<{ slug: string }> }>(list),
    ).toEqual(
      expect.objectContaining({
        total: 1,
        items: [expect.objectContaining({ slug })],
      }),
    );

    await request(server)
      .patch(`/api/v1/admin/catalog/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sản phẩm CRUD đã sửa' })
      .expect(200);

    await request(server)
      .post('/api/v1/admin/catalog/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: randomUUID(),
        name: 'FK invalid',
        slug: `fk-${suffix}`,
      })
      .expect(409);
  });

  it('enforces immutable SKU and variant activation preconditions with audit', async () => {
    await request(server)
      .patch(`/api/v1/admin/catalog/variants/${variantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'OTHER-SKU' })
      .expect(400);

    await request(server)
      .patch(`/api/v1/admin/catalog/variants/${variantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: '001' })
      .expect(400);

    const activated = await request(server)
      .patch(`/api/v1/admin/catalog/variants/${variantId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(bodyOf<{ status: string }>(activated).status).toBe('ACTIVE');
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: variantId, action: 'VARIANT_ACTIVATED' },
    });
    expect(audit?.actorId).toBeTruthy();

    await request(server)
      .patch(`/api/v1/admin/catalog/variants/${variantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ weightGrams: null })
      .expect(409)
      .expect((response) =>
        expect(bodyOf<{ code: string }>(response).code).toBe(
          'CATALOG_ACTIVATION_BLOCKED',
        ),
      );
    await expect(
      prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } }),
    ).resolves.toEqual(expect.objectContaining({ weightGrams: 300 }));
  });

  it('maintains one primary image and prevents invalid active deletion', async () => {
    const first = await request(server)
      .post(`/api/v1/admin/catalog/products/${productId}/images`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ url: '/images/crud-first.png', isPrimary: true })
      .expect(201);
    firstImageId = bodyOf<{ id: string }>(first).id;
    expect(bodyOf<{ isPrimary: boolean }>(first).isPrimary).toBe(true);

    const second = await request(server)
      .post(`/api/v1/admin/catalog/products/${productId}/images`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ url: '/images/crud-second.png' })
      .expect(201);
    secondImageId = bodyOf<{ id: string }>(second).id;

    await request(server)
      .patch(`/api/v1/admin/catalog/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    await request(server)
      .delete(`/api/v1/admin/catalog/images/${firstImageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await expect(
      prisma.productImage.findUniqueOrThrow({ where: { id: secondImageId } }),
    ).resolves.toEqual(expect.objectContaining({ isPrimary: true }));

    await request(server)
      .delete(`/api/v1/admin/catalog/images/${secondImageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .expect((response) =>
        expect(bodyOf<{ code: string }>(response).code).toBe(
          'CATALOG_ACTIVATION_BLOCKED',
        ),
      );
  });
});
