import { Module } from '@nestjs/common';
import {
  CouponsController,
  AdminCouponsController,
} from './promotions.controller';
import { PromotionsService } from './promotions.service';
@Module({
  controllers: [CouponsController, AdminCouponsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
