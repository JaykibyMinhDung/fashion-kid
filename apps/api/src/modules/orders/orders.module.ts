import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationModule } from '../notification/notification.module';
import { CustomerOrderController } from './controllers/customer-order.controller';
import { OperationalOrderController } from './controllers/operational-order.controller';
import { OrderRepository } from './repositories/order.repository';
import { PrismaOrderRepository } from './repositories/prisma-order.repository';
import { OrderQueryService } from './services/order-query.service';
import { OrderTransitionService } from './services/order-transition.service';

@Module({
  imports: [PrismaModule, InventoryModule, BillingModule, NotificationModule],
  controllers: [CustomerOrderController, OperationalOrderController],
  providers: [
    {
      provide: OrderRepository,
      useClass: PrismaOrderRepository,
    },
    OrderTransitionService,
    OrderQueryService,
  ],
  exports: [OrderRepository, OrderTransitionService, OrderQueryService],
})
export class OrdersModule {}
