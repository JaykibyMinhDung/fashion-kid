"use client";

import {
  AlertTriangle,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAddresses } from "@/features/addresses/api/address-client";
import type { Address } from "@/features/addresses/contracts";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { getCart, type CartResponse } from "@/features/cart/api/cart-client";
import { CheckoutForm } from "./checkout-form";

export function CheckoutView() {
  const { authorizedRequest } = useAuth();
  const router = useRouter();

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getCart(authorizedRequest), getAddresses(authorizedRequest)])
      .then(([cartData, addressList]) => {
        if (isMounted) {
          setCart(cartData);
          setAddresses(addressList);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const msg =
            err instanceof ApiClientError
              ? err.message
              : "Không thể tải thông tin thanh toán. Vui lòng thử lại.";
          setLoadError(msg);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authorizedRequest]);

  function handleSuccess(orderNumber: string, paymentMethod: "COD" | "ONLINE") {
    const params = new URLSearchParams({ payment: paymentMethod });
    router.push(`/order-success/${orderNumber}?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-brand" />
        <p className="mt-3 text-sm font-semibold text-muted">
          Đang chuẩn bị thông tin thanh toán...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Đã xảy ra lỗi khi tải dữ liệu
        </h2>
        <p className="mt-2 text-sm text-muted">{loadError}</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/cart" variant="outline">
            Quay lại giỏ hàng
          </ButtonLink>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader
          title="Thanh toán đơn hàng"
          description="Kiểm tra thông tin giao hàng và xác nhận đơn"
        />
        <EmptyState
          title="Giỏ hàng của bạn đang trống"
          description="Hãy thêm sản phẩm yêu thích vào giỏ hàng trước khi tiến hành thanh toán nhé."
          action={
            <ButtonLink href="/products" variant="primary">
              Khám phá sản phẩm
            </ButtonLink>
          }
        />
      </div>
    );
  }

  if (!cart.isCheckoutReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <PageHeader
          title="Thanh toán đơn hàng"
          description="Kiểm tra thông tin giao hàng và xác nhận đơn"
        />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-bold">
                Giỏ hàng có sản phẩm cần được cập nhật
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Một số món đồ trong giỏ của bạn đã hết hàng hoặc không còn đủ số
                lượng tồn kho khả dụng để đặt hàng. Vui lòng kiểm tra lại giỏ
                hàng trước khi thanh toán.
              </p>
              <div className="pt-2">
                <ButtonLink href="/cart" variant="primary" size="sm">
                  Quay lại giỏ hàng để cập nhật
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Thanh toán đơn hàng"
          description="Kiểm tra thông tin giao nhận và xác nhận đặt hàng"
        />
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại giỏ hàng
        </Link>
      </div>

      <CheckoutForm
        cart={cart}
        addresses={addresses}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
