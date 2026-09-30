"use client";

import { LoaderCircle, Plus, RefreshCw, Search } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { formatCurrency } from "@/lib/utils";
import { getCoupons, updateCouponStatus } from "../api/admin-coupon-client";
import type {
  Coupon,
  CouponListResponse,
  CouponStatus,
  CouponType,
} from "../contracts";
import { AdminCouponFormModal } from "./admin-coupon-form-modal";
import { AdminCouponUsagesModal } from "./admin-coupon-usages-modal";

const PAGE_LIMIT = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải danh sách coupon. Vui lòng thử lại.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function couponValueLabel(coupon: Coupon): string {
  if (coupon.type === "PERCENTAGE") {
    const cap = coupon.maxDiscountAmount
      ? ` (tối đa ${formatCurrency(coupon.maxDiscountAmount)})`
      : "";
    return `${coupon.value}%${cap}`;
  }
  return formatCurrency(coupon.value);
}

export function AdminCouponList() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<CouponListResponse | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CouponStatus | "">("");
  const [type, setType] = useState<CouponType | "">("");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [viewingUsages, setViewingUsages] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await getCoupons(authorizedRequest, {
          page,
          limit: PAGE_LIMIT,
          q: search || undefined,
          status: status || undefined,
          type: type || undefined,
        }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, page, search, status, type]);

  useEffect(() => {
    let active = true;
    void getCoupons(authorizedRequest, {
      page,
      limit: PAGE_LIMIT,
      q: search || undefined,
      status: status || undefined,
      type: type || undefined,
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
          setError(errorMessage(caught));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest, page, search, status, type]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const toggleStatus = async (coupon: Coupon) => {
    if (pendingId) return;
    const next: CouponStatus =
      coupon.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setPendingId(coupon.id);
    setError(null);
    setSuccess(null);
    try {
      await updateCouponStatus(authorizedRequest, coupon.id, next);
      setSuccess(
        next === "ACTIVE" ? "Đã kích hoạt coupon." : "Đã vô hiệu hoá coupon.",
      );
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  };

  const handleSaved = async (message: string) => {
    setCreateOpen(false);
    setEditing(null);
    setSuccess(message);
    setError(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mã giảm giá"
        description="Tạo và quản lý coupon FIXED/PERCENTAGE, giới hạn lượt dùng và thời gian hiệu lực."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Tạo coupon
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <form
          onSubmit={submitSearch}
          className="flex flex-wrap items-end gap-3 border-b border-border p-4"
        >
          <label className="min-w-56 flex-1 text-xs font-bold text-muted">
            Tìm kiếm
            <span className="relative mt-1 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Mã hoặc tên chương trình"
                className="pl-9"
              />
            </span>
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Loại
            <Select
              className="mt-1"
              value={type}
              onChange={(event) => {
                setPage(1);
                setType(event.target.value as CouponType | "");
              }}
            >
              <option value="">Mọi loại</option>
              <option value="FIXED_AMOUNT">Số tiền cố định</option>
              <option value="PERCENTAGE">Phần trăm</option>
            </Select>
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Trạng thái
            <Select
              className="mt-1"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as CouponStatus | "");
              }}
            >
              <option value="">Mọi trạng thái</option>
              <option value="ACTIVE">Đang kích hoạt</option>
              <option value="DISABLED">Đã vô hiệu hoá</option>
            </Select>
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            <Search className="size-4" aria-hidden="true" />
            Tìm
          </Button>
        </form>

        {error ? (
          <p role="alert" className="px-5 pt-4 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="px-5 pt-4 text-sm font-medium text-green-700">
            {success}
          </p>
        ) : null}

        {loading && !result ? (
          <p
            role="status"
            className="flex items-center gap-2 p-5 text-sm text-muted"
          >
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Đang tải danh sách coupon…
          </p>
        ) : !result ? (
          <div className="p-5">
            <Button type="button" variant="outline" onClick={() => void load()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Thử lại
            </Button>
          </div>
        ) : result.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Chưa có coupon"
              description="Tạo coupon đầu tiên hoặc thay đổi bộ lọc tìm kiếm."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-4">Mã / Tên</th>
                  <th className="px-5 py-4">Giá trị</th>
                  <th className="px-5 py-4">Điều kiện</th>
                  <th className="px-5 py-4">Giới hạn</th>
                  <th className="px-5 py-4">Hiệu lực</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((coupon) => {
                  const pending = pendingId === coupon.id;
                  return (
                    <tr key={coupon.id}>
                      <td className="px-5 py-4">
                        <p className="font-bold">{coupon.code}</p>
                        <p className="text-xs text-muted">{coupon.name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold">
                          {couponValueLabel(coupon)}
                        </span>
                        <p className="text-xs text-muted">
                          {coupon.type === "PERCENTAGE"
                            ? "Phần trăm"
                            : "Số tiền cố định"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        Đơn tối thiểu:{" "}
                        <span className="text-foreground">
                          {formatCurrency(coupon.minOrderAmount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted">
                        <p>
                          Tổng:{" "}
                          {coupon.usageLimit != null
                            ? coupon.usageLimit
                            : "∞"}
                        </p>
                        <p>
                          Mỗi người:{" "}
                          {coupon.perUserLimit != null
                            ? coupon.perUserLimit
                            : "∞"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted">
                        <p>{formatDate(coupon.startsAt)}</p>
                        <p>→ {formatDate(coupon.endsAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          className={
                            coupon.status === "ACTIVE"
                              ? "bg-sage-soft text-sage"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {coupon.status === "ACTIVE"
                            ? "Kích hoạt"
                            : "Vô hiệu hoá"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingUsages(coupon)}
                          >
                            Lượt dùng
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(coupon)}
                          >
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={Boolean(pendingId)}
                            onClick={() => void toggleStatus(coupon)}
                          >
                            {pending ? (
                              <LoaderCircle
                                className="size-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : null}
                            {coupon.status === "ACTIVE" ? "Tắt" : "Bật"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {result ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            {result.total} coupon · Trang {result.page}/
            {Math.max(result.totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Trang trước
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                page >= result.totalPages || loading || result.totalPages === 0
              }
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <AdminCouponFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {editing ? (
        <AdminCouponFormModal
          mode="edit"
          coupon={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {viewingUsages ? (
        <AdminCouponUsagesModal
          coupon={viewingUsages}
          onClose={() => setViewingUsages(null)}
        />
      ) : null}
    </div>
  );
}
