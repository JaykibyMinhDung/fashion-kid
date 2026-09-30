import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { ShippingOperationalController } from './controllers/shipping-operational.controller';
import { ShippingWebhookController } from './controllers/shipping-webhook.controller';
import { ShippingProvider } from './domain/shipping-provider.interface';
import { FallbackShippingProvider } from './providers/fallback-shipping.provider';
import { GhnAddressMapper } from './providers/ghn/ghn-address.mapper';
import { GhnClient } from './providers/ghn/ghn-client';
import { GhnShippingAdapter } from './providers/ghn/ghn-shipping.adapter';
import { ShipmentService } from './services/shipment.service';
import { ShippingQuoteTokenService } from './services/shipping-quote-token.service';
import { ShippingService } from './services/shipping.service';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [UsersModule, OrdersModule],
  controllers: [
    ShippingController,
    ShippingOperationalController,
    ShippingWebhookController,
  ],
  providers: [
    GhnClient,
    GhnAddressMapper,
    GhnShippingAdapter,
    FallbackShippingProvider,
    { provide: ShippingProvider, useExisting: GhnShippingAdapter },
    ShippingService,
    ShippingQuoteTokenService,
    ShipmentService,
  ],
  exports: [
    ShippingService,
    ShippingProvider,
    ShipmentService,
    GhnClient,
    GhnShippingAdapter,
  ],
})
export class ShippingModule {}
