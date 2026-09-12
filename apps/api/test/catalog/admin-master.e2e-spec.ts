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

describe('Admin Catalog master API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let adminToken: string;
  let customerToken: string;
  let parentCategoryId: string | undefined;
  let childCategoryId: string | undefined;
  let brandId: string | undefined;
  let sizeId: string | undefined;
  let colorId: string | undefined;
  const suffix = randomUUID().slice(0, 8);
  const parentSlug = `nhom-ao-${suffix}`;
  const categorySlug = `ao-moi-${suffix}`;
  const brandSlug = `brand-moi-${suffix}`;
  const sizeCode = `SIZE_${suffix.toUpperCase()}`;
  const colorCode = `COLOR_${suffix.toUpperCase()}`;

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
    const accessTokens = app.get(AccessTokenService);
    [adminToken, customerToken] = await Promise.all([
      accessTokens.sign(admin.id, 'ADMIN'),
      accessTokens.sign(customer.id, 'CUSTOMER'),
    ]);
  });

  afterAll(async () => {
    if (childCategoryId)
      await prisma.category.delete({ where: { id: childCategoryId } });
    if (parentCategoryId)
      await prisma.category.delete({ where: { id: parentCategoryId } });
    if (brandId) await prisma.brand.delete({ where: { id: brandId } });
    if (sizeId) await prisma.size.delete({ where: { id: sizeId } });
    if (colorId) await prisma.color.delete({ where: { id: colorId } });
    await app.close();
  });

  it('protects master endpoints and normalizes category slug/parent', async () => {
    await request(server)
      .get('/api/v1/admin/catalog/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const parent = await request(server)
      .post('/api/v1/admin/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '  Nhóm áo mới  ',
        slug: `NHOM-AO-${suffix}`,
        status: 'ACTIVE',
      })
      .expect(201);
    const parentBody = bodyOf<{
      id: string;
      slug: string;
      name: string;
      status: string;
    }>(parent);
    parentCategoryId = parentBody.id;
    expect(parentBody).toEqual(
      expect.objectContaining({
        slug: parentSlug,
        name: 'Nhóm áo mới',
        status: 'ACTIVE',
      }),
    );

    const child = await request(server)
      .post('/api/v1/admin/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '  Áo len  ',
        slug: categorySlug,
        parentId: parentCategoryId,
      })
      .expect(201);
    const childBody = bodyOf<{ id: string; parentId: string; status: string }>(
      child,
    );
    childCategoryId = childBody.id;
    expect(childBody).toEqual(
      expect.objectContaining({
        parentId: parentCategoryId,
        status: 'DISABLED',
      }),
    );

    await request(server)
      .patch(`/api/v1/admin/catalog/categories/${childCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parentId: childCategoryId })
      .expect(409)
      .expect((response) =>
        expect(bodyOf<{ code: string }>(response).code).toBe(
          'CATALOG_MASTER_CONFLICT',
        ),
      );
    await request(server)
      .post('/api/v1/admin/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Trùng slug', slug: ` AO-MOI-${suffix} ` })
      .expect(409);
  });

  it('supports brand, size and color create/update/status with safe projections', async () => {
    const brand = await request(server)
      .post('/api/v1/admin/catalog/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: ' Brand mới ',
        slug: `BRAND-MOI-${suffix}`,
        logoUrl: 'https://example.test/logo.png',
      })
      .expect(201);
    brandId = bodyOf<{ id: string; slug: string; status: string }>(brand).id;
    expect(bodyOf<{ id: string; slug: string; status: string }>(brand)).toEqual(
      expect.objectContaining({ slug: brandSlug, status: 'DISABLED' }),
    );

    const size = await request(server)
      .post('/api/v1/admin/catalog/sizes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: ` ${sizeCode.toLowerCase()} `,
        name: 'Size thử',
        sortOrder: 9,
      })
      .expect(201);
    sizeId = bodyOf<{ id: string; code: string }>(size).id;
    expect(bodyOf<{ id: string; code: string }>(size).code).toBe(sizeCode);

    const color = await request(server)
      .post('/api/v1/admin/catalog/colors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: ` ${colorCode.toLowerCase()} `,
        name: 'Màu thử',
        hexCode: '#abcDEF',
      })
      .expect(201);
    colorId = bodyOf<{ id: string; code: string; hexCode: string }>(color).id;
    expect(
      bodyOf<{ id: string; code: string; hexCode: string }>(color),
    ).toEqual(expect.objectContaining({ code: colorCode, hexCode: '#abcDEF' }));

    await request(server)
      .patch(`/api/v1/admin/catalog/brands/${brandId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Brand đã sửa' })
      .expect(200);
    await request(server)
      .patch(`/api/v1/admin/catalog/sizes/${sizeId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    await request(server)
      .patch(`/api/v1/admin/catalog/colors/${colorId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    const filtered = await request(server)
      .get('/api/v1/admin/catalog/sizes')
      .query({ q: sizeCode, status: 'ACTIVE' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      bodyOf<Array<{ id: string }>>(filtered).map(({ id }) => id),
    ).toContain(sizeId);
  });
});
