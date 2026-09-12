import { ConfigService } from '@nestjs/config';
import type { CalculateShippingQuoteParams } from '../domain/shipping-provider.interface';
import { ShippingQuoteTokenService } from './shipping-quote-token.service';

const PARAMS: CalculateShippingQuoteParams = {
  toAddress: {
    addressLine: '123 Le Loi',
    wardCode: 'W1',
    wardName: 'Ward 1',
    provinceCode: 'P1',
    provinceName: 'Province 1',
  },
  items: [
    {
      variantId: 'variant-1',
      quantity: 2,
      unitPrice: '150000',
      weightGrams: 200,
      lengthCm: 20,
      widthCm: 15,
      heightCm: 5,
    },
  ],
  totalWeightGrams: 400,
};

describe('ShippingQuoteTokenService', () => {
  const service = new ShippingQuoteTokenService(
    new ConfigService({
      JWT_ACCESS_SECRET: 'unit-test-secret-with-at-least-32-random-bytes',
      SHIPPING_QUOTE_TTL_SECONDS: 300,
    }),
  );

  it('accepts an untampered quote for the exact user, address and cart', () => {
    const issued = service.issue('user-1', 'address-1', PARAMS, {
      fee: 30000n,
      source: 'FALLBACK',
      provider: 'STANDARD_FALLBACK',
    });

    expect(
      service.verify(issued.quoteFingerprint, 'user-1', 'address-1', PARAMS),
    ).toEqual(
      expect.objectContaining({
        fee: 30000n,
        source: 'FALLBACK',
        provider: 'STANDARD_FALLBACK',
      }),
    );
  });

  it('rejects tampering, another identity and a changed cart', () => {
    const issued = service.issue('user-1', 'address-1', PARAMS, {
      fee: 30000n,
      source: 'FALLBACK',
    });
    const tampered = `${issued.quoteFingerprint.slice(0, -1)}x`;
    const changed = {
      ...PARAMS,
      items: [{ ...PARAMS.items[0], quantity: 3 }],
      totalWeightGrams: 600,
    };

    expect(service.verify(tampered, 'user-1', 'address-1', PARAMS)).toBeNull();
    expect(
      service.verify(issued.quoteFingerprint, 'user-2', 'address-1', PARAMS),
    ).toBeNull();
    expect(
      service.verify(issued.quoteFingerprint, 'user-1', 'address-1', changed),
    ).toBeNull();
  });
});
