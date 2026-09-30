import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BigIntSerializationInterceptor } from './common/serialization/bigint-serialization.interceptor';
import { AccessAuthGuard } from './common/auth/access-auth.guard';
import { PermissionsGuard } from './authorization/permissions.guard';
import { AuthThrottlerGuard } from './common/auth/auth-throttler.guard';
import { validateEnvironment } from './config/environment.validation';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuditModule } from './modules/audit/audit.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { ReviewModule } from './modules/review/review.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { PaymentModule } from './modules/payment/payment.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationModule } from './modules/notification/notification.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    ShippingModule,
    CheckoutModule,
    OrdersModule,
    PaymentModule,
    AuditModule,
    PromotionModule,
    ReviewModule,
    ReportingModule,
    BillingModule,
    NotificationModule,
    WishlistModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1_000 }]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuthThrottlerGuard,
    {
      provide: APP_GUARD,
      useExisting: AuthThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: AccessAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BigIntSerializationInterceptor,
    },
  ],
})
export class AppModule {}
