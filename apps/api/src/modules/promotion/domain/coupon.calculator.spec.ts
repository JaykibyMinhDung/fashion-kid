import { CouponType, EntityStatus } from '../../../generated/prisma/client';
import {
  CouponSnapshot,
  calculateCouponDiscount,
  evaluateCoupon,
} from './coupon.calculator';

function makeCoupon(overrides: Partial<CouponSnapshot> = {}): CouponSnapshot {
  return {
    type: CouponType.FIXED_AMOUNT,
    value: 50_000n,
    minOrderAmount: 0n,
    maxDiscountAmount: null,
    usageLimit: null,
    perUserLimit: null,
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T00:00:00.000Z'),
    status: EntityStatus.ACTIVE,
    ...overrides,
  };
}

const NOW = new Date('2026-06-01T00:00:00.000Z');

function context(
  overrides: Partial<Parameters<typeof evaluateCoupon>[1]> = {},
) {
  return {
    itemsSubtotal: 1_000_000n,
    now: NOW,
    globalUsageCount: 0,
    userUsageCount: 0,
    ...overrides,
  };
}

describe('calculateCouponDiscount', () => {
  it('TC-CPN-01: FIXED_AMOUNT caps at itemsSubtotal', () => {
    const coupon = makeCoupon({
      type: CouponType.FIXED_AMOUNT,
      value: 50_000n,
    });
    expect(calculateCouponDiscount(coupon, 40_000n)).toBe(40_000n);
  });

  it('FIXED_AMOUNT applies full value when subtotal is larger', () => {
    const coupon = makeCoupon({
      type: CouponType.FIXED_AMOUNT,
      value: 50_000n,
    });
    expect(calculateCouponDiscount(coupon, 100_000n)).toBe(50_000n);
  });

  it('TC-CPN-02: PERCENTAGE respects maxDiscountAmount', () => {
    const coupon = makeCoupon({
      type: CouponType.PERCENTAGE,
      value: 10n,
      maxDiscountAmount: 20_000n,
    });
    expect(calculateCouponDiscount(coupon, 300_000n)).toBe(20_000n);
  });

  it('PERCENTAGE without cap returns raw percentage', () => {
    const coupon = makeCoupon({
      type: CouponType.PERCENTAGE,
      value: 10n,
      maxDiscountAmount: null,
    });
    expect(calculateCouponDiscount(coupon, 300_000n)).toBe(30_000n);
  });

  it('PERCENTAGE floors fractional results', () => {
    const coupon = makeCoupon({ type: CouponType.PERCENTAGE, value: 10n });
    // floor(12345 * 10 / 100) = floor(1234.5) = 1234
    expect(calculateCouponDiscount(coupon, 12_345n)).toBe(1_234n);
  });

  it('returns 0 for non-positive subtotal', () => {
    const coupon = makeCoupon({ value: 50_000n });
    expect(calculateCouponDiscount(coupon, 0n)).toBe(0n);
  });
});

describe('evaluateCoupon', () => {
  it('accepts an active coupon within window and returns discount', () => {
    const coupon = makeCoupon({
      type: CouponType.FIXED_AMOUNT,
      value: 50_000n,
    });
    const result = evaluateCoupon(coupon, context({ itemsSubtotal: 200_000n }));
    expect(result).toEqual({ eligible: true, discountAmount: 50_000n });
  });

  it('accepts exactly at startsAt boundary', () => {
    const coupon = makeCoupon({ startsAt: NOW });
    expect(evaluateCoupon(coupon, context()).eligible).toBe(true);
  });

  it('rejects DISABLED coupon', () => {
    const coupon = makeCoupon({ status: EntityStatus.DISABLED });
    const result = evaluateCoupon(coupon, context());
    expect(result).toEqual({
      eligible: false,
      reasonCode: 'DISABLED',
      discountAmount: 0n,
    });
  });

  it('rejects not-yet-started coupon', () => {
    const coupon = makeCoupon({
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
    });
    expect(evaluateCoupon(coupon, context())).toMatchObject({
      eligible: false,
      reasonCode: 'NOT_STARTED',
    });
  });

  it('rejects at endsAt boundary (exclusive)', () => {
    const coupon = makeCoupon({ endsAt: NOW });
    expect(evaluateCoupon(coupon, context())).toMatchObject({
      eligible: false,
      reasonCode: 'EXPIRED',
    });
  });

  it('TC-CPN-03: rejects when subtotal below minOrderAmount', () => {
    const coupon = makeCoupon({ minOrderAmount: 500_000n });
    expect(
      evaluateCoupon(coupon, context({ itemsSubtotal: 499_000n })),
    ).toMatchObject({ eligible: false, reasonCode: 'MIN_ORDER_NOT_MET' });
  });

  it('rejects when global usage limit reached', () => {
    const coupon = makeCoupon({ usageLimit: 1 });
    expect(
      evaluateCoupon(coupon, context({ globalUsageCount: 1 })),
    ).toMatchObject({ eligible: false, reasonCode: 'USAGE_LIMIT_REACHED' });
  });

  it('rejects when per-user usage limit reached', () => {
    const coupon = makeCoupon({ perUserLimit: 1 });
    expect(
      evaluateCoupon(coupon, context({ userUsageCount: 1 })),
    ).toMatchObject({ eligible: false, reasonCode: 'USER_LIMIT_REACHED' });
  });
});
