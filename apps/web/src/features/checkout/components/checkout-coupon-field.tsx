"use client";

import { BadgePercent, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/api-client";
import { apiErrorMessage } from "@/lib/api/error-ux";
import { useAuth } from "@/features/auth/session/auth-provider";
import { formatCurrency } from "@/lib/utils";
import { validateCoupon } from "../api/checkout-client";
import type { AppliedCoupon } from "../contracts";

const REASON_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Mã giảm giá không tồn tại.",
  DISABLED: "Mã giảm giá đã bị vô hiệu hoá.",
  NOT_STARTED: "Mã giảm giá chưa đến thời gian áp dụng.",
  EXPIRED: "Mã giảm giá đã hết hạn.",
  MIN_ORDER_NOT_MET: "Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã này.",
  USAGE_LIMIT_REACHED: "Mã giảm giá đã hết lượt sử dụng.",
  USER_LIMIT_REACHED: "Bạn đã dùng hết số lượt cho phép của mã này.",
};

function reasonMessage(reasonCode: string | null): string {
  if (reasonCode && REASON_MESSAGES[reasonCode]) {
    return REASON_MESSAGES[reasonCode];
  }
  return "Mã giảm giá không hợp lệ cho đơn hàng hiện tại.";
}

export function CheckoutCouponField({
  appliedCoupon,
  onApply,
  onRemove,
  disabled,
}: {
  appliedCoupon: AppliedCoupon | null;
  onApply(coupon: AppliedCoupon): void;
  onRemove(): void;
  disabled?: boolean;
}) {
  const { authorizedRequest } = useAuth();
  const [code, setCode] = useState<string>("");
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleApply() {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setMessage("Vui lòng nhập mã giảm giá.");
      return;
    }

    setIsValidating(true);
    setMessage(null);

    try {
      const result = await validateCoupon(authorizedRequest, normalized);

      if (!result.eligible) {
        setMessage(reasonMessage(result.reasonCode));
        return;
      }

      let discountIsPositive = false;
      try {
        discountIsPositive = BigInt(result.discountAmount) > BigInt(0);
      } catch {
        discountIsPositive = false;
      }
      if (!discountIsPositive) {
        setMessage("Mã hợp lệ nhưng chưa tạo ra giá trị giảm cho đơn hàng này.");
        return;
      }

      onApply({
        code: result.code,
        type: result.type,
        discountAmount: result.discountAmount,
      });
      setCode("");
      setMessage(null);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setMessage(apiErrorMessage(err, "Không thể kiểm tra mã giảm giá lúc này."));
      } else {
        setMessage("Không thể kiểm tra mã giảm giá lúc này. Vui lòng thử lại.");
      }
    } finally {
      setIsValidating(false);
    }
  }

  function handleRemove() {
    onRemove();
    setMessage(null);
    setCode("");
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-foreground">Mã giảm giá</h3>

      {appliedCoupon ? (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800">
                Đã áp dụng mã {appliedCoupon.code}
              </p>
              <p className="text-xs text-emerald-700">
                Giảm {formatCurrency(appliedCoupon.discountAmount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Bỏ mã
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <BadgePercent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleApply();
                  }
                }}
                placeholder="Nhập mã giảm giá"
                maxLength={50}
                disabled={disabled || isValidating}
                aria-label="Mã giảm giá"
                className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm uppercase text-foreground placeholder:normal-case placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={disabled || isValidating}
              className="shrink-0 rounded-2xl border border-brand bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 transition disabled:opacity-50"
            >
              {isValidating ? (
                <span className="inline-flex items-center gap-1.5">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Đang kiểm tra
                </span>
              ) : (
                "Áp dụng"
              )}
            </button>
          </div>
          {message && (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
