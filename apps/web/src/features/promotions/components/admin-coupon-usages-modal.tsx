"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { formatCurrency } from "@/lib/utils";
import { getCouponUsages } from "../api/admin-coupon-client";
import type { Coupon, CouponUsageListResponse } from "../contracts";

const PAGE_LIMIT = 20;

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminCouponUsagesModal({
  coupon,
  onClose,
}: {
  coupon: Coupon;
  onClose(): void;
}) {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<CouponUsageListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getCouponUsages(authorizedRequest, coupon.id, {
      page,
      limit: PAGE_LIMIT,
    }).then(
      (loaded) => {
        if (active) {
          setResult(loaded);
          setError(null);
          setLoading(false);
        }
      },
      (caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiClientError
              ? caught.message
              : "Không thể tải lịch sử sử dụng.",
          );
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest, coupon.id, page]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Lịch sử dùng ${coupon.code}`}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Lịch sử sử dụng · {coupon.code}
            </h2>
            <p className="text-xs text-muted">{coupon.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-1.5 text-muted hover:bg-surface-soft hover:text-foreground transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading && !result ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted"
            >
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Đang tải lịch sử…
            </p>
          ) : error ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          ) : !result || result.items.length === 0 ? (
            <EmptyState
              title="Chưa có lượt sử dụng"
              description="Coupon này chưa được áp dụng vào đơn hàng nào."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3 text-right">Giảm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.items.map((usage) => (
                      <tr key={usage.id}>
                        <td className="px-4 py-3 text-muted">
                          {formatDateTime(usage.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {usage.user ? (
                            <>
                              <p className="font-semibold">
                                {usage.user.fullName}
                              </p>
                              <p className="text-xs text-muted">
                                {usage.user.email}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs italic text-muted">
                              Không rõ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          -{formatCurrency(usage.discountAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                <span>
                  {result.total} lượt · Trang {result.page}/
                  {Math.max(result.totalPages, 1)}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1 || loading}
                    onClick={() => {
                      setLoading(true);
                      setPage((v) => v - 1);
                    }}
                  >
                    Trang trước
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      page >= result.totalPages ||
                      loading ||
                      result.totalPages === 0
                    }
                    onClick={() => {
                      setLoading(true);
                      setPage((v) => v + 1);
                    }}
                  >
                    Trang sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
