import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { createTestApplication } from '../test-app.factory';

type ProductListBody = {
  items: Array<{
    slug: string;
    minPrice: string;
    maxPrice: string;
    primaryImage?: unknown;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
type ProductDetailBody = {
  slug: string;
  description: string | null;
  minPrice: string;
  maxPrice: string;
  variants: Array<{ sku: string; price: string }>;
};
type ApiErrorBody = { code: string };

function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Public Catalog API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists only public sellable products with decimal-string money', async () => {
    const response = await request(server)
      .get('/api/v1/products')
      .query({ sort: 'price_asc' })
      .expect(200);

    const body = bodyOf<ProductListBody>(response);
    expect(body).toEqual(
      expect.objectContaining({ page: 1, limit: 20, total: 2, totalPages: 1 }),
    );
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        slug: 'set-so-mi-sage',
        minPrice: '289000',
        maxPrice: '289000',
      }),
    );
    expect(typeof body.items[0].minPrice).toBe('string');
    expect(body.items[0]).not.toHaveProperty('variants');
    expect(body.items[0]).not.toHaveProperty('status');
    expect(body.items[0].primaryImage).toEqual(
      expect.objectContaining({ isPrimary: true }),
    );
  });

  it('applies AND filters to the same active variant and rejects unsafe prices', async () => {
    await request(server)
      .get('/api/v1/products')
      .query({
        size: '90',
        color: 'CORAL',
        minPrice: '349000',
        maxPrice: '349000',
      })
      .expect(200)
      .expect((response) => {
        const body = bodyOf<ProductListBody>(response);
        expect(body.total).toBe(1);
        expect(body.items[0].slug).toBe('set-ao-khoac-coral');
      });

    await request(server)
      .get('/api/v1/products')
      .query({ size: '90', color: 'SAGE' })
      .expect(200)
      .expect((response) =>
        expect(bodyOf<ProductListBody>(response).total).toBe(0),
      );

    for (const minPrice of [
      '349000.00',
      '0349000',
      '-1',
      '1e5',
      '9223372036854775808',
    ]) {
      await request(server)
        .get('/api/v1/products')
        .query({ minPrice })
        .expect(400)
        .expect((response) =>
          expect(bodyOf<ApiErrorBody>(response).code).toBe('VALIDATION_ERROR'),
        );
    }
  });

  it('returns safe product detail and hides disabled product', async () => {
    const response = await request(server)
      .get('/api/v1/products/set-ao-khoac-coral')
      .expect(200);
    const body = bodyOf<ProductDetailBody>(response);
    expect(body).toEqual(
      expect.objectContaining({
        slug: 'set-ao-khoac-coral',
        description: null,
        minPrice: '349000',
        maxPrice: '349000',
      }),
    );
    expect(body.variants[0]).toEqual(
      expect.objectContaining({ sku: 'MAM-CORAL-90', price: '349000' }),
    );
    expect(body.variants[0]).not.toHaveProperty('weightGrams');
    expect(body).not.toHaveProperty('status');

    await request(server)
      .get('/api/v1/products/romper-muslin-apricot')
      .expect(404)
      .expect((response) =>
        expect(bodyOf<ApiErrorBody>(response)).toEqual(
          expect.objectContaining({ code: 'NOT_FOUND' }),
        ),
      );
  });

  it('exposes active filter metadata without internal fields', async () => {
    const [categories, brands, sizes, colors] = await Promise.all([
      request(server).get('/api/v1/categories').expect(200),
      request(server).get('/api/v1/brands').expect(200),
      request(server).get('/api/v1/sizes').expect(200),
      request(server).get('/api/v1/colors').expect(200),
    ]);

    const categoryBody = bodyOf<unknown[]>(categories);
    const brandBody = bodyOf<unknown[]>(brands);
    const sizeBody = bodyOf<Array<Record<string, unknown>>>(sizes);
    const colorBody = bodyOf<Array<Record<string, unknown>>>(colors);
    expect(categoryBody).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: 'be-trai' })]),
    );
    expect(brandBody).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: 'mam-nho' })]),
    );
    expect(sizeBody[0]).not.toHaveProperty('status');
    expect(colorBody[0]).not.toHaveProperty('status');
    await expect(
      prisma.product.count({ where: { status: 'ACTIVE' } }),
    ).resolves.toBe(2);
  });
});
