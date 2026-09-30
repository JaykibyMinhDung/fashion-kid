import type {
  CouponType,
  EntityStatus,
} from '../../../generated/prisma/client';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type { CouponSnapshot } from '../domain/coupon.calculator';
import type {
  CouponListResponseDto,
  CouponResponseDto,
  CouponUsageListResponseDto,
} from '../dto/admin-coupon.dto';

export type CouponWithId = CouponSnapshot & {
  id: string;
  code: string;
};

export type CreateCouponData = {
  code: string;
  name: string;
  description: string | null;
  type: CouponType;
  value: bigint;
  minOrderAmount: bigint;
  maxDiscountAmount: bigint | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: Date;
  endsAt: Date;
  status: EntityStatus;
};

export type UpdateCouponData = {
  name?: string;
  description?: string | null;
  minOrderAmount?: bigint;
  maxDiscountAmount?: bigint | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: Date;
  endsAt?: Date;
};

export type CouponListQuery = {
  page: number;
  limit: number;
  q?: string;
  status?: EntityStatus;
  type?: CouponType;
};

export type CouponUsageListQuery = {
  page: number;
  limit: number;
  userId?: string;
  from?: Date;
  to?: Date;
};

export abstract class CouponRepository {
  // ----- Customer preview (Day 11 §7) -----
  abstract findByCode(code: string): Promise<CouponWithId | null>;
  abstract countUsage(couponId: string): Promise<number>;
  abstract countUserUsage(couponId: string, userId: string): Promise<number>;
  abstract getCartSubtotal(userId: string): Promise<bigint>;

  // ----- Admin management (Day 11 §8) -----
  abstract findById(id: string): Promise<CouponResponseDto | null>;
  abstract create(
    transaction: PrismaTransactionClient,
    data: CreateCouponData,
  ): Promise<CouponResponseDto>;
  abstract update(
    transaction: PrismaTransactionClient,
    id: string,
    data: UpdateCouponData,
  ): Promise<CouponResponseDto>;
  abstract updateStatus(
    transaction: PrismaTransactionClient,
    id: string,
    status: EntityStatus,
  ): Promise<CouponResponseDto>;
  abstract list(query: CouponListQuery): Promise<CouponListResponseDto>;
  abstract listUsages(
    couponId: string,
    query: CouponUsageListQuery,
  ): Promise<CouponUsageListResponseDto>;
}
