import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../common/errors/api-error';
import { TaxConfigService } from './tax-config.service';

describe('TaxConfigService', () => {
  it('uses default 8% (800 bps) when env is not set', () => {
    const configService = new ConfigService();
    const service = new TaxConfigService(configService);

    expect(service.getDefaultTaxRateBps()).toBe(800);
    const seller = service.getSellerSnapshot();
    expect(seller.name).toBe('Cửa hàng Thời trang Trẻ em Jaykiby');
    expect(seller.taxCode).toBe('0101234567-001');
  });

  it('reads custom VAT rate from config', () => {
    const configService = new ConfigService({
      VAT_DEFAULT_RATE_BPS: '1000',
    });
    const service = new TaxConfigService(configService);

    expect(service.getDefaultTaxRateBps()).toBe(1000);
  });

  it('throws TAX_RATE_INVALID if VAT rate is negative or greater than 10000', () => {
    const configService = new ConfigService({
      VAT_DEFAULT_RATE_BPS: '-100',
    });
    expect(() => new TaxConfigService(configService)).toThrow(ApiException);

    const configServiceOver = new ConfigService({
      VAT_DEFAULT_RATE_BPS: '15000',
    });
    expect(() => new TaxConfigService(configServiceOver)).toThrow(ApiException);
  });
});
