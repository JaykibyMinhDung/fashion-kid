import { apiRequest } from '@/lib/api/api-client';
import type { AuthContextValue } from '@/features/auth/session/auth-provider';
import type {
  CreateVnpayUrlResponse,
  PaymentDetailResponse,
  VnPayReturnResponse,
} from '../contracts';

type AuthorizedRequest = AuthContextValue['authorizedRequest'];

export function createVnpayUrl(
  request: AuthorizedRequest,
  paymentId: string,
): Promise<CreateVnpayUrlResponse> {
  return request<CreateVnpayUrlResponse>(
    `/api/v1/payments/${encodeURIComponent(paymentId)}/vnpay/create-url`,
    {
      method: 'POST',
    },
  );
}

export function getPaymentByOrder(
  request: AuthorizedRequest,
  orderId: string,
): Promise<PaymentDetailResponse> {
  return request<PaymentDetailResponse>(
    `/api/v1/payments/order/${encodeURIComponent(orderId)}`,
  );
}

export async function verifyReturnUrl(
  searchParams: string,
): Promise<VnPayReturnResponse> {
  const query = searchParams.startsWith('?')
    ? searchParams
    : `?${searchParams}`;
  try {
    return await apiRequest<VnPayReturnResponse>(
      `/api/v1/payments/vnpay/return${query}` as `/${string}`,
    );
  } catch {
    return {
      isValid: false,
      isSuccess: false,
      orderId: '',
      orderNumber: '',
      paymentId: '',
      amount: '0',
      responseMessage: 'Không thể kết nối đến máy chủ xác thực',
      paymentStatus: 'PENDING',
    };
  }
}

export async function relayIpn(searchParams: string): Promise<void> {
  const query = searchParams.startsWith('?')
    ? searchParams
    : `?${searchParams}`;
  try {
    await apiRequest<unknown>(
      `/api/v1/webhooks/payments/vnpay/ipn${query}` as `/${string}`,
    );
  } catch (error) {
    // Non-blocking relay attempt for local/fallback environments
    console.warn('Relay IPN attempt encountered an issue:', error);
  }
}


