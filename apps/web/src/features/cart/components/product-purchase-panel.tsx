"use client";

import { Check, LoaderCircle, Minus, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api/api-client";
import { type CatalogVariant } from "@/features/catalog/api/catalog-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { formatCurrency } from "@/lib/utils";
import { addCartItem } from "../api/cart-client";

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.";
}

export function ProductPurchasePanel({
  variants,
}: {
  variants: CatalogVariant[];
}) {
  const router = useRouter();
  const { status, user, authorizedRequest } = useAuth();
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => variants.find((variant) => variant.id === selectedId) ?? variants[0],
    [selectedId, variants],
  );

  const submit = async () => {
    if (!selected || pending) return;
    if (status !== "authenticated" || !user || user.role !== "CUSTOMER") {
      router.push(`/auth/login?returnUrl=${encodeURIComponent("/cart")}`);
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await addCartItem(authorizedRequest, {
        variantId: selected.id,
        quantity,
      });
      setMessage(`Đã thêm ${quantity} sản phẩm vào giỏ hàng.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  if (!selected) {
    return (
      <p className="mt-8 text-sm text-muted">
        Sản phẩm hiện chưa có biến thể bán.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xl font-black text-brand-strong">
          {formatCurrency(selected.price)}
        </span>
        <span className="font-mono text-xs text-muted">{selected.sku}</span>
      </div>
      <fieldset className="mt-6">
        <legend className="text-sm font-bold">Chọn biến thể</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {variants.map((variant) => (
            <label key={variant.id} className="cursor-pointer">
              <input
                type="radio"
                name="variant"
                value={variant.id}
                checked={variant.id === selected.id}
                onChange={() => {
                  setSelectedId(variant.id);
                  setMessage(null);
                  setError(null);
                }}
                className="peer sr-only"
              />
              <span className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm transition peer-checked:border-brand peer-checked:bg-brand-soft">
                <span className="font-semibold">
                  {variant.color.name} · {variant.size.name}
                </span>
                <span className="text-xs text-muted">
                  {formatCurrency(variant.price)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="flex h-13 items-center rounded-full border border-border bg-surface px-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="size-9 px-0"
            disabled={pending || quantity <= 1}
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            aria-label="Giảm số lượng"
          >
            <Minus className="size-4" aria-hidden="true" />
          </Button>
          <span
            className="w-9 text-center text-sm font-bold"
            aria-live="polite"
          >
            {quantity}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="size-9 px-0"
            disabled={pending || quantity >= 99}
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            aria-label="Tăng số lượng"
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <Button
          size="lg"
          className="flex-1 sm:min-w-64"
          disabled={pending}
          onClick={() => void submit()}
        >
          {pending ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingBag className="size-5" aria-hidden="true" />
          )}
          {pending ? "Đang thêm…" : "Thêm vào giỏ hàng"}
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-sm font-semibold text-sage"
        >
          <Check className="size-4" aria-hidden="true" /> {message}
        </p>
      ) : null}
      <p className="mt-4 text-xs text-muted">
        Cần đăng nhập để lưu giỏ hàng. Thêm vào giỏ không giữ hàng; tồn kho sẽ
        được kiểm tra lại khi thanh toán.
      </p>
    </div>
  );
}
