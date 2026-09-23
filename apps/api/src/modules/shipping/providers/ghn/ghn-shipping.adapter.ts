import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CalculateShippingQuoteParams,
  ShippingProvider,
  ShippingQuoteResult,
} from '../../domain/shipping-provider.interface';
import { GhnAddressMapper } from './ghn-address.mapper';
import { GhnClient } from './ghn-client';

export const DEFAULT_GHN_FROM_DISTRICT_ID = 1482; // Bắc Từ Liêm, Hà Nội

@Injectable()
export class GhnShippingAdapter extends ShippingProvider {
  readonly name = 'GHN';
  private readonly logger = new Logger(GhnShippingAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ghnClient: GhnClient,
    private readonly addressMapper: GhnAddressMapper,
  ) {
    super();
  }

  isConfigured(): boolean {
    return this.ghnClient.isConfigured();
  }

  getFromDistrictId(): number {
    const configured = this.configService.get<string>('GHN_FROM_DISTRICT_ID');
    if (configured) {
      const parsed = Number(configured);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return DEFAULT_GHN_FROM_DISTRICT_ID;
  }

  async calculateQuote(
    params: CalculateShippingQuoteParams,
  ): Promise<ShippingQuoteResult> {
    const fromDistrictId = this.getFromDistrictId();
    const resolved = await this.addressMapper.resolveAddress(params.toAddress);

    // Compute package weight and dimensions
    const totalWeight = Math.max(
      params.totalWeightGrams > 0 ? params.totalWeightGrams : 200,
      100,
    );

    let maxLength = 20;
    let maxWidth = 15;
    let maxHeight = 10;

    for (const item of params.items) {
      if (item.lengthCm && item.lengthCm > maxLength) maxLength = item.lengthCm;
      if (item.widthCm && item.widthCm > maxWidth) maxWidth = item.widthCm;
      if (item.heightCm && item.heightCm > maxHeight) maxHeight = item.heightCm;
    }

    const feeRes = await this.ghnClient.calculateFee({
      from_district_id: fromDistrictId,
      to_district_id: resolved.districtId,
      to_ward_code: resolved.wardCode,
      weight: Math.round(totalWeight),
      length: Math.round(maxLength),
      width: Math.round(maxWidth),
      height: Math.round(maxHeight),
      service_type_id: 2, // Standard E-commerce delivery
    });

    return {
      fee: BigInt(feeRes.total),
      source: 'PROVIDER',
      provider: this.name,
      serviceCode: 'GHN_STANDARD',
      serviceName: 'Giao Hàng Nhanh - Tiêu chuẩn',
      estimatedDays: 2,
      metadata: {
        districtId: resolved.districtId,
        wardCode: resolved.wardCode,
        serviceFee: feeRes.service_fee,
        insuranceFee: feeRes.insurance_fee,
      },
    };
  }
}
