"use client";

import { LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SafeImage } from "@/components/shared/safe-image";
import type { CartItem } from "@/features/cart/api/cart-client";
import { formatCurrency } from "@/lib/utils";

function isPositiveAmount(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return BigInt(value) > BigInt(0);
  } catch {
    return false;
  }
}

export function CheckoutOrderSummary({
  items,
  subtotal,
  shippingFee,
  total,
  discountAmount,
  couponCode,
  isLoadingQuote,
}: {
  items: CartItem[];
  subtotal: string;
  shippingFee: string | null;
  total: string | null;
  discountAmount?: string | null;
  couponCode?: string | null;
  isLoadingQuote?: boolean;
}) {
  const hasDiscount = isPositiveAmount(discountAmount);

  return (
    <Card className="rounded-3xl border-border bg-surface p-6 shadow-sm">
      <CardContent className="space-y-4 p-0">
        <h3 className="text-base font-bold text-foreground">
          Đơn hàng của bạn ({items.length} món)
        </h3>

        <div className="divide-y divide-border/60 max-h-80 overflow-y-auto pr-1">
          {items.map((item) => {
            const primaryImage = item.primaryImage?.url;
            return (
              <div key={item.cartItemId} className="flex gap-3 py-3 text-sm">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-soft">
                  {primaryImage ? (
                    <SafeImage
                      src={primaryImage}
                      alt={item.product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                      No img
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground line-clamp-1 text-xs sm:text-sm">
                    {item.product.name}
                  </h4>
                  <div className="text-[11px] text-muted flex gap-2 mt-0.5">
                    <span>Size: {item.size.name}</span>
                    <span>•</span>
                    <span>Màu: {item.color.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="text-muted">SL: {item.quantity}</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.lineSubtotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-3 space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between text-muted">
            <span>Tạm tính</span>
            <span className="font-medium text-foreground">
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-muted">
            <span>Phí vận chuyển</span>
            {isLoadingQuote ? (
              <span className="inline-flex items-center gap-1 text-xs text-brand">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Đang tính cước...
              </span>
            ) : shippingFee !== null ? (
              <span className="font-medium text-foreground">
                {formatCurrency(shippingFee)}
              </span>
            ) : (
              <span className="text-xs text-muted italic">
                Chưa chọn địa chỉ
              </span>
            )}
          </div>

          <div className="flex justify-between text-muted">
            <span>
              Giảm giá
              {hasDiscount && couponCode ? (
                <span className="ml-1 font-semibold text-emerald-600">
                  ({couponCode})
                </span>
              ) : null}
            </span>
            {hasDiscount ? (
              <span className="font-semibold text-emerald-600">
                -{formatCurrency(discountAmount as string)}
              </span>
            ) : (
              <span className="font-medium text-foreground">
                {formatCurrency("0")}
              </span>
            )}
          </div>

          <div className="border-t border-border pt-3 flex justify-between items-baseline">
            <span className="text-sm font-bold text-foreground">
              Tổng thanh toán
            </span>
            <span className="text-lg font-bold text-brand">
              {total !== null
                ? formatCurrency(total)
                : formatCurrency(subtotal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
