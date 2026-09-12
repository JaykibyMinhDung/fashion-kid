"use client";

import {
  AlertTriangle,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { formatCurrency } from "@/lib/utils";
import {
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
  type CartItem,
  type CartResponse,
} from "../api/cart-client";

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Không thể cập nhật giỏ hàng. Vui lòng thử lại.";
}

function warningLabel(item: CartItem): string | null {
  switch (item.warning) {
    case "OUT_OF_STOCK":
      return "Đã hết hàng";
    case "INSUFFICIENT_AVAILABLE_STOCK":
      return `Chỉ còn ${item.maxAvailableForPreview ?? 0} sản phẩm`;
    case "VARIANT_NOT_SELLABLE":
      return "Không còn bán";
    default:
      return null;
  }
}

function CartItemRow({
  item,
  pending,
  onUpdate,
  onRemove,
}: {
  item: CartItem;
  pending: boolean;
  onUpdate(item: CartItem, quantity: number): void;
  onRemove(item: CartItem): void;
}) {
  const imageUrl = item.primaryImage?.url ?? "/images/kids-fashion-hero.png";
  const warning = warningLabel(item);
  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div
        className="h-28 w-28 shrink-0 rounded-2xl bg-cover bg-center bg-surface-soft"
        style={{ backgroundImage: `url("${imageUrl}")` }}
        role="img"
        aria-label={item.primaryImage?.altText ?? item.product.name}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/products/${item.product.slug}`}
              className="font-bold hover:text-brand-strong"
            >
              {item.product.name}
            </Link>
            <p className="mt-1 text-xs text-muted">
              {item.color.name} · Size {item.size.name} · SKU {item.sku}
            </p>
          </div>
          <p className="font-bold text-brand-strong">
            {formatCurrency(item.lineSubtotal)}
          </p>
        </div>
        {warning ? (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#9a6734]">
            <AlertTriangle className="size-4" aria-hidden="true" />
            {warning}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">
            {formatCurrency(item.currentUnitPrice)} / sản phẩm
          </span>
          <div className="flex items-center gap-2">
            <div className="flex h-9 items-center rounded-full border border-border bg-surface px-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="size-8 px-0"
                disabled={pending || item.quantity <= 1}
                onClick={() => onUpdate(item, item.quantity - 1)}
                aria-label={`Giảm ${item.product.name}`}
              >
                <Minus className="size-4" aria-hidden="true" />
              </Button>
              <span
                className="w-8 text-center text-sm font-bold"
                aria-live="polite"
              >
                {item.quantity}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="size-8 px-0"
                disabled={pending}
                onClick={() => onUpdate(item, item.quantity + 1)}
                aria-label={`Tăng ${item.product.name}`}
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted hover:text-red-700"
              disabled={pending}
              onClick={() => onRemove(item)}
              aria-label={`Xóa ${item.product.name}`}
            >
              {pending ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Xóa</span>
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartView() {
  const { authorizedRequest } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void getCart(authorizedRequest).then(
      (loaded) => {
        if (active) {
          setCart(loaded);
          setError(null);
          setLoading(false);
        }
      },
      (caught: unknown) => {
        if (active) {
          setError(errorMessage(caught));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest, reloadKey]);

  const update = async (item: CartItem, quantity: number) => {
    if (pendingId) return;
    setPendingId(item.cartItemId);
    setError(null);
    try {
      setCart(
        await updateCartItem(authorizedRequest, item.cartItemId, { quantity }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
      setReloadKey((value) => value + 1);
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (item: CartItem) => {
    if (pendingId || !window.confirm(`Xóa ${item.product.name} khỏi giỏ hàng?`))
      return;
    setPendingId(item.cartItemId);
    setError(null);
    try {
      setCart(await removeCartItem(authorizedRequest, item.cartItemId));
    } catch (caught) {
      setError(errorMessage(caught));
      setReloadKey((value) => value + 1);
    } finally {
      setPendingId(null);
    }
  };

  const clear = async () => {
    if (pendingId || !window.confirm("Xóa toàn bộ sản phẩm trong giỏ hàng?"))
      return;
    setPendingId("clear");
    setError(null);
    try {
      setCart(await clearCart(authorizedRequest));
    } catch (caught) {
      setError(errorMessage(caught));
      setReloadKey((value) => value + 1);
    } finally {
      setPendingId(null);
    }
  };

  if (loading && !cart) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Đang tải giỏ hàng…
        </p>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => {
            setLoading(true);
            setReloadKey((value) => value + 1);
          }}
        >
          <RefreshCw className="size-4" aria-hidden="true" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Cart · M4"
        title="Giỏ hàng của bạn"
        description="Giá và khả dụng được tính lại từ Catalog và Inventory hiện tại. Thêm vào giỏ không giữ hàng."
        action={
          cart.items.length ? (
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(pendingId)}
              onClick={() => void clear()}
            >
              <Trash2 className="size-4" aria-hidden="true" /> Xóa giỏ hàng
            </Button>
          ) : null
        }
      />

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      {!cart.items.length ? (
        <div className="mt-8">
          <EmptyState
            title="Giỏ hàng đang trống"
            description="Chọn một sản phẩm phù hợp để bắt đầu hành trình mua sắm cho bé."
            action={
              <ButtonLink href="/products">
                <ShoppingBag className="size-4" aria-hidden="true" /> Xem sản
                phẩm
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.cartItemId}
                    item={item}
                    pending={
                      pendingId === item.cartItemId || pendingId === "clear"
                    }
                    onUpdate={(nextItem, quantity) =>
                      void update(nextItem, quantity)
                    }
                    onRemove={(nextItem) => void remove(nextItem)}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="h-fit lg:sticky lg:top-28">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">Tóm tắt đơn</h2>
                <Badge>{cart.itemCount} sản phẩm</Badge>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                <span className="font-semibold">Tạm tính</span>
                <span className="text-xl font-black text-brand-strong">
                  {formatCurrency(cart.subtotal)}
                </span>
              </div>
              {cart.warnings.length ? (
                <p className="mt-4 text-sm leading-6 text-[#9a6734]">
                  Vui lòng xử lý {cart.warnings.length} cảnh báo trước khi thanh
                  toán.
                </p>
              ) : null}
              {cart.isCheckoutReady && !pendingId ? (
                <ButtonLink
                  href="/checkout"
                  className="mt-6 w-full text-center"
                  size="lg"
                >
                  Tiếp tục thanh toán
                </ButtonLink>
              ) : (
                <Button
                  className="mt-6 w-full"
                  size="lg"
                  disabled
                >
                  Tiếp tục thanh toán
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-muted">
                Hỗ trợ thanh toán khi nhận hàng (COD). Kiểm tra tồn kho trước khi đặt.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
