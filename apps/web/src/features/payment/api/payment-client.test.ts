import { describe, expect, it, vi, afterEach } from "vitest";
import {
  verifyReturnUrl,
  createVnpayUrl,
  getPaymentByOrder,
  relayIpn,
} from "./payment-client";

describe("payment-client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("verifyReturnUrl sends request to configured NEXT_PUBLIC_API_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          isValid: true,
          isSuccess: true,
          orderId: "ord-123",
          orderNumber: "ORD-2026-001",
          paymentId: "pay-123",
          amount: "1110000",
          responseCode: "00",
          responseMessage: "Giao dịch thành công",
          paymentStatus: "PAID",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    globalThis.fetch = fetchMock;

    const result = await verifyReturnUrl("vnp_Amount=111000000&vnp_ResponseCode=00");

    expect(result.isValid).toBe(true);
    expect(result.isSuccess).toBe(true);
    expect(result.orderNumber).toBe("ORD-2026-001");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/payments/vnpay/return?vnp_Amount=111000000&vnp_ResponseCode=00",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("createVnpayUrl calls authorized request with correct path", async () => {
    const mockAuthorizedRequest = vi.fn().mockResolvedValue({
      paymentId: "pay-1",
      orderId: "ord-1",
      paymentUrl: "https://sandbox.vnpayment.vn/...",
      txnRef: "REF-1",
      nextAction: "REDIRECT_TO_PAYMENT",
    });

    const result = await createVnpayUrl(mockAuthorizedRequest, "pay-1");

    expect(mockAuthorizedRequest).toHaveBeenCalledWith(
      "/api/v1/payments/pay-1/vnpay/create-url",
      { method: "POST" },
    );
    expect(result.paymentId).toBe("pay-1");
  });

  it("getPaymentByOrder calls authorized request with correct path", async () => {
    const mockAuthorizedRequest = vi.fn().mockResolvedValue({
      id: "pay-1",
      orderId: "ord-1",
      orderNumber: "ORD-1",
      method: "ONLINE",
      status: "PAID",
      amount: "100000",
      currency: "VND",
      provider: "VNPAY",
      paidAt: null,
      failedAt: null,
      canRetry: false,
      latestAttempt: null,
    });

    const result = await getPaymentByOrder(mockAuthorizedRequest, "ord-1");

    expect(mockAuthorizedRequest).toHaveBeenCalledWith(
      "/api/v1/payments/order/ord-1",
    );
    expect(result.orderNumber).toBe("ORD-1");
  });

  it("relayIpn sends query string to IPN webhook endpoint", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          RspCode: "00",
          Message: "Confirm Success",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    globalThis.fetch = fetchMock;

    await relayIpn("vnp_Amount=10000000&vnp_TxnRef=PAY-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/webhooks/payments/vnpay/ipn?vnp_Amount=10000000&vnp_TxnRef=PAY-123",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});

