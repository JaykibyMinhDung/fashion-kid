import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PromotionController } from './promotion.controller';
import { PromotionAdminController } from './promotion-admin.controller';
import { PromotionService } from './promotion.service';
import { CouponAdminService } from './coupon-admin.service';
import { CouponRepository } from './repositories/coupon.repository';
import { PrismaCouponRepository } from './repositories/prisma-coupon.repository';

@Module({
  imports: [AuditModule],
  controllers: [PromotionController, PromotionAdminController],
  providers: [
    PromotionService,
    CouponAdminService,
    PrismaCouponRepository,
    { provide: CouponRepository, useExisting: PrismaCouponRepository },
  ],
  exports: [PromotionService, CouponRepository],
})
export class PromotionModule {}
