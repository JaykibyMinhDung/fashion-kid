import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CalculateShippingQuoteParams,
  ShippingQuoteResult,
} from '../domain/shipping-provider.interface';

type QuoteTokenPayload = {
  v: 1;
  uid: string;
  aid: string;
  ctx: string;
  fee: string;
  source: 'PROVIDER' | 'FALLBACK';
  provider?: string;
  serviceCode?: string;
  serviceName?: string;
  estimatedDays?: number;
  metadata?: Record<string, unknown>;
  iat: number;
  exp: number;
};

export type IssuedShippingQuote = {
  quoteFingerprint: string;
  expiresAt: string;
};

function contextDigest(params: CalculateShippingQuoteParams): string {
  const canonical = {
    toAddress: params.toAddress,
    items: [...params.items]
      .sort((left, right) => left.variantId.localeCompare(right.variantId))
      .map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        weightGrams: item.weightGrams ?? null,
        lengthCm: item.lengthCm ?? null,
        widthCm: item.widthCm ?? null,
        heightCm: item.heightCm ?? null,
      })),
    totalWeightGrams: params.totalWeightGrams,
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function isPayload(value: unknown): value is QuoteTokenPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.v === 1 &&
    typeof payload.uid === 'string' &&
    typeof payload.aid === 'string' &&
    typeof payload.ctx === 'string' &&
    /^[a-f0-9]{64}$/.test(payload.ctx) &&
    typeof payload.fee === 'string' &&
    /^(0|[1-9]\d*)$/.test(payload.fee) &&
    (payload.source === 'PROVIDER' || payload.source === 'FALLBACK') &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number' &&
    Number.isSafeInteger(payload.iat) &&
    Number.isSafeInteger(payload.exp) &&
    payload.exp > payload.iat
  );
}

@Injectable()
export class ShippingQuoteTokenService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.ttlSeconds = config.get<number>('SHIPPING_QUOTE_TTL_SECONDS') ?? 300;
  }

  issue(
    userId: string,
    addressId: string,
    params: CalculateShippingQuoteParams,
    quote: ShippingQuoteResult,
  ): IssuedShippingQuote {
    const issuedAt = Math.floor(Date.now() / 1_000);
    const payload: QuoteTokenPayload = {
      v: 1,
      uid: userId,
      aid: addressId,
      ctx: contextDigest(params),
      fee: quote.fee.toString(),
      source: quote.source,
      provider: quote.provider,
      serviceCode: quote.serviceCode,
      serviceName: quote.serviceName,
      estimatedDays: quote.estimatedDays,
      metadata: quote.metadata,
      iat: issuedAt,
      exp: issuedAt + this.ttlSeconds,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.sign(encodedPayload);
    return {
      quoteFingerprint: `${encodedPayload}.${signature}`,
      expiresAt: new Date(payload.exp * 1_000).toISOString(),
    };
  }

  verify(
    token: string,
    userId: string,
    addressId: string,
    params: CalculateShippingQuoteParams,
  ): ShippingQuoteResult | null {
    if (token.length > 4_096) return null;
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

    const expected = Buffer.from(this.sign(parts[0]), 'utf8');
    const actual = Buffer.from(parts[1], 'utf8');
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return null;
    }

    try {
      const payload: unknown = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8'),
      );
      if (
        !isPayload(payload) ||
        payload.uid !== userId ||
        payload.aid !== addressId ||
        payload.ctx !== contextDigest(params) ||
        payload.exp <= Math.floor(Date.now() / 1_000)
      ) {
        return null;
      }
      return {
        fee: BigInt(payload.fee),
        source: payload.source,
        provider:
          typeof payload.provider === 'string' ? payload.provider : undefined,
        serviceCode:
          typeof payload.serviceCode === 'string'
            ? payload.serviceCode
            : undefined,
        serviceName:
          typeof payload.serviceName === 'string'
            ? payload.serviceName
            : undefined,
        estimatedDays:
          typeof payload.estimatedDays === 'number'
            ? payload.estimatedDays
            : undefined,
        metadata:
          payload.metadata && typeof payload.metadata === 'object'
            ? payload.metadata
            : undefined,
      };
    } catch {
      return null;
    }
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', this.secret)
      .update(`shipping-quote.v1.${encodedPayload}`)
      .digest('base64url');
  }
}
