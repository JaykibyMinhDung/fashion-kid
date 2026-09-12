"use client";

import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";

import { storeNavigation } from "@/config/navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { landingPathForRole } from "@/features/auth/role-routing";
import { useAuth } from "@/features/auth/session/auth-provider";

export function StoreHeader() {
  const { status, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="bg-foreground px-4 py-2 text-center text-xs font-medium tracking-wide text-white">
        Miễn phí vận chuyển cho đơn hàng từ 499.000đ
      </div>
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Mầm Nhỏ - Trang chủ"
        >
          <span className="grid size-9 place-items-center rounded-full bg-brand text-lg font-black text-white">
            M
          </span>
          <span className="text-xl font-black tracking-[-0.04em]">Mầm Nhỏ</span>
        </Link>

        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Danh mục chính"
        >
          {storeNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-muted transition hover:text-brand-strong"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          action="/products"
          className="ml-auto hidden max-w-xs flex-1 md:block"
        >
          <label className="relative block">
            <span className="sr-only">Tìm kiếm sản phẩm</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              type="search"
              placeholder="Tìm áo, váy, phụ kiện..."
              className="h-11 w-full rounded-full border border-border bg-surface px-11 text-sm outline-none transition placeholder:text-muted/70 focus:border-brand"
            />
          </label>
        </form>

        <div className="flex items-center gap-1">
          <Link
            href="/products"
            className="grid size-10 place-items-center rounded-full transition hover:bg-surface-soft md:hidden"
            aria-label="Tìm kiếm"
          >
            <Search className="size-5" />
          </Link>
          {status === "loading" ? (
            <span
              className="grid size-10 animate-pulse place-items-center rounded-full bg-surface-soft text-muted"
              role="status"
              aria-label="Đang kiểm tra phiên đăng nhập"
            >
              <UserRound className="size-5" aria-hidden="true" />
            </span>
          ) : status === "authenticated" && user ? (
            <>
              <Link
                href={landingPathForRole(user.role)}
                className="flex h-10 max-w-40 items-center gap-2 rounded-full px-2 transition hover:bg-surface-soft"
                aria-label={`Tài khoản của ${user.fullName}`}
                title={user.fullName}
              >
                <UserRound className="size-5 shrink-0" />
                <span className="hidden truncate text-xs font-semibold xl:block">
                  {user.fullName}
                </span>
              </Link>
              <LogoutButton
                showLabel={false}
                className="grid size-10 place-items-center rounded-full"
              />
            </>
          ) : (
            <Link
              href="/auth/login"
              className="flex h-10 items-center gap-2 rounded-full px-2 transition hover:bg-surface-soft"
              aria-label="Đăng nhập"
            >
              <UserRound className="size-5" />
              <span className="hidden text-xs font-semibold xl:block">
                Đăng nhập
              </span>
            </Link>
          )}
          <button
            className="hidden size-10 place-items-center rounded-full transition hover:bg-surface-soft sm:grid"
            aria-label="Sản phẩm yêu thích"
            type="button"
          >
            <Heart className="size-5" />
          </button>
          <Link
            href="/cart"
            className="relative grid size-10 place-items-center rounded-full transition hover:bg-surface-soft"
            aria-label="Giỏ hàng"
          >
            <ShoppingBag className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
