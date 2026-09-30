"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Home,
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/session/auth-provider";
import {
  createVnpayUrl,
  getPaymentByOrder,
  relayIpn,
  verifyReturnUrl,
} from "@/features/payment/api/payment-client";
import type { VnPayReturnResponse } from "@/features/payment/contracts";

function formatCurrency(amount: string | number): string {
  try {
    const num = typeof amount === "string" ? BigInt(amount) : BigInt(Math.floor(amount));
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num);
  } catch {
    return `${amount} đ`;
  }
}

function PaymentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authorizedRequest } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(() =>
    Boolean(searchParams.toString()),
  );
  const [verification, setVerification] = useState<VnPayReturnResponse | null>(
    null,
  );
  const [paymentStatus, setPaymentStatus] = useState<string>("PENDING");
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pollCount, setPollCount] = useState<number>(0);

  useEffect(() => {
    const query = searchParams.toString();
    if (!query) {
      return;
    }

    let isMounted = true;

    verifyReturnUrl(query)
      .then(async (res) => {
        if (!isMounted) return;
        setVerification(res);
        setPaymentStatus(res.paymentStatus);
        setIsLoading(false);

        // Proactively relay the signed query to authoritative IPN webhook (handles localhost and avoids delay)
        if (res.isValid && res.isSuccess && res.paymentStatus === "PENDING") {
          await relayIpn(query);
          if (!isMounted) return;
          if (res.orderId) {
            try {
              const detail = await getPaymentByOrder(authorizedRequest, res.orderId);
              if (isMounted && detail.status === "PAID") {
                setPaymentStatus("PAID");
              }
            } catch {
              // fallback to polling
            }
          }
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authorizedRequest, searchParams]);

  // Polling mechanism if return is successful but DB is still PENDING (Return before IPN)
  useEffect(() => {
    if (
      !verification ||
      !verification.isValid ||
      !verification.isSuccess ||
      paymentStatus === "PAID" ||
      pollCount >= 10 ||
      !verification.orderId
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      const query = searchParams.toString();
      if (query && (pollCount === 0 || pollCount === 2)) {
        await relayIpn(query);
      }

      getPaymentByOrder(authorizedRequest, verification.orderId)
        .then((detail) => {
          if (detail.status === "PAID") {
            setPaymentStatus("PAID");
          } else {
            setPollCount((prev) => prev + 1);
          }
        })
        .catch(() => {
          setPollCount((prev) => prev + 1);
        });
    }, 2000);

    return () => clearTimeout(timer);
  }, [authorizedRequest, verification, paymentStatus, pollCount, searchParams]);

  async function handleManualSync() {
    const query = searchParams.toString();
    if (!verification?.orderId || !query) return;
    setIsSyncing(true);
    try {
      await relayIpn(query);
      const detail = await getPaymentByOrder(authorizedRequest, verification.orderId);
      if (detail.status === "PAID") {
        setPaymentStatus("PAID");
      }
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleRetryPayment() {
    if (!verification?.paymentId) return;
    setIsRetrying(true);

    try {
      const res = await createVnpayUrl(authorizedRequest, verification.paymentId);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    } catch {
      setIsRetrying(false);
      alert("Không thể khởi tạo lại thanh toán lúc này. Vui lòng thử lại sau.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-brand" />
        <h2 className="text-lg font-bold text-foreground">
          Đang xác thực giao dịch với VNPay...
        </h2>
        <p className="text-sm text-muted">
          Vui lòng đợi trong giây lát, hệ thống đang kiểm tra chữ ký bảo mật.
        </p>
      </div>
    );
  }

  if (!verification || !verification.isValid) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <Card className="rounded-3xl border-rose-200 bg-surface p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Chữ ký giao dịch không hợp lệ
          </h2>
          <p className="mt-2 text-sm text-muted">
            Không thể xác minh tính toàn vẹn của kết quả thanh toán từ VNPay.
            Vui lòng kiểm tra lại thông tin đơn hàng của bạn.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() => router.push("/account/orders")}
              className="rounded-xl font-semibold"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Đơn hàng của tôi
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push("/")}
              className="rounded-xl font-semibold"
            >
              <Home className="mr-2 h-4 w-4" />
              Trang chủ
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isPaid = paymentStatus === "PAID";
  const isPendingConfirm = verification.isSuccess && !isPaid;

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="rounded-3xl border-border bg-surface p-8 text-center shadow-xl">
        {/* Status Icon */}
        {isPaid ? (
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
            <CheckCircle2 className="h-10 w-10" />
          </div>
        ) : isPendingConfirm ? (
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 ring-8 ring-amber-50">
            <Clock className="h-10 w-10 animate-pulse" />
          </div>
        ) : (
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 ring-8 ring-rose-50">
            <AlertCircle className="h-10 w-10" />
          </div>
        )}

        {/* Status Title */}
        <h2 className="text-2xl font-black tracking-tight text-foreground">
          {isPaid
            ? "Thanh toán thành công!"
            : isPendingConfirm
              ? "Đang xác nhận thanh toán..."
              : "Thanh toán không thành công"}
        </h2>

        {/* Status Description */}
        <p className="mt-2 text-sm text-muted">
          {isPaid
            ? "Đơn hàng của bạn đã được thanh toán thành công qua cổng VNPay. Chúng tôi sẽ tiến hành đóng gói và giao hàng trong thời gian sớm nhất."
            : isPendingConfirm
              ? pollCount >= 10
                ? "Hệ thống đang chờ đối soát phản hồi từ VNPay. Bạn có thể nhấn 'Đồng bộ trạng thái ngay' bên dưới hoặc kiểm tra đơn hàng."
                : "Giao dịch đã được ghi nhận. Hệ thống đang tiến hành đối soát kết quả với ngân hàng qua máy chủ VNPay (IPN)..."
              : verification.responseMessage ||
                "Giao dịch đã bị huỷ hoặc xảy ra lỗi trong quá trình xử lý thanh toán."}
        </p>

        {/* Order Details Breakdown */}
        <div className="mt-6 rounded-2xl bg-surface-soft p-4 text-left text-sm space-y-2.5">
          <div className="flex justify-between">
            <span className="text-muted">Mã đơn hàng:</span>
            <span className="font-bold text-foreground">
              {verification.orderNumber || "---"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Số tiền thanh toán:</span>
            <span className="font-bold text-brand">
              {formatCurrency(verification.amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Phương thức:</span>
            <span className="font-medium text-foreground inline-flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-brand" />
              VNPay (Sandbox)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Trạng thái thanh toán:</span>
            <span
              className={`font-bold ${
                isPaid
                  ? "text-emerald-600"
                  : isPendingConfirm
                    ? "text-amber-600"
                    : "text-rose-600"
              }`}
            >
              {isPaid
                ? "Đã thanh toán (PAID)"
                : isPendingConfirm
                  ? "Đang đối soát IPN (PENDING)"
                  : "Chưa thanh toán (FAILED)"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isPaid ? (
            <>
              <Button
                variant="primary"
                onClick={() =>
                  router.push(`/account/orders/${verification.orderId}`)
                }
                className="rounded-xl font-bold h-12 px-6"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Xem chi tiết đơn hàng
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/products")}
                className="rounded-xl font-semibold h-12 px-6"
              >
                Tiếp tục mua sắm
              </Button>
            </>
          ) : isPendingConfirm ? (
            <>
              <Button
                variant="primary"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="rounded-xl font-bold h-12 px-6"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Đang đồng bộ..." : "Đồng bộ trạng thái ngay"}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/account/orders/${verification.orderId}`)
                }
                className="rounded-xl font-semibold h-12 px-6"
              >
                Xem chi tiết đơn hàng
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={handleRetryPayment}
                disabled={isRetrying}
                className="rounded-xl font-bold h-12 px-6"
              >
                {isRetrying ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo link...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Thanh toán lại
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  verification.orderId
                    ? router.push(`/account/orders/${verification.orderId}`)
                    : router.push("/account/orders")
                }
                className="rounded-xl font-semibold h-12 px-6"
              >
                Xem đơn hàng
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand" />
        </div>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
