import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../common/errors/api-error';
import { PaymentProvider } from '../../domain/payment-provider.interface';
import {
  CreatePaymentUrlInput,
  CreatePaymentUrlOutput,
  VerifyCallbackInput,
  VerifyCallbackOutput,
} from '../../domain/payment.types';

@Injectable()
export class CodPaymentProvider extends PaymentProvider {
  readonly providerName = 'COD';

  createPaymentUrl(_input: CreatePaymentUrlInput): CreatePaymentUrlOutput {
    void _input;
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'PAYMENT_INVALID_STATE',
      'Không hỗ trợ tạo URL thanh toán cho đơn hàng COD',
    );
  }

  verifyCallback(_input: VerifyCallbackInput): VerifyCallbackOutput {
    void _input;
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'PAYMENT_INVALID_STATE',
      'Không hỗ trợ callback cho đơn hàng COD',
    );
  }

  verifyIpn(_input: VerifyCallbackInput): VerifyCallbackOutput {
    void _input;
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'PAYMENT_INVALID_STATE',
      'Không hỗ trợ IPN cho đơn hàng COD',
    );
  }
}
