import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../common/errors/api-error';
import type { SellerSnapshot, TaxConfig } from '../domain/billing.types';

const DEFAULT_VAT_RATE_BPS = 800; // 8%

@Injectable()
export class TaxConfigService {
  private readonly config: TaxConfig;

  constructor(private readonly configService: ConfigService) {
    const rawRate = this.configService.get<string | number>(
      'VAT_DEFAULT_RATE_BPS',
      DEFAULT_VAT_RATE_BPS,
    );
    const parsedRate = Number(rawRate);

    if (
      !Number.isInteger(parsedRate) ||
      parsedRate < 0 ||
      parsedRate > 10_000
    ) {
      throw new ApiException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'TAX_RATE_INVALID',
        `Thuế suất VAT không hợp lệ: ${rawRate}. Phải là số nguyên từ 0 đến 10000 basis points.`,
      );
    }

    const priceMode = (this.configService.get<string>('VAT_PRICE_MODE') ??
      'INCLUSIVE') as 'INCLUSIVE';

    const issueOn = (this.configService.get<string>('INVOICE_ISSUE_ON') ??
      'ORDER_CREATED') as 'ORDER_CREATED' | 'ORDER_COMPLETED';

    const seller: SellerSnapshot = {
      name:
        this.configService.get<string>('INVOICE_SELLER_NAME') ??
        'Cửa hàng Thời trang Trẻ em Jaykiby',
      address:
        this.configService.get<string>('INVOICE_SELLER_ADDRESS') ??
        '123 Phố Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
      taxCode:
        this.configService.get<string>('INVOICE_SELLER_TAX_CODE') ??
        '0101234567-001',
      phone:
        this.configService.get<string>('INVOICE_SELLER_PHONE') ?? '0987654321',
      email:
        this.configService.get<string>('INVOICE_SELLER_EMAIL') ??
        'support@jaykiby.vn',
    };

    this.config = {
      defaultRateBps: parsedRate,
      priceMode,
      issueOn,
      seller,
    };
  }

  getDefaultTaxRateBps(): number {
    return this.config.defaultRateBps;
  }

  getSellerSnapshot(): SellerSnapshot {
    return { ...this.config.seller };
  }

  getTaxConfig(): TaxConfig {
    return {
      ...this.config,
      seller: { ...this.config.seller },
    };
  }
}
