export type CreateVnpayUrlResponse = {
  paymentId: string;
  orderId: string;
  paymentUrl: string;
  txnRef: string;
  expiresAt?: string;
  nextAction: 'REDIRECT_TO_PAYMENT';
};

export type PaymentAttemptSummary = {
  attemptRef: string;
  status: string;
  createdAt: string;
};

export type PaymentDetailResponse = {
  id: string;
  orderId: string;
  orderNumber?: string;
  method: 'COD' | 'ONLINE';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  amount: string;
  currency: string;
  provider?: string | null;
  paidAt?: string | null;
  failedAt?: string | null;
  canRetry: boolean;
  latestAttempt?: PaymentAttemptSummary | null;
};

export type VnPayReturnResponse = {
  isValid: boolean;
  isSuccess: boolean;
  orderId: string;
  orderNumber: string;
  paymentId: string;
  amount: string;
  responseCode?: string;
  responseMessage: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
};
