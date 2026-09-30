import { Injectable } from '@nestjs/common';
import { evaluateCoupon } from './domain/coupon.calculator';
import { CouponValidationResponseDto } from './dto/coupon.dto';
import { CouponRepository } from './repositories/coupon.repository';

@Injectable()
export class PromotionService {
  constructor(private readonly repository: CouponRepository) {}

  /**
   * Preview coupon với giỏ hàng hiện tại — KHÔNG tạo CouponUsage, KHÔNG giữ slot
   * (Day 11 §7, §11). Kết quả preview không phải cam kết; checkout mới quyết định.
   */
  async validate(
    userId: string,
    code: string,
  ): Promise<CouponValidationResponseDto> {
    const normalized = code.trim().toUpperCase();
    const itemsSubtotal = await this.repository.getCartSubtotal(userId);
    const coupon = await this.repository.findByCode(normalized);

    if (!coupon) {
      return {
        code: normalized,
        type: null,
        discountAmount: '0',
        itemsSubtotal: itemsSubtotal.toString(),
        eligible: false,
        reasonCode: 'NOT_FOUND',
        expiresAt: null,
      };
    }

    const [globalUsageCount, userUsageCount] = await Promise.all([
      this.repository.countUsage(coupon.id),
      this.repository.countUserUsage(coupon.id, userId),
    ]);

    const result = evaluateCoupon(coupon, {
      itemsSubtotal,
      now: new Date(),
      globalUsageCount,
      userUsageCount,
    });

    return {
      code: coupon.code,
      type: coupon.type,
      discountAmount: result.discountAmount.toString(),
      itemsSubtotal: itemsSubtotal.toString(),
      eligible: result.eligible,
      reasonCode: result.eligible ? null : result.reasonCode,
      expiresAt: coupon.endsAt.toISOString(),
    };
  }
}
