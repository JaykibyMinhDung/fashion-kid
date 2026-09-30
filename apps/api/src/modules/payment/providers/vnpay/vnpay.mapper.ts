import {
  InpOrderAlreadyConfirmed,
  IpnFailChecksum,
  IpnInvalidAmount,
  IpnOrderNotFound,
  type IpnResponse,
  IpnSuccess,
  IpnUnknownError,
  type VerifyReturnUrl,
} from 'vnpay';
import { VerifyCallbackOutput } from '../../domain/payment.types';

export const IpnOrderAlreadyConfirmed: IpnResponse = InpOrderAlreadyConfirmed;

export {
  IpnSuccess,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  InpOrderAlreadyConfirmed,
  IpnUnknownError,
  type IpnResponse,
};

export function mapVnPayVerifyToResult(
  verify: VerifyReturnUrl,
  rawParams: Record<string, unknown>,
): VerifyCallbackOutput {
  const isVerified = Boolean(verify.isVerified);
  const isSuccess = Boolean(verify.isSuccess);
  const txnRef = String(verify.vnp_TxnRef || '');
  const providerTransactionId = verify.vnp_TransactionNo
    ? String(verify.vnp_TransactionNo)
    : undefined;
  const responseCode =
    verify.vnp_ResponseCode !== undefined
      ? String(verify.vnp_ResponseCode)
      : undefined;

  let amount: bigint | undefined = undefined;
  const rawVnpAmount = rawParams['vnp_Amount'];
  if (
    typeof verify.vnp_Amount === 'number' &&
    !Number.isNaN(verify.vnp_Amount)
  ) {
    amount = BigInt(Math.round(verify.vnp_Amount)) / 100n;
  } else if (typeof rawVnpAmount === 'string' && /^\d+$/.test(rawVnpAmount)) {
    amount = BigInt(rawVnpAmount) / 100n;
  } else if (
    typeof rawVnpAmount === 'number' &&
    Number.isFinite(rawVnpAmount)
  ) {
    amount = BigInt(Math.round(rawVnpAmount)) / 100n;
  }

  const responseMessage =
    verify.message ||
    (isSuccess ? 'Giao dịch thành công' : 'Giao dịch không thành công');

  return {
    isValid: isVerified,
    isSuccess,
    txnRef,
    amount,
    providerTransactionId,
    responseCode,
    responseMessage,
    rawParams,
  };
}
