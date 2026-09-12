import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RefreshTokenService } from '../../src/common/security/refresh-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { PrismaAuthRepository } from '../../src/modules/auth/repositories/prisma-auth.repository';

describe('Auth refresh-session concurrency (database)', () => {
  const runId = randomUUID();
  const email = `refresh-concurrency-${runId}@auth-repository.test`;
  const prisma = new PrismaService(new ConfigService(process.env));
  const tokenService = new RefreshTokenService();
  const repository = new PrismaAuthRepository(prisma, tokenService);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('allows at most one concurrent rotation and revokes the family on replay', async () => {
    const user = await prisma.$transaction((transaction) =>
      repository.createCustomerUser(transaction, {
        email,
        passwordHash: 'refresh-concurrency-test-hash',
        fullName: 'Refresh Concurrency Test',
        phone: null,
      }),
    );
    const original = tokenService.generate();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + 86_400_000);
    await prisma.$transaction((transaction) =>
      repository.createRefreshSession(transaction, {
        id: original.selector,
        userId: user.id,
        familyId,
        tokenHash: original.digest,
        expiresAt,
        isPersistent: false,
      }),
    );

    const rotate = () => {
      const next = tokenService.generate();
      return prisma.$transaction((transaction) =>
        repository.rotateRefreshSession(transaction, {
          tokenId: original.selector,
          tokenDigest: original.digest,
          nextTokenId: next.selector,
          nextTokenHash: next.digest,
          now: new Date(),
          persistentInactivityMilliseconds: 7 * 86_400_000,
        }),
      );
    };

    const results = await Promise.all([rotate(), rotate()]);
    expect(results.map((result) => result.status).sort()).toEqual([
      'REPLAYED',
      'ROTATED',
    ]);

    const family = await prisma.refreshToken.findMany({
      where: { familyId },
      orderBy: { createdAt: 'asc' },
    });
    expect(family).toHaveLength(2);
    expect(family.every((session) => session.revokedAt !== null)).toBe(true);
    expect(family[1]).toEqual(
      expect.objectContaining({
        familyId,
        expiresAt,
        isPersistent: false,
      }),
    );
  });
});
