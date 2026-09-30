import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../common/errors/api-error';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AddressService } from '../../users/address.service';
import {
  CalculateShippingQuoteParams,
  ShippingProvider,
  ShippingQuoteResult,
} from '../domain/shipping-provider.interface';
import { ShippingQuoteResponseDto } from '../dto/shipping.dto';
import { FallbackShippingProvider } from '../providers/fallback-shipping.provider';
import { ShippingQuoteTokenService } from './shipping-quote-token.service';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly addressService: AddressService,
    private readonly shippingProvider: ShippingProvider,
    private readonly prisma: PrismaService,
    private readonly quoteTokenService: ShippingQuoteTokenService,
    @Optional() private readonly fallbackProvider?: FallbackShippingProvider,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async calculateQuoteForUserAddress(
    userId: string,
    addressId: string,
  ): Promise<ShippingQuoteResponseDto> {
    const address = await this.addressService.findOwnById(userId, addressId);
    if (!address) {
      throw new NotFoundException('Địa chỉ nhận hàng không tồn tại');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        items: {
          select: {
            variantId: true,
            quantity: true,
            variant: {
              select: {
                price: true,
                weightGrams: true,
                lengthCm: true,
                widthCm: true,
                heightCm: true,
              },
            },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'CART_EMPTY',
        'Giỏ hàng đang trống',
      );
    }

    const params: CalculateShippingQuoteParams = {
      toAddress: {
        addressLine: address.addressLine,
        wardCode: address.wardCode,
        wardName: address.wardName,
        provinceCode: address.provinceCode,
        provinceName: address.provinceName,
      },
      items: cart.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.variant.price.toString(),
        weightGrams: item.variant.weightGrams ?? undefined,
        lengthCm: item.variant.lengthCm ?? undefined,
        widthCm: item.variant.widthCm ?? undefined,
        heightCm: item.variant.heightCm ?? undefined,
      })),
      totalWeightGrams: cart.items.reduce(
        (total, item) =>
          total + (item.variant.weightGrams ?? 0) * item.quantity,
        0,
      ),
    };
    const quote = await this.calculateQuote(params);
    const signed = this.quoteTokenService.issue(
      userId,
      addressId,
      params,
      quote,
    );

    return {
      fee: quote.fee.toString(),
      source: quote.source,
      provider: quote.provider,
      serviceCode: quote.serviceCode,
      serviceName: quote.serviceName,
      estimatedDays: quote.estimatedDays,
      metadata: quote.metadata,
      ...signed,
    };
  }

  async calculateQuote(
    params: CalculateShippingQuoteParams,
  ): Promise<ShippingQuoteResult> {
    const ghnEnabled =
      this.configService?.get<string>('GHN_ENABLED') !== 'false';
    const fallbackEnabled =
      this.configService?.get<string>('SHIPPING_FALLBACK_ENABLED') !== 'false';

    if (ghnEnabled) {
      try {
        return await this.shippingProvider.calculateQuote(params);
      } catch (err) {
        this.logger.warn(
          `Primary shipping provider quote failed: ${(err as Error).message}. Checking fallback...`,
        );
        if (fallbackEnabled && this.fallbackProvider) {
          return await this.fallbackProvider.calculateQuote(params);
        }
        throw err;
      }
    }

    if (fallbackEnabled && this.fallbackProvider) {
      return await this.fallbackProvider.calculateQuote(params);
    }

    return this.shippingProvider.calculateQuote(params);
  }

  acceptQuoteFingerprint(
    userId: string,
    addressId: string,
    params: CalculateShippingQuoteParams,
    fingerprint: string,
  ): ShippingQuoteResult {
    const quote = this.quoteTokenService.verify(
      fingerprint,
      userId,
      addressId,
      params,
    );
    if (!quote) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'SHIPPING_QUOTE_STALE',
        'Báo giá vận chuyển đã thay đổi hoặc hết hạn, vui lòng báo giá lại',
      );
    }
    return quote;
  }
}
