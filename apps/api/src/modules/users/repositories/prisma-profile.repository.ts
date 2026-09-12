import { Injectable } from '@nestjs/common';
import type { Prisma, UserStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { isRoleCode, type RoleCode } from '../../auth/auth.types';

const PROFILE_SELECT = {
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

type ProfileRow = Prisma.UserGetPayload<{ select: typeof PROFILE_SELECT }>;

export type ProfileRecord = {
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

export type UpdateProfileData = {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

function mapProfile(row: ProfileRow): ProfileRecord {
  if (!isRoleCode(row.role.code)) {
    throw new Error('Unsupported role code in profile data');
  }

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    role: row.role.code,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<ProfileRecord | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    return row ? mapProfile(row) : null;
  }

  async updateByUserId(
    userId: string,
    data: UpdateProfileData,
  ): Promise<ProfileRecord | null> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, status: 'ACTIVE' },
      data,
    });
    return result.count === 1 ? this.findByUserId(userId) : null;
  }
}
