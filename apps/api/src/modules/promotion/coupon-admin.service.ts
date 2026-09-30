import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CouponType,
  EntityStatus,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ApiException } from '../../common/errors/api-error';
import { AuditService } from '../audit/audit.service';
import {
  CouponListResponseDto,
  CouponResponseDto,
  CouponUsageListResponseDto,
  CreateCouponRequestDto,
  ListCouponUsagesQueryDto,
  ListCouponsQueryDto,
  UpdateCouponRequestDto,
} from './dto/admin-coupon.dto';
import {
  CouponRepository,
  CreateCouponData,
  UpdateCouponData,
} from './repositories/coupon.repository';

@Injectable()
export class CouponAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CouponRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    actorId: string,
    input: CreateCouponRequestDto,
  ): Promise<CouponResponseDto> {
    const data = this.parseCreate(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const coupon = await this.repository.create(tx, data);
        await this.audit.record(tx, {
          actorId,
          action: 'COUPON_CREATE',
          entityType: 'Coupon',
          entityId: coupon.id,
          newValues: this.snapshot(coupon),
        });
        return coupon;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'COUPON_CODE_CONFLICT',
          'Mã coupon đã tồn tại',
        );
      }
      throw error;
    }
  }

  async update(
    actorId: string,
    id: string,
    input: UpdateCouponRequestDto,
  ): Promise<CouponResponseDto> {
    const before = await this.requireCoupon(id);
    const data = this.parseUpdate(input, before);
    return this.prisma.$transaction(async (tx) => {
      const after = await this.repository.update(tx, id, data);
      await this.audit.record(tx, {
        actorId,
        action: 'COUPON_UPDATE',
        entityType: 'Coupon',
        entityId: id,
        oldValues: this.snapshot(before),
        newValues: this.snapshot(after),
      });
      return after;
    });
  }

  async updateStatus(
    actorId: string,
    id: string,
    status: EntityStatus,
  ): Promise<CouponResponseDto> {
    const before = await this.requireCoupon(id);
    return this.prisma.$transaction(async (tx) => {
      const after = await this.repository.updateStatus(tx, id, status);
      await this.audit.record(tx, {
        actorId,
        action: 'COUPON_STATUS_CHANGE',
        entityType: 'Coupon',
        entityId: id,
        oldValues: { status: before.status },
        newValues: { status: after.status },
      });
      return after;
    });
  }

  list(query: ListCouponsQueryDto): Promise<CouponListResponseDto> {
    return this.repository.list({
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      type: query.type,
    });
  }

  get(id: string): Promise<CouponResponseDto> {
    return this.requireCoupon(id);
  }

  async listUsages(
    id: string,
    query: ListCouponUsagesQueryDto,
  ): Promise<CouponUsageListResponseDto> {
    await this.requireCoupon(id);
    return this.repository.listUsages(id, {
      page: query.page,
      limit: query.limit,
      userId: query.userId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  private async requireCoupon(id: string): Promise<CouponResponseDto> {
    const coupon = await this.repository.findById(id);
    if (!coupon) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'COUPON_NOT_FOUND',
        'Không tìm thấy coupon',
      );
    }
    return coupon;
  }

  private parseCreate(input: CreateCouponRequestDto): CreateCouponData {
    const value = BigInt(input.value);
    this.validateValue(input.type, value);
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    this.validatePeriod(startsAt, endsAt);
    return {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      value,
      minOrderAmount:
        input.minOrderAmount !== undefined ? BigInt(input.minOrderAmount) : 0n,
      maxDiscountAmount:
        input.maxDiscountAmount != null
          ? BigInt(input.maxDiscountAmount)
          : null,
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit ?? null,
      startsAt,
      endsAt,
      status: input.status ?? EntityStatus.ACTIVE,
    };
  }

  private parseUpdate(
    input: UpdateCouponRequestDto,
    before: CouponResponseDto,
  ): UpdateCouponData {
    const data: UpdateCouponData = {};
    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.minOrderAmount !== undefined) {
      data.minOrderAmount = BigInt(input.minOrderAmount);
    }
    if (input.maxDiscountAmount !== undefined) {
      data.maxDiscountAmount =
        input.maxDiscountAmount === null
          ? null
          : BigInt(input.maxDiscountAmount);
    }
    if (input.usageLimit !== undefined) {
      data.usageLimit = input.usageLimit;
    }
    if (input.perUserLimit !== undefined) {
      data.perUserLimit = input.perUserLimit;
    }
    if (input.startsAt !== undefined) {
      data.startsAt = new Date(input.startsAt);
    }
    if (input.endsAt !== undefined) {
      data.endsAt = new Date(input.endsAt);
    }

    const effectiveStart = data.startsAt ?? new Date(before.startsAt);
    const effectiveEnd = data.endsAt ?? new Date(before.endsAt);
    this.validatePeriod(effectiveStart, effectiveEnd);
    return data;
  }

  private validateValue(type: CouponType, value: bigint): void {
    if (value <= 0n) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'COUPON_INVALID_VALUE',
        'value phải lớn hơn 0',
      );
    }
    if (type === CouponType.PERCENTAGE && (value < 1n || value > 100n)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'COUPON_INVALID_VALUE',
        'PERCENTAGE value phải trong khoảng 1..100',
      );
    }
  }

  private validatePeriod(startsAt: Date, endsAt: Date): void {
    if (endsAt <= startsAt) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'endsAt phải sau startsAt',
        [{ field: 'endsAt', message: 'endsAt phải sau startsAt' }],
      );
    }
  }

  private snapshot(coupon: CouponResponseDto): Record<string, unknown> {
    return { ...coupon };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
