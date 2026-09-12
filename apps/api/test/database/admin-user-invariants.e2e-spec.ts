import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RefreshTokenService } from '../../src/common/security/refresh-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import {
  AdminUserConflictError,
  PrismaAdminUserRepository,
} from '../../src/modules/users/repositories/prisma-admin-user.repository';

describe('Admin user database invariants', () => {
  const runId = randomUUID();
  const adminEmail = `admin-user-invariant-admin-${runId}@db.test`;
  const targetEmail = `admin-user-invariant-target-${runId}@db.test`;
  const prisma = new PrismaService(new ConfigService(process.env));
  const repository = new PrismaAdminUserRepository(prisma);
  const refreshTokenService = new RefreshTokenService();
  let adminId: string;
  let targetId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const [adminRole, customerRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
    ]);
    const [admin, target] = await Promise.all([
      prisma.user.create({
        data: {
          roleId: adminRole.id,
          email: adminEmail,
          passwordHash: 'admin-user-invariant-admin-hash',
          fullName: 'Admin Invariant Admin',
        },
      }),
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: targetEmail,
          passwordHash: 'admin-user-invariant-target-hash',
          fullName: 'Admin Invariant Target',
        },
      }),
    ]);
    adminId = admin.id;
    targetId = target.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: targetId } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, targetEmail] } },
    });
    await prisma.$disconnect();
  });

  it('commits status, refresh revocation and audit as one transaction', async () => {
    const generated = refreshTokenService.generate();
    await prisma.refreshToken.create({
      data: {
        id: generated.selector,
        userId: targetId,
        tokenHash: generated.digest,
        expiresAt: new Date(Date.now() + 86_400_000),
        isPersistent: false,
      },
    });

    await expect(
      repository.updateStatus(adminId, targetId, 'DISABLED'),
    ).resolves.toEqual(expect.objectContaining({ status: 'DISABLED' }));
    const session = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: generated.selector },
    });
    expect(session.revokedAt).not.toBeNull();
    await expect(
      prisma.auditLog.findFirst({
        where: { entityId: targetId, action: 'USER_DISABLED' },
        orderBy: { createdAt: 'desc' },
      }),
    ).resolves.toEqual(expect.objectContaining({ actorId: adminId }));
  });

  it('audits enable and role changes while revoking prior sessions', async () => {
    await expect(
      repository.updateStatus(adminId, targetId, 'ACTIVE'),
    ).resolves.toEqual(expect.objectContaining({ status: 'ACTIVE' }));

    const generated = refreshTokenService.generate();
    await prisma.refreshToken.create({
      data: {
        id: generated.selector,
        userId: targetId,
        tokenHash: generated.digest,
        expiresAt: new Date(Date.now() + 86_400_000),
        isPersistent: false,
      },
    });
    await expect(
      repository.updateRole(adminId, targetId, 'SALES_STAFF'),
    ).resolves.toEqual(
      expect.objectContaining({ role: 'SALES_STAFF', status: 'ACTIVE' }),
    );
    const session = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: generated.selector },
    });
    expect(session.revokedAt).not.toBeNull();
    await expect(
      prisma.auditLog.findFirst({
        where: { entityId: targetId, action: 'USER_ROLE_CHANGED' },
        orderBy: { createdAt: 'desc' },
      }),
    ).resolves.toEqual(expect.objectContaining({ actorId: adminId }));
  });

  it('rejects same-state status mutations without creating another audit', async () => {
    const before = await prisma.auditLog.count({
      where: { entityId: targetId, action: 'USER_ALREADY_ACTIVE' },
    });
    await expect(
      repository.updateStatus(adminId, targetId, 'ACTIVE'),
    ).rejects.toEqual(expect.any(AdminUserConflictError));
    await expect(
      prisma.auditLog.count({
        where: { entityId: targetId, action: 'USER_ALREADY_ACTIVE' },
      }),
    ).resolves.toBe(before);
  });
});
