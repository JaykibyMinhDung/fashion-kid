import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../../src/common/security/access-token.service';
import { RefreshTokenService } from '../../src/common/security/refresh-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { createTestApplication } from '../test-app.factory';

describe('Admin users API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let adminId: string;
  let targetId: string;
  let adminToken: string;
  let targetToken: string;
  const runId = randomUUID();
  const emails = {
    admin: `admin-users-admin-${runId}@admin-users.test`,
    target: `admin-users-target-${runId}@admin-users.test`,
    sales: `admin-users-sales-${runId}@admin-users.test`,
  };

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
    const [adminRole, customerRole, salesRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'SALES_STAFF' } }),
    ]);
    const [admin, target] = await Promise.all([
      prisma.user.create({
        data: {
          roleId: adminRole.id,
          email: emails.admin,
          passwordHash: 'admin-users-admin-password-hash',
          fullName: 'Admin Users Admin',
        },
      }),
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: emails.target,
          passwordHash: 'admin-users-target-password-hash',
          fullName: 'Admin Users Target',
          phone: '+84901234567',
        },
      }),
      prisma.user.create({
        data: {
          roleId: salesRole.id,
          email: emails.sales,
          passwordHash: 'admin-users-sales-password-hash',
          fullName: 'Admin Users Sales',
        },
      }),
    ]);
    adminId = admin.id;
    targetId = target.id;
    const accessTokens = app.get(AccessTokenService);
    [adminToken, targetToken] = await Promise.all([
      accessTokens.sign(admin.id, 'ADMIN'),
      accessTokens.sign(target.id, 'CUSTOMER'),
    ]);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: [adminId, targetId] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('enforces admin permission and returns a paginated safe projection', async () => {
    await request(server).get('/api/v1/admin/users').expect(401);
    await request(server)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${targetToken}`)
      .expect(403);

    const response = await request(server)
      .get('/api/v1/admin/users')
      .query({ q: emails.target, limit: 1, sort: 'email:asc' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      items: Array<Record<string, unknown>>;
    };
    expect(body).toEqual(
      expect.objectContaining({ page: 1, limit: 1, total: 1, totalPages: 1 }),
    );
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        id: targetId,
        email: emails.target,
        fullName: 'Admin Users Target',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      }),
    );
    expect(body.items[0]).not.toHaveProperty('passwordHash');
    expect(body.items[0]).not.toHaveProperty('refreshTokens');
  });

  it('supports safe detail reads and rejects invalid list input', async () => {
    const detail = await request(server)
      .get(`/api/v1/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const detailBody = detail.body as Record<string, unknown>;
    expect(detailBody).toEqual(
      expect.objectContaining({ id: targetId, email: emails.target }),
    );
    expect(detailBody).not.toHaveProperty('passwordHash');

    await request(server)
      .get('/api/v1/admin/users')
      .query({ role: 'NOT_A_ROLE' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    await request(server)
      .get(`/api/v1/admin/users/${randomUUID()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('disables and enables a user atomically with session revocation and audit', async () => {
    const refresh = app.get(RefreshTokenService).generate();
    await prisma.refreshToken.create({
      data: {
        id: refresh.selector,
        userId: targetId,
        tokenHash: refresh.digest,
        expiresAt: new Date(Date.now() + 86_400_000),
        isPersistent: false,
      },
    });

    const disabled = await request(server)
      .patch(`/api/v1/admin/users/${targetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISABLED' })
      .expect(200);
    const disabledBody = disabled.body as Record<string, unknown>;
    expect(disabledBody).toEqual(
      expect.objectContaining({ id: targetId, status: 'DISABLED' }),
    );
    const revokedStatusSession = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: refresh.selector },
    });
    expect(revokedStatusSession.revokedAt).not.toBeNull();
    await expect(
      prisma.auditLog.findFirst({
        where: { entityId: targetId, action: 'USER_DISABLED' },
        orderBy: { createdAt: 'desc' },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        actorId: adminId,
        oldValues: { status: 'ACTIVE' },
        newValues: { status: 'DISABLED' },
      }),
    );
    await request(server)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${targetToken}`)
      .expect(401);

    await request(server)
      .patch(`/api/v1/admin/users/${targetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    await expect(
      prisma.auditLog.findFirst({
        where: { entityId: targetId, action: 'USER_ENABLED' },
        orderBy: { createdAt: 'desc' },
      }),
    ).resolves.toEqual(expect.objectContaining({ actorId: adminId }));
  });

  it('changes roles with session revocation and protects self mutations', async () => {
    const refresh = app.get(RefreshTokenService).generate();
    await prisma.refreshToken.create({
      data: {
        id: refresh.selector,
        userId: targetId,
        tokenHash: refresh.digest,
        expiresAt: new Date(Date.now() + 86_400_000),
        isPersistent: false,
      },
    });

    const changed = await request(server)
      .patch(`/api/v1/admin/users/${targetId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SALES_STAFF' })
      .expect(200);
    const changedBody = changed.body as Record<string, unknown>;
    expect(changedBody).toEqual(
      expect.objectContaining({ id: targetId, role: 'SALES_STAFF' }),
    );
    const revokedRoleSession = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: refresh.selector },
    });
    expect(revokedRoleSession.revokedAt).not.toBeNull();
    await expect(
      prisma.auditLog.findFirst({
        where: { entityId: targetId, action: 'USER_ROLE_CHANGED' },
        orderBy: { createdAt: 'desc' },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        actorId: adminId,
        oldValues: { role: 'CUSTOMER' },
        newValues: { role: 'SALES_STAFF' },
      }),
    );

    await request(server)
      .patch(`/api/v1/admin/users/${targetId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SALES_STAFF' })
      .expect(409);
    await request(server)
      .patch(`/api/v1/admin/users/${adminId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISABLED' })
      .expect(409);
    await request(server)
      .patch(`/api/v1/admin/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'CUSTOMER' })
      .expect(409);
  });

  it('publishes all admin-user operations in the versioned API docs', async () => {
    const response = await request(server).get('/api/docs-json').expect(200);
    const document = response.body as { paths?: Record<string, unknown> };
    expect(document.paths).toHaveProperty('/api/v1/admin/users');
    expect(document.paths).toHaveProperty('/api/v1/admin/users/{id}');
    expect(document.paths).toHaveProperty('/api/v1/admin/users/{id}/status');
    expect(document.paths).toHaveProperty('/api/v1/admin/users/{id}/role');
  });
});
