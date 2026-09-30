import { Injectable } from '@nestjs/common';
import { Prisma, type Coupon } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  CouponListResponseDto,
  CouponResponseDto,
  CouponUsageListResponseDto,
  CouponUsageResponseDto,
} from '../dto/admin-coupon.dto';
import {
  CouponListQuery,
  CouponRepository,
  CouponUsageListQuery,
  CouponWithId,
  CreateCouponData,
  UpdateCouponData,
} from './coupon.repository';

const USAGE_USER_SELECT = {
  select: { id: true, fullName: true, email: true },
} as const;

type CouponUsageRow = Prisma.CouponUsageGetPayload<{
  include: { user: typeof USAGE_USER_SELECT };
}>;

@Injectable()
export class PrismaCouponRepository extends CouponRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ----- Customer preview -----

  async findByCode(code: string): Promise<CouponWithId | null> {
    const row = await this.prisma.coupon.findUnique({ where: { code } });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      code: row.code,
      type: row.type,
      value: row.value,
      minOrderAmount: row.minOrderAmount,
      maxDiscountAmount: row.maxDiscountAmount,
      usageLimit: row.usageLimit,
      perUserLimit: row.perUserLimit,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
    };
  }

  countUsage(couponId: string): Promise<number> {
    return this.prisma.couponUsage.count({ where: { couponId } });
  }

  countUserUsage(couponId: string, userId: string): Promise<number> {
    return this.prisma.couponUsage.count({ where: { couponId, userId } });
  }

  async getCartSubtotal(userId: string): Promise<bigint> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { variant: { select: { price: true } } } },
      },
    });
    if (!cart) {
      return 0n;
    }
    let subtotal = 0n;
    for (const item of cart.items) {
      subtotal += item.variant.price * BigInt(item.quantity);
    }
    return subtotal;
  }

  // ----- Admin management -----

  async findById(id: string): Promise<CouponResponseDto | null> {
    const row = await this.prisma.coupon.findUnique({ where: { id } });
    return row ? this.toResponse(row) : null;
  }

  async create(
    transaction: PrismaTransactionClient,
    data: CreateCouponData,
  ): Promise<CouponResponseDto> {
    const row = await transaction.coupon.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: data.status,
      },
    });
    return this.toResponse(row);
  }

  async update(
    transaction: PrismaTransactionClient,
    id: string,
    data: UpdateCouponData,
  ): Promise<CouponResponseDto> {
    const row = await transaction.coupon.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      },
    });
    return this.toResponse(row);
  }

  async updateStatus(
    transaction: PrismaTransactionClient,
    id: string,
    status: CreateCouponData['status'],
  ): Promise<CouponResponseDto> {
    const row = await transaction.coupon.update({
      where: { id },
      data: { status },
    });
    return this.toResponse(row);
  }

  async list(query: CouponListQuery): Promise<CouponListResponseDto> {
    const where: Prisma.CouponWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: 'insensitive' } },
              { name: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map((row) => this.toResponse(row)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async listUsages(
    couponId: string,
    query: CouponUsageListQuery,
  ): Promise<CouponUsageListResponseDto> {
    const where: Prisma.CouponUsageWhereInput = {
      couponId,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lt: query.to } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.couponUsage.count({ where }),
      this.prisma.couponUsage.findMany({
        where,
        include: { user: USAGE_USER_SELECT },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map((row) => this.toUsageResponse(row)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private toResponse(row: Coupon): CouponResponseDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      type: row.type,
      value: row.value.toString(),
      minOrderAmount: row.minOrderAmount.toString(),
      maxDiscountAmount:
        row.maxDiscountAmount !== null
          ? row.maxDiscountAmount.toString()
          : null,
      usageLimit: row.usageLimit,
      perUserLimit: row.perUserLimit,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toUsageResponse(row: CouponUsageRow): CouponUsageResponseDto {
    return {
      id: row.id,
      couponId: row.couponId,
      orderId: row.orderId,
      couponCodeSnapshot: row.couponCodeSnapshot,
      discountAmount: row.discountAmount.toString(),
      user: {
        id: row.user.id,
        fullName: row.user.fullName,
        email: row.user.email,
      },
      createdAt: row.createdAt.toISOString(),
    };
  }
}
