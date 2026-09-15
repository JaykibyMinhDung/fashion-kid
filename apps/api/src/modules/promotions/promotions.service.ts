import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CouponType,
  EntityStatus,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CreateCouponRequestDto,
  ListCouponsQueryDto,
  UpdateCouponRequestDto,
} from './dto/coupon.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(userId: string, code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon)
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        message: 'Không tìm thấy mã giảm giá',
      });
    const now = new Date();
    if (
      coupon.status !== EntityStatus.ACTIVE ||
      coupon.startsAt > now ||
      coupon.endsAt < now
    )
      throw new BadRequestException({
        code: 'COUPON_NOT_AVAILABLE',
        message: 'Mã giảm giá chưa khả dụng',
      });
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { variant: { select: { price: true } } } } },
    });
    const subtotal = (cart?.items ?? []).reduce(
      (sum, item) => sum + item.variant.price * BigInt(item.quantity),
      0n,
    );
    if (subtotal < coupon.minOrderAmount)
      throw new BadRequestException({
        code: 'COUPON_MIN_ORDER_NOT_MET',
        message: 'Chưa đạt giá trị đơn hàng tối thiểu',
      });
    const [totalUsages, userUsages] = await Promise.all([
      this.prisma.couponUsage.count({ where: { couponId: coupon.id } }),
      this.prisma.couponUsage.count({ where: { couponId: coupon.id, userId } }),
    ]);
    if (
      (coupon.usageLimit !== null && totalUsages >= coupon.usageLimit) ||
      (coupon.perUserLimit !== null && userUsages >= coupon.perUserLimit)
    )
      throw new BadRequestException({
        code: 'COUPON_USAGE_LIMIT_REACHED',
        message: 'Mã giảm giá đã đạt giới hạn sử dụng',
      });
    let discount =
      coupon.type === CouponType.PERCENTAGE
        ? (subtotal * coupon.value) / 100n
        : coupon.value;
    if (
      coupon.maxDiscountAmount !== null &&
      discount > coupon.maxDiscountAmount
    )
      discount = coupon.maxDiscountAmount;
    if (discount > subtotal) discount = subtotal;
    return {
      coupon: this.present(coupon),
      cartSubtotal: subtotal,
      discountAmount: discount,
      totalAmount: subtotal - discount,
    };
  }

  list(query: ListCouponsQueryDto) {
    return this.prisma.coupon
      .findMany({
        where: {
          ...(query.status ? { status: query.status } : {}),
          ...(query.q
            ? { code: { contains: query.q.toUpperCase(), mode: 'insensitive' } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((items) => items.map((item) => this.present(item)));
  }
  async detail(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { usages: true } } },
    });
    if (!coupon)
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        message: 'Không tìm thấy mã giảm giá',
      });
    return { ...this.present(coupon), usageCount: coupon._count.usages };
  }
  async create(actorId: string, input: CreateCouponRequestDto) {
    this.assertDates(input.startsAt, input.endsAt);
    const coupon = await this.prisma.coupon.create({
      data: this.data(input) as Prisma.CouponUncheckedCreateInput,
    });
    await this.audit(
      actorId,
      'COUPON_CREATED',
      coupon.id,
      null,
      this.present(coupon),
    );
    return this.present(coupon);
  }
  async update(actorId: string, id: string, input: UpdateCouponRequestDto) {
    const current = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { usages: true } } },
    });
    if (!current)
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        message: 'Không tìm thấy mã giảm giá',
      });
    if (input.startsAt || input.endsAt)
      this.assertDates(
        input.startsAt ?? current.startsAt.toISOString(),
        input.endsAt ?? current.endsAt.toISOString(),
      );
    if (
      current._count.usages > 0 &&
      (input.code !== undefined ||
        input.type !== undefined ||
        input.value !== undefined)
    )
      throw new ConflictException({
        code: 'COUPON_FIELDS_IMMUTABLE_AFTER_USAGE',
        message:
          'Không thể thay đổi code, loại hoặc giá trị sau khi đã sử dụng',
      });
    try {
      const updated = await this.prisma.coupon.update({
        where: { id },
        data: this.data(input),
      });
      await this.audit(
        actorId,
        'COUPON_UPDATED',
        id,
        this.present(current),
        this.present(updated),
      );
      return this.present(updated);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException({
          code: 'COUPON_CODE_EXISTS',
          message: 'Mã giảm giá đã tồn tại',
        });
      throw e;
    }
  }
  async status(actorId: string, id: string, status: EntityStatus) {
    const current = await this.prisma.coupon.findUnique({ where: { id } });
    if (!current)
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        message: 'Không tìm thấy mã giảm giá',
      });
    const updated = await this.prisma.coupon.update({
      where: { id },
      data: { status },
    });
    await this.audit(
      actorId,
      status === EntityStatus.ACTIVE ? 'COUPON_ACTIVATED' : 'COUPON_DISABLED',
      id,
      { status: current.status },
      { status },
    );
    return this.present(updated);
  }
  usages(id: string) {
    return this.prisma.couponUsage.findMany({
      where: { couponId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });
  }
  private data(input: CreateCouponRequestDto | UpdateCouponRequestDto) {
    const result: Record<string, unknown> = {};
    for (const key of [
      'code',
      'name',
      'description',
      'type',
      'usageLimit',
      'perUserLimit',
    ] as const)
      if (input[key] !== undefined) result[key] = input[key];
    if ('status' in input && input.status !== undefined) {
      result.status = input.status;
    }
    for (const key of ['value', 'minOrderAmount', 'maxDiscountAmount'] as const)
      if (input[key] !== undefined)
        result[key] = input[key] === null ? null : BigInt(input[key]);
    for (const key of ['startsAt', 'endsAt'] as const)
      if (input[key] !== undefined) result[key] = new Date(input[key]);
    return result;
  }
  private assertDates(startsAt: string, endsAt: string) {
    if (new Date(startsAt) >= new Date(endsAt))
      throw new BadRequestException({
        code: 'COUPON_INVALID_DATE_RANGE',
        message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
      });
  }
  private async audit(
    actorId: string,
    action: string,
    entityId: string,
    oldValues: object | null,
    newValues: object,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'COUPON',
        entityId,
        ...(oldValues === null ? {} : { oldValues: oldValues }),
        newValues: newValues,
      },
    });
  }
  private present(coupon: {
    value: bigint;
    minOrderAmount: bigint;
    maxDiscountAmount: bigint | null;
    [key: string]: unknown;
  }) {
    return {
      ...coupon,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscountAmount: coupon.maxDiscountAmount,
    };
  }
}
