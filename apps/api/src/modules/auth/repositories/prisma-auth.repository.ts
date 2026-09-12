import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import { RefreshTokenService } from '../../../common/security/refresh-token.service';
import {
  AuthUserRecord,
  isRoleCode,
  LockedRefreshSession,
} from '../auth.types';
import {
  AuthRepository,
  CreateAuthAuditInput,
  CreateCustomerUserInput,
  CreateRefreshSessionInput,
  RotateRefreshSessionInput,
  RotateRefreshSessionResult,
} from './auth.repository';

const AUTH_USER_SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  authVersion: true,
  role: { select: { code: true } },
} satisfies Prisma.UserSelect;

type AuthUserRow = Prisma.UserGetPayload<{ select: typeof AUTH_USER_SELECT }>;

type LockedAuthUserRow = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'DISABLED';
  authVersion: number;
  role: string;
};

type LockedRefreshSessionRow = {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  isPersistent: boolean;
  createdAt: Date;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'DISABLED';
  authVersion: number;
  role: string;
};

function mapAuthUser(row: AuthUserRow): AuthUserRecord {
  if (!isRoleCode(row.role.code)) {
    throw new Error('Unsupported role code in authentication data');
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    fullName: row.fullName,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    status: row.status,
    authVersion: row.authVersion,
    role: row.role.code,
  };
}

function boundOptional(value: string | undefined, maximum: number) {
  return value ? value.slice(0, maximum) : undefined;
}

