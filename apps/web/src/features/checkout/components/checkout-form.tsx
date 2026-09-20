"use client";

import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Address } from "@/features/addresses/contracts";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import type { CartResponse } from "@/features/cart/api/cart-client";
import {
  calculateShippingQuote,
  createCheckoutOrder,
} from "../api/checkout-client";
import { createVnpayUrl } from "@/features/payment/api/payment-client";
import type { AppliedCoupon, ShippingQuote } from "../contracts";
import { CheckoutAddressSelector } from "./checkout-address-selector";
import { CheckoutCouponField } from "./checkout-coupon-field";
import { CheckoutOrderSummary } from "./checkout-order-summary";

function safeBigInt(value: string | null | undefined): bigint {
  if (!value) return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

export function CheckoutForm({
  cart,
  addresses,
  onSuccess,
}: {
  cart: CartResponse;
  addresses: Address[];
  onSuccess(orderNumber: string, paymentMethod: "COD" | "ONLINE"): void;
}) {
  const { authorizedRequest } = useAuth();

  // Find initial address (default first, or first available)
  const initialAddressId =
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAddressId,
  );
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(
    null,
  );
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(
    Boolean(initialAddressId),
  );
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch shipping quote whenever address changes
  useEffect(() => {
    if (!selectedAddressId) return;

    let isMounted = true;

    calculateShippingQuote(authorizedRequest, selectedAddressId)
      .then((quote) => {
        if (isMounted) {
          setShippingQuote(quote);
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const msg =
            err instanceof ApiClientError
              ? err.message
              : "Không thể tính phí vận chuyển cho địa chỉ này";
          setErrorMessage(msg);
          setShippingQuote(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingQuote(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authorizedRequest, selectedAddressId]);

  // Calculate total amount in string: subtotal + shipping - discount (never below 0)
  const discountAmount = appliedCoupon?.discountAmount ?? "0";
  let calculatedTotal: string | null = null;
  try {
    const subtotalBig = safeBigInt(cart.subtotal);
    const shippingBig = safeBigInt(shippingQuote?.fee ?? "0");
    const discountBig = safeBigInt(discountAmount);
    const totalBig = subtotalBig + shippingBig - discountBig;
    calculatedTotal = (
      totalBig > BigInt(0) ? totalBig : BigInt(0)
    ).toString();
  } catch {
    calculatedTotal = cart.subtotal;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAddressId) {
      setErrorMessage("Vui lòng chọn địa chỉ nhận hàng.");
      return;
    }
    if (!shippingQuote) {
      setErrorMessage("Vui lòng chờ hệ thống cập nhật phí vận chuyển.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await createCheckoutOrder(authorizedRequest, {
        addressId: selectedAddressId,
        paymentMethod,
        quoteFingerprint: shippingQuote.quoteFingerprint,
        customerNote: customerNote.trim() || null,
        couponCode: appliedCoupon?.code ?? null,
      });

      if (paymentMethod === "ONLINE") {
        try {
          const vnpayRes = await createVnpayUrl(
            authorizedRequest,
            response.payment.id,
          );
          if (vnpayRes.paymentUrl) {
            window.location.href = vnpayRes.paymentUrl;
            return;
          }
        } catch (vnpayErr) {
          // VNPay URL creation failed — show error, don't silently fall back to COD page
          const msg =
            vnpayErr instanceof ApiClientError
              ? vnpayErr.message
              : "Không thể khởi tạo thanh toán VNPay. Đơn hàng đã được tạo, bạn có thể thanh toán lại từ trang chi tiết đơn hàng.";
          setErrorMessage(msg);
          // Still navigate to success page with correct payment method
          onSuccess(response.orderNumber, "ONLINE");
          return;
        }
      }

      onSuccess(response.orderNumber, paymentMethod);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
        // A coupon that turned invalid between preview and checkout (e.g. usage
        // limit hit concurrently) must be dropped so the customer can retry.
        if (err.code.startsWith("COUPON_")) {
          setAppliedCoupon(null);
        }
        if (err.code === "SHIPPING_QUOTE_STALE" && selectedAddressId) {
          setShippingQuote(null);
          setIsLoadingQuote(true);
          try {
            const freshQuote = await calculateShippingQuote(
              authorizedRequest,
              selectedAddressId,
            );
            setShippingQuote(freshQuote);
          } catch {
            // Preserve the original stale-quote message for a safe retry.
          } finally {
            setIsLoadingQuote(false);
          }
        }
      } else {
        setErrorMessage("Không thể hoàn tất đặt hàng. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Address, Payment, Coupon, Note */}
        <div className="space-y-6 lg:col-span-7">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-semibold">Lỗi thanh toán</p>
                <p className="text-xs mt-0.5 text-rose-600">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* 1. Address selection */}
          <CheckoutAddressSelector
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelect={(id) => {
              setSelectedAddressId(id);
              setShippingQuote(null);
              setIsLoadingQuote(true);
            }}
          />

          {/* 2. Payment Method */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              Phương thức thanh toán
            </h3>
            <div className="grid gap-3">
              {/* COD Option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setPaymentMethod("COD")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setPaymentMethod("COD");
                  }
                }}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  paymentMethod === "COD"
                    ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        paymentMethod === "COD"
                          ? "bg-brand/10 text-brand"
                          : "bg-surface-soft text-muted"
                      }`}
                    >
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Thanh toán khi nhận hàng (COD)
                      </h4>
                      <p className="text-xs text-muted mt-0.5">
                        Thanh toán bằng tiền mặt cho nhân viên giao hàng khi nhận
                        hàng
                      </p>
                    </div>
                  </div>
                  {paymentMethod === "COD" && (
                    <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
                  )}
                </div>
              </div>

              {/* VNPay Option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setPaymentMethod("ONLINE")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setPaymentMethod("ONLINE");
                  }
                }}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  paymentMethod === "ONLINE"
                    ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        paymentMethod === "ONLINE"
                          ? "bg-brand/10 text-brand"
                          : "bg-surface-soft text-muted"
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">
                          Thanh toán trực tuyến (VNPay Sandbox)
                        </h4>
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                          VNPay
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        Thẻ ATM nội địa, Visa, MasterCard, JCB hoặc quét mã QR Pay
                      </p>
                    </div>
                  </div>
                  {paymentMethod === "ONLINE" && (
                    <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Coupon */}
          <CheckoutCouponField
            appliedCoupon={appliedCoupon}
            onApply={setAppliedCoupon}
            onRemove={() => setAppliedCoupon(null)}
            disabled={isSubmitting}
          />

          {/* 4. Customer Note */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <label
                htmlFor="customer-note"
                className="text-sm font-bold text-foreground"
              >
                Ghi chú đơn hàng (tuỳ chọn)
              </label>
              <span className="text-xs text-muted">
                {customerNote.length}/500 ký tự
              </span>
            </div>
            <textarea
              id="customer-note"
              rows={3}
              maxLength={500}
              placeholder="Ví dụ: Giao hàng vào giờ hành chính, gọi trước khi giao..."
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface p-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition resize-none"
            />
          </div>

          {/* Safe commitment badge */}
          <div className="flex items-center gap-2 rounded-xl bg-surface-soft p-3 text-xs text-muted">
            <ShieldCheck className="h-4 w-4 text-brand shrink-0" />
            <span>
              Đơn hàng của bạn được bảo đảm an toàn với kiểm tra tồn kho và cam
              kết bảo mật thông tin.
            </span>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order CTA */}
        <div className="space-y-4 lg:col-span-5">
          <CheckoutOrderSummary
            items={cart.items}
            subtotal={cart.subtotal}
            shippingFee={shippingQuote?.fee ?? null}
            total={calculatedTotal}
            discountAmount={discountAmount}
            couponCode={appliedCoupon?.code ?? null}
            isLoadingQuote={isLoadingQuote}
          />

          <Button
            type="submit"
            size="lg"
            variant="primary"
            disabled={
              !selectedAddressId ||
              !shippingQuote ||
              isLoadingQuote ||
              isSubmitting ||
              cart.items.length === 0
            }
            className="w-full text-base font-bold shadow-md h-13"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Đang xử lý đơn hàng...
              </span>
            ) : paymentMethod === "ONLINE" ? (
              "Thanh toán qua VNPay"
            ) : (
              "Xác nhận đặt hàng COD"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
