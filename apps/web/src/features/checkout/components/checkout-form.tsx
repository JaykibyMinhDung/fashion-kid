"use client";

import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Address } from "@/features/addresses/contracts";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import type { CartResponse } from "@/features/cart/api/cart-client";
import {
  calculateShippingQuote,
  createCheckoutOrder,
} from "../api/checkout-client";
import type { ShippingQuote } from "../contracts";
import { CheckoutAddressSelector } from "./checkout-address-selector";
import { CheckoutOrderSummary } from "./checkout-order-summary";

export function CheckoutForm({
  cart,
  addresses,
  onSuccess,
}: {
  cart: CartResponse;
  addresses: Address[];
  onSuccess(orderNumber: string): void;
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

  // Calculate total amount in string
  let calculatedTotal: string | null = null;
  try {
    const subtotalBig = BigInt(cart.subtotal);
    const shippingBig = BigInt(shippingQuote?.fee ?? "0");
    calculatedTotal = (subtotalBig + shippingBig).toString();
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
        paymentMethod: "COD",
        quoteFingerprint: shippingQuote.quoteFingerprint,
        customerNote: customerNote.trim() || null,
      });

      onSuccess(response.orderNumber);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
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
        {/* Left Column: Address, Payment, Note */}
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
            <Card className="rounded-2xl border-brand bg-brand/5 p-4 ring-2 ring-brand/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
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
                <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
              </div>
            </Card>
          </div>

          {/* 3. Customer Note */}
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
            ) : (
              "Xác nhận đặt hàng COD"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
