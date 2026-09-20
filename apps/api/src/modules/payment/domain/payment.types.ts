export interface CreatePaymentUrlInput {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: bigint;
  currency: string;
  ipAddress: string;
  attemptRef: string;
  orderInfo?: string;
}

export interface CreatePaymentUrlOutput {
  paymentUrl: string;
  txnRef: string;
  expiresAt: Date;
}

export interface VerifyCallbackInput {
  params: Record<string, string | string[] | undefined>;
}

export interface VerifyCallbackOutput {
  isValid: boolean;
  isSuccess: boolean;
  txnRef: string;
  amount?: bigint;
  providerTransactionId?: string;
  responseCode?: string;
  responseMessage?: string;
  rawParams?: Record<string, unknown>;
}
