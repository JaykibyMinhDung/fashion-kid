import { CouponType, EntityStatus } from '../../../generated/prisma/client';

/**
 * Domain thuần cho Coupon (Day 11 Part 1 §5, §6). Không phụ thuộc DB/HTTP —
 * mọi dữ liệu cần cho quyết định được truyền vào dưới dạng tham số để unit-test dễ.
 * Tiền tệ dùng BigInt (VND integer), tuyệt đối không floating point.
 */

export type CouponReasonCode =
  | 'NOT_FOUND'
  | 'DISABLED'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MIN_ORDER_NOT_MET'
  | 'USAGE_LIMIT_REACHED'
  | 'USER_LIMIT_REACHED';

export type CouponSnapshot = {
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

export type CouponEvaluationContext = {
  itemsSubtotal: bigint;
  now: Date;
  globalUsageCount: number;
  userUsageCount: number;
};

export type CouponEvaluationResult =
  | { eligible: true; discountAmount: bigint }
  | { eligible: false; reasonCode: CouponReasonCode; discountAmount: bigint };

/**
 * Day 11 §6:
 * - FIXED_AMOUNT: discount = min(value, itemsSubtotal).
 * - PERCENTAGE:   raw = floor(itemsSubtotal * value / 100); nếu có maxDiscountAmount thì min(raw, max).
 * - Cuối cùng discount <= itemsSubtotal và >= 0. Chỉ áp trên itemsSubtotal (không gồm shipping).
 */
export function calculateCouponDiscount(
  coupon: Pick<CouponSnapshot, 'type' | 'value' | 'maxDiscountAmount'>,
  itemsSubtotal: bigint,
): bigint {
  if (itemsSubtotal <= 0n) {
    return 0n;
  }

  let discount: bigint;
  if (coupon.type === CouponType.FIXED_AMOUNT) {
    discount = coupon.value;
  } else {
    // BigInt division truncates toward zero; các giá trị đều dương nên = floor.
    const raw = (itemsSubtotal * coupon.value) / 100n;
    discount =
      coupon.maxDiscountAmount !== null && raw > coupon.maxDiscountAmount
        ? coupon.maxDiscountAmount
        : raw;
  }

  if (discount > itemsSubtotal) {
    discount = itemsSubtotal;
  }
  if (discount < 0n) {
    discount = 0n;
  }
  return discount;
}

/**
 * Day 11 §5: coupon hợp lệ khi status ACTIVE, trong [startsAt, endsAt),
 * subtotal >= minOrderAmount, chưa vượt usageLimit/perUserLimit.
 * Trả về reasonCode fine-grained cho preview; discount chỉ tính khi eligible.
 */
export function evaluateCoupon(
  coupon: CouponSnapshot,
  context: CouponEvaluationContext,
): CouponEvaluationResult {
  const fail = (reasonCode: CouponReasonCode): CouponEvaluationResult => ({
    eligible: false,
    reasonCode,
    discountAmount: 0n,
  });

  if (coupon.status !== EntityStatus.ACTIVE) {
    return fail('DISABLED');
  }
  if (context.now < coupon.startsAt) {
    return fail('NOT_STARTED');
  }
  if (context.now >= coupon.endsAt) {
    return fail('EXPIRED');
  }
  if (context.itemsSubtotal < coupon.minOrderAmount) {
    return fail('MIN_ORDER_NOT_MET');
  }
  if (
    coupon.usageLimit !== null &&
    context.globalUsageCount >= coupon.usageLimit
  ) {
    return fail('USAGE_LIMIT_REACHED');
  }
  if (
    coupon.perUserLimit !== null &&
    context.userUsageCount >= coupon.perUserLimit
  ) {
    return fail('USER_LIMIT_REACHED');
  }

  return {
    eligible: true,
    discountAmount: calculateCouponDiscount(coupon, context.itemsSubtotal),
  };
}
