import { Injectable } from '@nestjs/common';
import type { Prisma, UserStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type { RoleCode } from '../../auth/auth.types';
import type {
  AdminUserSort,
  ListAdminUsersQueryDto,
} from '../dto/admin-user.dto';

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { code: true } },
} satisfies Prisma.UserSelect;

type AdminUserRow = Prisma.UserGetPayload<{
  select: typeof ADMIN_USER_SELECT;
}>;

export type AdminUserRecord = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: RoleCode;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type AdminUserListResult = {
  items: AdminUserRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminUserConflictReason =
  | 'CANNOT_DISABLE_SELF'
  | 'CANNOT_MODIFY_SELF_ROLE'
  | 'LAST_ADMIN_PROTECTION'
  | 'USER_ALREADY_ACTIVE'
  | 'USER_ALREADY_DISABLED'
  | 'ROLE_UNCHANGED';

export class AdminUserNotFoundError extends Error {}
export class AdminUserInvalidRoleError extends Error {}
export class AdminUserConflictError extends Error {
  constructor(readonly reason: AdminUserConflictReason) {
    super(reason);
  }
}

type LockedAdminUserRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  role: string;
};

function mapAdminUser(row: AdminUserRow | LockedAdminUserRow): AdminUserRecord {
  const role = typeof row.role === 'string' ? row.role : row.role.code;
  if (
    role !== 'CUSTOMER' &&
    role !== 'SALES_STAFF' &&
    role !== 'WAREHOUSE_STAFF' &&
    role !== 'ADMIN'
  ) {
    throw new Error('Unsupported role code in admin user data');
  }

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    role,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}

function orderByFor(
  sort: AdminUserSort,
): Prisma.UserOrderByWithRelationInput[] {
  const [field, direction] = sort.split(':') as [
    'createdAt' | 'fullName' | 'email' | 'lastLoginAt',
    'asc' | 'desc',
  ];
  return [{ [field]: direction }, { id: 'desc' }];
}

@Injectable()
export class PrismaAdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAdminUsersQueryDto): Promise<AdminUserListResult> {
    const normalizedQuery = query.q?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: { code: query.role } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { email: { contains: normalizedQuery, mode: 'insensitive' } },
              { fullName: { contains: normalizedQuery, mode: 'insensitive' } },
              { phone: { contains: normalizedQuery, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: orderByFor(query.sort),
        select: ADMIN_USER_SELECT,
      }),
    ]);

    return {
      items: rows.map(mapAdminUser),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async findById(userId: string): Promise<AdminUserRecord | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ADMIN_USER_SELECT,
    });
    return row ? mapAdminUser(row) : null;
  }

  async updateStatus(
    actorId: string,
    userId: string,
    status: UserStatus,
  ): Promise<AdminUserRecord> {
    return this.prisma.$transaction(async (transaction) => {
      // Serialize all protected-admin mutations in a deterministic lock order.
      const activeAdmins = await this.lockActiveAdmins(transaction);
      const current = await this.lockUser(transaction, userId);
      if (!current) {
        throw new AdminUserNotFoundError();
      }
      if (actorId === userId && status === 'DISABLED') {
        throw new AdminUserConflictError('CANNOT_DISABLE_SELF');
      }
      if (current.status === status) {
        throw new AdminUserConflictError(
          status === 'ACTIVE' ? 'USER_ALREADY_ACTIVE' : 'USER_ALREADY_DISABLED',
        );
      }

      if (current.role === 'ADMIN' && status === 'DISABLED') {
        if (activeAdmins.length <= 1) {
          throw new AdminUserConflictError('LAST_ADMIN_PROTECTION');
        }
      }

      await transaction.user.update({
        where: { id: userId },
        data: { status },
      });
      if (status === 'DISABLED') {
        await transaction.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId,
          action: status === 'DISABLED' ? 'USER_DISABLED' : 'USER_ENABLED',
          entityType: 'USER',
          entityId: userId,
          oldValues: { status: current.status },
          newValues: { status },
        },
      });

      return mapAdminUser(
        await transaction.user.findUniqueOrThrow({
          where: { id: userId },
          select: ADMIN_USER_SELECT,
        }),
      );
    });
  }

  async updateRole(
    actorId: string,
    userId: string,
    role: RoleCode,
  ): Promise<AdminUserRecord> {
    return this.prisma.$transaction(async (transaction) => {
      // Keep the same lock order as status changes to avoid admin races.
      const activeAdmins = await this.lockActiveAdmins(transaction);
      const current = await this.lockUser(transaction, userId);
      if (!current) {
        throw new AdminUserNotFoundError();
      }
      if (actorId === userId) {
        throw new AdminUserConflictError('CANNOT_MODIFY_SELF_ROLE');
      }
      if (current.role === role) {
        throw new AdminUserConflictError('ROLE_UNCHANGED');
      }

      const targetRole = await transaction.role.findUnique({
        where: { code: role },
        select: { id: true },
      });
      if (!targetRole) {
        throw new AdminUserInvalidRoleError();
      }
      if (
        current.status === 'ACTIVE' &&
        current.role === 'ADMIN' &&
        role !== 'ADMIN'
      ) {
        if (activeAdmins.length <= 1) {
          throw new AdminUserConflictError('LAST_ADMIN_PROTECTION');
        }
      }

      await transaction.user.update({
        where: { id: userId },
        data: { roleId: targetRole.id },
      });
      await transaction.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: 'USER_ROLE_CHANGED',
          entityType: 'USER',
          entityId: userId,
          oldValues: { role: current.role },
          newValues: { role },
        },
      });

      return mapAdminUser(
        await transaction.user.findUniqueOrThrow({
          where: { id: userId },
          select: ADMIN_USER_SELECT,
        }),
      );
    });
  }

  private async lockUser(
    transaction: PrismaTransactionClient,
    userId: string,
  ): Promise<AdminUserRecord | null> {
    const rows = await transaction.$queryRaw<LockedAdminUserRow[]>`
      SELECT
        u."id",
        u."email",
        u."full_name" AS "fullName",
        u."phone",
        u."avatar_url" AS "avatarUrl",
        u."status",
        u."last_login_at" AS "lastLoginAt",
        u."created_at" AS "createdAt",
        r."code" AS "role"
      FROM "users" u
      INNER JOIN "roles" r ON r."id" = u."role_id"
      WHERE u."id" = ${userId}::uuid
      FOR UPDATE OF u
    `;
    const row = rows[0];
    return row ? mapAdminUser(row) : null;
  }

  private lockActiveAdmins(
    transaction: PrismaTransactionClient,
  ): Promise<Array<{ id: string }>> {
    return transaction.$queryRaw<Array<{ id: string }>>`
      SELECT u."id"
      FROM "users" u
      INNER JOIN "roles" r ON r."id" = u."role_id"
      WHERE u."status" = 'ACTIVE' AND r."code" = 'ADMIN'
      ORDER BY u."id"
      FOR UPDATE OF u
    `;
  }
}
