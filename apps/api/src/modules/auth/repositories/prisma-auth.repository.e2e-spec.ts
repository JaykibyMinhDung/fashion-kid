import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RefreshTokenService } from '../../../common/security/refresh-token.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PrismaAuthRepository } from './prisma-auth.repository';

describe('PrismaAuthRepository (database)', () => {
  const runId = randomUUID();
  const email = `repository-${runId}@auth-repository.test`;
  const duplicateEmail = `duplicate-${runId}@auth-repository.test`;
  const requestId = `auth-repository-${runId}`;
  const prisma = new PrismaService(new ConfigService(process.env));
  const repository = new PrismaAuthRepository(
    prisma,
    new RefreshTokenService(),
  );

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { requestId } });
    await prisma.user.deleteMany({
      where: { email: { in: [email, duplicateEmail] } },
    });
    await prisma.$disconnect();
  });

  it('creates a public registration only with the CUSTOMER role', async () => {
    const user = await prisma.$transaction((transaction) =>
      repository.createCustomerUser(transaction, {
        email,
        passwordHash: 'test-hash-not-a-credential',
        fullName: 'Repository Test User',
        phone: null,
      }),
    );

    expect(user).toEqual(
      expect.objectContaining({ email, role: 'CUSTOMER', status: 'ACTIVE' }),
    );
    await expect(repository.findUserByCanonicalEmail(email)).resolves.toEqual(
      user,
    );
  });

  it('lets the canonical unique constraint reject duplicate registration', async () => {
    await prisma.$transaction((transaction) =>
      repository.createCustomerUser(transaction, {
        email: duplicateEmail,
        passwordHash: 'first-test-hash',
        fullName: 'First Duplicate User',
        phone: null,
      }),
    );

    await expect(
      prisma.$transaction((transaction) =>
        repository.createCustomerUser(transaction, {
          email: duplicateEmail,
          passwordHash: 'second-test-hash',
          fullName: 'Second Duplicate User',
          phone: null,
        }),
      ),
    ).rejects.toThrow();
  });

  it('persists only the allowlisted authentication audit metadata', async () => {
    const user = await repository.findUserByCanonicalEmail(email);
    if (!user) {
      throw new Error('Repository test user was not created');
    }

    await prisma.$transaction((transaction) =>
      repository.createAuditLog(transaction, {
        action: 'AUTH_LOGIN_FAILED',
        actorId: user.id,
        entityId: user.id,
        context: {
          ipAddress: '127.0.0.1',
          requestId,
          userAgent: 'repository-test-agent',
        },
        failureReason: 'INVALID_CREDENTIALS',
      }),
    );

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { requestId },
    });
    expect(audit).toEqual(
      expect.objectContaining({
        action: 'AUTH_LOGIN_FAILED',
        actorId: user.id,
        entityId: user.id,
        ipAddress: '127.0.0.1',
        oldValues: null,
        newValues: null,
        metadata: {
          userAgent: 'repository-test-agent',
          failureReason: 'INVALID_CREDENTIALS',
        },
      }),
    );
    expect(JSON.stringify(audit)).not.toContain('password');
    expect(JSON.stringify(audit)).not.toContain(email);
  });
});
