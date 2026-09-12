import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AccessTokenService } from '../../src/common/security/access-token.service';
import {
  PasswordHasher,
  verifyPassword,
} from '../../src/common/security/password-hasher';
import { PasswordPolicy } from '../../src/common/security/password-policy';
import { RefreshTokenService } from '../../src/common/security/refresh-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PrismaAuthRepository } from '../../src/modules/auth/repositories/prisma-auth.repository';

describe('Auth database invariants', () => {
  const runId = randomUUID();
  const email = `auth-constraints-${runId}@auth-database.test`;
  const rollbackEmail = `auth-rollback-${runId}@auth-database.test`;
  const oldPassword = 'an original database auth passphrase';
  const newPassword = 'a replacement database auth passphrase';
  const prisma = new PrismaService(new ConfigService(process.env));
  const passwordHasher = new PasswordHasher();
  const refreshTokenService = new RefreshTokenService();
  const repository = new PrismaAuthRepository(prisma, refreshTokenService);
  const configService = new ConfigService({
    JWT_ACCESS_SECRET: 'database-test-secret-with-at-least-32-random-bytes',
    JWT_ISSUER: 'kids-fashion-api-test',
    JWT_AUDIENCE: 'kids-fashion-web-test',
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_HOURS: 24,
    REMEMBER_REFRESH_TOKEN_TTL_DAYS: 30,
    REMEMBER_REFRESH_INACTIVITY_DAYS: 7,
  });
  const service = new AuthService(
    prisma,
    repository,
    passwordHasher,
    new PasswordPolicy(),
    refreshTokenService,
    new AccessTokenService(new JwtService(), configService),
    configService,
  );

  beforeAll(async () => {
    await prisma.$connect();
    await service.onModuleInit();
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [email, rollbackEmail] } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: users.map((user) => user.id) } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [email, rollbackEmail] } },
    });
    await prisma.$disconnect();
  });

  it('revokes an expired family and never creates its next token', async () => {
    const passwordHash = await passwordHasher.hash(oldPassword);
    const user = await prisma.$transaction((transaction) =>
      repository.createCustomerUser(transaction, {
        email,
        passwordHash,
        fullName: 'Auth Constraint User',
        phone: null,
      }),
    );
    const expired = refreshTokenService.generate();
    const next = refreshTokenService.generate();
    const familyId = randomUUID();
    await prisma.refreshToken.create({
      data: {
        id: expired.selector,
        userId: user.id,
        familyId,
        tokenHash: expired.digest,
        expiresAt: new Date(Date.now() - 1_000),
        isPersistent: false,
      },
    });

    const result = await prisma.$transaction((transaction) =>
      repository.rotateRefreshSession(transaction, {
        tokenId: expired.selector,
        tokenDigest: expired.digest,
        nextTokenId: next.selector,
        nextTokenHash: next.digest,
        now: new Date(),
        persistentInactivityMilliseconds: 7 * 86_400_000,
      }),
    );

    expect(result).toEqual({ status: 'EXPIRED' });
    await expect(
      prisma.refreshToken.findUnique({ where: { id: next.selector } }),
    ).resolves.toBeNull();
    const storedExpired = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: expired.selector },
    });
    expect(storedExpired.revokedAt).not.toBeNull();

    const activeSession = refreshTokenService.generate();
    await prisma.refreshToken.create({
      data: {
        id: activeSession.selector,
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: activeSession.digest,
        expiresAt: new Date(Date.now() + 86_400_000),
        isPersistent: false,
      },
    });
    await service.changePassword(user.id, oldPassword, newPassword, {
      requestId: `password-change-${runId}`,
    });

    const changedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    await expect(
      verifyPassword(changedUser.passwordHash, newPassword),
    ).resolves.toBe(true);
    expect(changedUser.authVersion).toBe(1);
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    });
    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
    await expect(
      prisma.auditLog.count({
        where: { entityId: user.id, action: 'AUTH_PASSWORD_CHANGED' },
      }),
    ).resolves.toBe(1);
  });

  it('rolls back password and revocation when the audit write fails', async () => {
    const passwordHash = await passwordHasher.hash(oldPassword);
    const user = await prisma.$transaction((transaction) =>
      repository.createCustomerUser(transaction, {
        email: rollbackEmail,
        passwordHash,
        fullName: 'Auth Rollback User',
        phone: null,
      }),
    );
    const session = refreshTokenService.generate();
    await prisma.refreshToken.create({
      data: {
        id: session.selector,
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: session.digest,
        expiresAt: new Date(Date.now() + 86_400_000),
        isPersistent: false,
      },
    });
    const auditSpy = jest
      .spyOn(repository, 'createAuditLog')
      .mockRejectedValueOnce(new Error('forced audit failure'));

    await expect(
      service.changePassword(user.id, oldPassword, newPassword, {}),
    ).rejects.toThrow('forced audit failure');
    auditSpy.mockRestore();

    const unchangedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    await expect(
      verifyPassword(unchangedUser.passwordHash, oldPassword),
    ).resolves.toBe(true);
    expect(unchangedUser.authVersion).toBe(0);
    const unchangedSession = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: session.selector },
    });
    expect(unchangedSession.revokedAt).toBeNull();
  });
});