@Injectable()
export class PrismaAuthRepository extends AuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {
    super();
  }

  async findUserByCanonicalEmail(
    canonicalEmail: string,
  ): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: canonicalEmail },
      select: AUTH_USER_SELECT,
    });

    return user ? mapAuthUser(user) : null;
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });

    return user ? mapAuthUser(user) : null;
  }

  async findUserByIdInTransaction(
    transaction: PrismaTransactionClient,
    userId: string,
  ): Promise<AuthUserRecord | null> {
    const rows = await transaction.$queryRaw<LockedAuthUserRow[]>`
      SELECT
        u."id",
        u."email",
        u."password_hash" AS "passwordHash",
        u."full_name" AS "fullName",
        u."phone",
        u."avatar_url" AS "avatarUrl",
        u."status",
        u."auth_version" AS "authVersion",
        r."code" AS "role"
      FROM "users" u
      INNER JOIN "roles" r ON r."id" = u."role_id"
      WHERE u."id" = ${userId}::uuid
      FOR UPDATE OF u
    `;
    const user = rows[0];
    if (!user) {
      return null;
    }
    const role = user.role;
    if (!isRoleCode(role)) {
      throw new Error('Unsupported role code in authentication data');
    }

    return { ...user, role };
  }

  async createCustomerUser(
    transaction: PrismaTransactionClient,
    input: CreateCustomerUserInput,
  ): Promise<AuthUserRecord> {
    const customerRole = await transaction.role.findUnique({
      where: { code: 'CUSTOMER' },
      select: { id: true },
    });
    if (!customerRole) {
      throw new Error('CUSTOMER role is not configured');
    }

    const user = await transaction.user.create({
      data: {
        roleId: customerRole.id,
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        phone: input.phone,
      },
      select: AUTH_USER_SELECT,
    });

    return mapAuthUser(user);
  }

  async createRefreshSession(
    transaction: PrismaTransactionClient,
    input: CreateRefreshSessionInput,
  ): Promise<void> {
    await transaction.refreshToken.create({ data: input });
  }

  async lockRefreshSession(
    transaction: PrismaTransactionClient,
    tokenId: string,
  ): Promise<LockedRefreshSession | null> {
    const rows = await transaction.$queryRaw<LockedRefreshSessionRow[]>`
      SELECT
        rt."id",
        rt."user_id" AS "userId",
        rt."family_id" AS "familyId",
        rt."token_hash" AS "tokenHash",
        rt."expires_at" AS "expiresAt",
        rt."revoked_at" AS "revokedAt",
        rt."is_persistent" AS "isPersistent",
        rt."created_at" AS "createdAt",
        u."email",
        u."password_hash" AS "passwordHash",
        u."full_name" AS "fullName",
        u."phone",
        u."avatar_url" AS "avatarUrl",
        u."status",
        u."auth_version" AS "authVersion",
        r."code" AS "role"
      FROM "refresh_tokens" rt
      INNER JOIN "users" u ON u."id" = rt."user_id"
      INNER JOIN "roles" r ON r."id" = u."role_id"
      WHERE rt."id" = ${tokenId}::uuid
      FOR UPDATE OF rt
    `;
    const row = rows[0];
    if (!row) {
      return null;
    }
    if (!isRoleCode(row.role)) {
      throw new Error('Unsupported role code in authentication data');
    }

    return {
      id: row.id,
      userId: row.userId,
      familyId: row.familyId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      isPersistent: row.isPersistent,
      createdAt: row.createdAt,
      user: {
        id: row.userId,
        email: row.email,
        passwordHash: row.passwordHash,
        fullName: row.fullName,
        phone: row.phone,
        avatarUrl: row.avatarUrl,
        status: row.status,
        authVersion: row.authVersion,
        role: row.role,
      },
    };
  }

  async rotateRefreshSession(
    transaction: PrismaTransactionClient,
    input: RotateRefreshSessionInput,
  ): Promise<RotateRefreshSessionResult> {
    const current = await this.lockRefreshSession(transaction, input.tokenId);
    if (
      !current ||
      !this.refreshTokenService.matchesDigest(
        input.tokenDigest,
        current.tokenHash,
      )
    ) {
      return { status: 'INVALID' };
    }

    if (current.revokedAt) {
      await this.revokeRefreshFamily(transaction, current.familyId, input.now);
      return {
        status: 'REPLAYED',
        familyId: current.familyId,
        userId: current.userId,
      };
    }

    if (current.expiresAt.getTime() <= input.now.getTime()) {
      await this.revokeRefreshFamily(transaction, current.familyId, input.now);
      return { status: 'EXPIRED' };
    }

    if (
      current.isPersistent &&
      input.now.getTime() - current.createdAt.getTime() >=
        input.persistentInactivityMilliseconds
    ) {
      await this.revokeRefreshFamily(transaction, current.familyId, input.now);
      return { status: 'INACTIVE' };
    }

    if (current.user.status !== 'ACTIVE') {
      await this.revokeAllUserRefreshSessions(
        transaction,
        current.userId,
        input.now,
      );
      return { status: 'USER_DISABLED' };
    }

    await this.revokeRefreshSession(transaction, current.id, input.now);
    await this.createRefreshSession(transaction, {
      id: input.nextTokenId,
      userId: current.userId,
      familyId: current.familyId,
      tokenHash: input.nextTokenHash,
      expiresAt: current.expiresAt,
      isPersistent: current.isPersistent,
    });

    return {
      status: 'ROTATED',
      familyId: current.familyId,
      expiresAt: current.expiresAt,
      isPersistent: current.isPersistent,
      user: current.user,
    };
  }

  async revokeRefreshSession(
    transaction: PrismaTransactionClient,
    tokenId: string,
    revokedAt: Date,
  ): Promise<void> {
    await transaction.refreshToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async revokeRefreshFamily(
    transaction: PrismaTransactionClient,
    familyId: string,
    revokedAt: Date,
  ): Promise<number> {
    const result = await transaction.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count;
  }

  async revokeAllUserRefreshSessions(
    transaction: PrismaTransactionClient,
    userId: string,
    revokedAt: Date,
  ): Promise<number> {
    const result = await transaction.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count;
  }

  async updateLastLoginAt(
    transaction: PrismaTransactionClient,
    userId: string,
    lastLoginAt: Date,
  ): Promise<void> {
    await transaction.user.update({
      where: { id: userId },
      data: { lastLoginAt },
    });
  }

  async updatePasswordHash(
    transaction: PrismaTransactionClient,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await transaction.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async incrementAuthVersion(
    transaction: PrismaTransactionClient,
    userId: string,
  ): Promise<void> {
    await transaction.user.update({
      where: { id: userId },
      data: { authVersion: { increment: 1 } },
    });
  }

  async createAuditLog(
    transaction: PrismaTransactionClient,
    input: CreateAuthAuditInput,
  ): Promise<void> {
    const userAgent = boundOptional(input.context.userAgent, 512);
    const metadata: Prisma.InputJsonObject = {
      ...(userAgent ? { userAgent } : {}),
      ...(input.failureReason ? { failureReason: input.failureReason } : {}),
    };

    await transaction.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: 'AUTH_SESSION',
        entityId: input.entityId,
        ipAddress: boundOptional(input.context.ipAddress, 64),
        requestId: boundOptional(input.context.requestId, 100),
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
    });
  }
}
