import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CalculateShippingQuoteParams,
  ShippingProvider,
  ShippingQuoteResult,
} from '../domain/shipping-provider.interface';

export const DEFAULT_FALLBACK_SHIPPING_FEE = 30_000n;

@Injectable()
export class FallbackShippingProvider extends ShippingProvider {
  readonly name = 'STANDARD_FALLBACK';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  calculateQuote(
    params: CalculateShippingQuoteParams,
  ): Promise<ShippingQuoteResult> {
    void params;
    const rawFee =
      this.configService.get<string>('SHIPPING_FALLBACK_FEE') ?? '30000';
    let fee = DEFAULT_FALLBACK_SHIPPING_FEE;
    try {
      const parsed = BigInt(rawFee);
      if (parsed >= 0n) {
        fee = parsed;
      }
    } catch {
      fee = DEFAULT_FALLBACK_SHIPPING_FEE;
    }

    return Promise.resolve({
      fee,
      source: 'FALLBACK',
      provider: this.name,
      serviceCode: 'STANDARD',
      serviceName: 'Giao hàng tiêu chuẩn',
      estimatedDays: 3,
      metadata: {
        type: 'fixed_fallback',
        configurable: true,
      },
    });
  }
}
