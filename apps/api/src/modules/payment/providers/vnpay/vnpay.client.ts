import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HashAlgorithm, VNPay, ignoreLogger } from 'vnpay';
import { ApiException } from '../../../../common/errors/api-error';

export const VNPAY_CLIENT = 'VNPAY_CLIENT';

export const vnpayClientProvider: FactoryProvider<VNPay> = {
  provide: VNPAY_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): VNPay => {
    const tmnCode = configService.get<string>('VNPAY_TMN_CODE');
    const secureSecret = configService.get<string>('VNPAY_HASH_SECRET');
    const vnpayHost =
      configService.get<string>('VNPAY_HOST') || 'https://sandbox.vnpayment.vn';
    const testMode =
      configService.get<string>('VNPAY_TEST_MODE') === 'true' ||
      configService.get<string>('NODE_ENV') !== 'production';

    if (!tmnCode || !secureSecret) {
      throw new ApiException(
        500,
        'VNPAY_CONFIG_INVALID',
        'Cấu hình VNPay không hợp lệ: thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET',
      );
    }

    return new VNPay({
      tmnCode,
      secureSecret,
      vnpayHost,
      testMode,
      hashAlgorithm: HashAlgorithm.SHA512,
      loggerFn: ignoreLogger,
    });
  },
};
