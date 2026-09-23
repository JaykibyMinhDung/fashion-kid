import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ShippingModule } from '../shipping/shipping.module';
import { UsersModule } from '../users/users.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationModule } from '../notification/notification.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './services/checkout.service';
import { OrderCounterService } from './services/order-counter.service';

@Module({
  imports: [
    PrismaModule,
    CartModule,
    InventoryModule,
    ShippingModule,
    UsersModule,
    BillingModule,
    NotificationModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, OrderCounterService],
  exports: [CheckoutService, OrderCounterService],
})
export class CheckoutModule {}
