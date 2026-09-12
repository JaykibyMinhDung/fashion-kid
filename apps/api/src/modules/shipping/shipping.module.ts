import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './services/shipping.service';
import { ShippingProvider } from './domain/shipping-provider.interface';
import { FallbackShippingProvider } from './providers/fallback-shipping.provider';
import { ShippingQuoteTokenService } from './services/shipping-quote-token.service';

@Module({
  imports: [UsersModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ShippingQuoteTokenService,
    FallbackShippingProvider,
    { provide: ShippingProvider, useExisting: FallbackShippingProvider },
  ],
  exports: [ShippingService, ShippingProvider],
})
export class ShippingModule {}
