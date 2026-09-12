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

describe('Admin Catalog activation API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let adminToken: string;
  let customerToken: string;
  let coralProductId: string;
  let disabledProductId: string;

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
    const [admin, customer, coral, disabled] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { email: 'admin@mam-nho.local' },
      }),
      prisma.user.findUniqueOrThrow({
        where: { email: 'customer@mam-nho.local' },
      }),
      prisma.product.findUniqueOrThrow({
        where: { slug: 'set-ao-khoac-coral' },
      }),
      prisma.product.findUniqueOrThrow({
        where: { slug: 'romper-muslin-apricot' },
      }),
    ]);
    coralProductId = coral.id;
    disabledProductId = disabled.id;
    const accessTokens = app.get(AccessTokenService);
    [adminToken, customerToken] = await Promise.all([
      accessTokens.sign(admin.id, 'ADMIN'),
      accessTokens.sign(customer.id, 'CUSTOMER'),
    ]);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: [coralProductId, disabledProductId] } },
    });
    await app.close();
  });

  it('enforces CATALOG_MANAGE and activation preconditions', async () => {
    await request(server)
      .patch(`/api/v1/admin/products/${disabledProductId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'ACTIVE' })
      .expect(403);

    const blocked = await request(server)
      .patch(`/api/v1/admin/products/${disabledProductId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(409);
    expect(blocked.body).toEqual(
      expect.objectContaining({ code: 'CATALOG_ACTIVATION_BLOCKED' }),
    );
    await expect(
      prisma.product.findUniqueOrThrow({ where: { id: disabledProductId } }),
    ).resolves.toEqual(expect.objectContaining({ status: 'DISABLED' }));
  });

  it('disables and re-enables a product atomically with audit', async () => {
    const disabled = await request(server)
      .patch(`/api/v1/admin/products/${coralProductId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISABLED' })
      .expect(200);
    expect(disabled.body).toEqual(
      expect.objectContaining({ id: coralProductId, status: 'DISABLED' }),
    );
    await request(server)
      .get('/api/v1/products/set-ao-khoac-coral')
      .expect(404);
    const disableAudit = await prisma.auditLog.findFirst({
      where: { entityId: coralProductId, action: 'PRODUCT_DISABLED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(disableAudit?.actorId).toBeTruthy();

    const enabled = await request(server)
      .patch(`/api/v1/admin/products/${coralProductId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(enabled.body).toEqual(
      expect.objectContaining({ id: coralProductId, status: 'ACTIVE' }),
    );
    await request(server)
      .get('/api/v1/products/set-ao-khoac-coral')
      .expect(200);
  });

  it('returns stable errors for invalid status and unknown product', async () => {
    await request(server)
      .patch(`/api/v1/admin/products/${coralProductId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(409)
      .expect((response) =>
        expect(bodyOf<unknown>(response)).toEqual(
          expect.objectContaining({ code: 'PRODUCT_STATUS_UNCHANGED' }),
        ),
      );
    await request(server)
      .patch(`/api/v1/admin/products/${randomUUID()}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISABLED' })
      .expect(404);
    await request(server)
      .patch(`/api/v1/admin/products/${coralProductId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVALID' })
      .expect(400);
  });
});
