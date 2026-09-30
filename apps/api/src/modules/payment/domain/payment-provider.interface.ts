import {
  CreatePaymentUrlInput,
  CreatePaymentUrlOutput,
  VerifyCallbackInput,
  VerifyCallbackOutput,
} from './payment.types';

export abstract class PaymentProvider {
  abstract readonly providerName: string;
  abstract createPaymentUrl(
    input: CreatePaymentUrlInput,
  ): Promise<CreatePaymentUrlOutput> | CreatePaymentUrlOutput;
  abstract verifyCallback(
    input: VerifyCallbackInput,
  ): Promise<VerifyCallbackOutput> | VerifyCallbackOutput;
  abstract verifyIpn(
    input: VerifyCallbackInput,
  ): Promise<VerifyCallbackOutput> | VerifyCallbackOutput;
}
