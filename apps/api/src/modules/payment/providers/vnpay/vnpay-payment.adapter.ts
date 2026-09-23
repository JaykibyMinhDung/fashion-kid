import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { dateFormat, ReturnQueryFromVNPay, VNPay } from 'vnpay';
import { ApiException } from '../../../../common/errors/api-error';
import { PaymentProvider } from '../../domain/payment-provider.interface';
import {
  CreatePaymentUrlInput,
  CreatePaymentUrlOutput,
  VerifyCallbackInput,
  VerifyCallbackOutput,
} from '../../domain/payment.types';
import { VNPAY_CLIENT } from './vnpay.client';
import { mapVnPayVerifyToResult } from './vnpay.mapper';

@Injectable()
export class VnPayPaymentAdapter extends PaymentProvider {
  readonly providerName = 'VNPAY';

  constructor(
    private readonly configService: ConfigService,
    @Inject(VNPAY_CLIENT) private readonly vnpay: VNPay,
  ) {
    super();
  }

  createPaymentUrl(input: CreatePaymentUrlInput): CreatePaymentUrlOutput {
    const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');
    if (!returnUrl) {
      throw new ApiException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'VNPAY_CONFIG_INVALID',
        'Cấu hình cổng thanh toán VNPay thiếu VNPAY_RETURN_URL',
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes TTL
    const orderInfo =
      input.orderInfo || `Thanh toan don hang ${input.orderNumber}`;

    // ⚠️ VNPay library automatically multiplies vnp_Amount by 100
    // We pass the REAL VND amount: Number(input.amount)
    const paymentUrl = this.vnpay.buildPaymentUrl({
      vnp_Amount: Number(input.amount),
      vnp_TxnRef: input.attemptRef,
      vnp_OrderInfo: orderInfo,
      vnp_IpAddr: input.ipAddress || '127.0.0.1',
      vnp_ReturnUrl: returnUrl,
      vnp_ExpireDate: dateFormat(expiresAt),
    });

    return {
      paymentUrl,
      txnRef: input.attemptRef,
      expiresAt,
    };
  }

  verifyCallback(input: VerifyCallbackInput): VerifyCallbackOutput {
    return this.verifyReturnUrl(input.params);
  }

  verifyReturnUrl(params: Record<string, unknown>): VerifyCallbackOutput {
    const query = this.normalizeParams(params);
    const verify = this.vnpay.verifyReturnUrl(query);
    return mapVnPayVerifyToResult(verify, params);
  }

  verifyIpn(input: VerifyCallbackInput): VerifyCallbackOutput {
    const query = this.normalizeParams(input.params);
    const verify = this.vnpay.verifyIpnCall(query);
    return mapVnPayVerifyToResult(verify, input.params);
  }

  private normalizeParams(
    params: Record<string, unknown>,
  ): ReturnQueryFromVNPay {
    const clean: Record<string, string | number> = {};
    for (const [key, rawValue] of Object.entries(params)) {
      if (typeof rawValue === 'string' || typeof rawValue === 'number') {
        clean[key] = rawValue;
      } else if (Array.isArray(rawValue) && rawValue.length > 0) {
        const first: unknown = rawValue[0];
        if (typeof first === 'string' || typeof first === 'number') {
          clean[key] = first;
        }
      }
    }
    return clean as unknown as ReturnQueryFromVNPay;
  }
}
