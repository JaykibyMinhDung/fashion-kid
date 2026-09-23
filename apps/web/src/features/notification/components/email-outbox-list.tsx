"use client";

import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { getEmailOutboxList } from "../api/outbox-client";
import type {
  EmailOutboxListResponse,
  EmailOutboxStatus,
} from "../contracts";

const PAGE_LIMIT = 20;

const TEMPLATE_LABELS: Record<string, { label: string; color: string }> = {
  "invoice-issued": { label: "Hoá đơn GTGT", color: "bg-blue-50 text-blue-700 border-blue-200" },
  "password-reset": { label: "Đặt lại mật khẩu", color: "bg-amber-50 text-amber-700 border-amber-200" },
  "email-verification": { label: "Xác thực email", color: "bg-purple-50 text-purple-700 border-purple-200" },
  "order-confirmed": { label: "Xác nhận đơn", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "order-packing": { label: "Đang đóng gói", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  "order-shipping": { label: "Đang giao hàng", color: "bg-sky-50 text-sky-700 border-sky-200" },
  "order-delivered": { label: "Đã giao hàng", color: "bg-teal-50 text-teal-700 border-teal-200" },
  "order-cancelled": { label: "Đã huỷ đơn", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: EmailOutboxStatus }) {
  if (status === "SENT") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Đã gửi
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
        Thất bại
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      Đang chờ
    </span>
  );
}

export function EmailOutboxList() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<EmailOutboxListResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  useEffect(() => {
    let active = true;
    void getEmailOutboxList(authorizedRequest, {
      page,
      limit: PAGE_LIMIT,
      status: (statusFilter as EmailOutboxStatus) || undefined,
    }).then(
      (data) => {
        if (active) {
          setResult(data);
          setError(null);
          setLoading(false);
        }
      },
      (caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiClientError
              ? caught.message
              : "Không thể tải hàng đợi email. Vui lòng thử lại sau.",
          );
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [authorizedRequest, page, statusFilter, reloadTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const items = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị hệ thống"
        title="Hàng đợi Email (Outbox)"
        description="Giám sát trạng thái gửi email tự động qua Outbox Pattern (hoá đơn, đổi mật khẩu, xác thực, cập nhật đơn)."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/audit-logs"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-soft shadow-sm transition-colors"
            >
              <FileText className="size-4 text-muted" />
              Nhật ký kiểm toán
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-foreground">
            Lọc theo trạng thái:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Tất cả", value: "" },
              { label: "Đang chờ (PENDING)", value: "PENDING" },
              { label: "Đã gửi (SENT)", value: "SENT" },
              { label: "Thất bại (FAILED)", value: "FAILED" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatusFilter(option.value);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === option.value
                    ? "bg-brand text-white shadow-sm"
                    : "bg-surface-soft text-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      {/* Table Section */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-soft text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Người nhận</th>
                <th className="px-4 py-3">Mẫu thông báo</th>
                <th className="px-4 py-3">Lần thử</th>
                <th className="px-4 py-3">Tạo lúc</th>
                <th className="px-4 py-3">Gửi lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted">
                    <LoaderCircle className="mx-auto size-6 animate-spin text-brand" />
                    <p className="mt-2 text-xs">Đang tải danh sách email…</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="Không có email nào"
                      description="Chưa có yêu cầu gửi email nào phù hợp với bộ lọc hiện tại."
                    />
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const tInfo = TEMPLATE_LABELS[item.template] ?? {
                    label: item.template,
                    color: "bg-surface-soft text-foreground border-border",
                  };

                  return (
                    <Fragment key={item.id}>
                      <tr
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.id)
                        }
                        className="cursor-pointer transition hover:bg-surface-soft"
                      >
                        <td className="px-4 py-3.5 text-muted">
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {item.toEmail}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${tInfo.color}`}
                          >
                            {tInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted">
                          <span className="font-mono font-semibold text-foreground">
                            {item.attempts}
                          </span>
                          /{item.maxAttempts}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted">
                          {formatDateTime(item.sentAt)}
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="bg-surface-soft/60">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-4 text-xs">
                                <div>
                                  <span className="font-semibold text-muted">
                                    Dedupe Key:{" "}
                                  </span>
                                  <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-foreground">
                                    {item.dedupeKey}
                                  </code>
                                </div>
                                {item.status === "PENDING" ? (
                                  <div className="flex items-center gap-1 text-amber-700">
                                    <Clock className="size-3.5" />
                                    <span>
                                      Lần thử tiếp theo:{" "}
                                      {formatDateTime(item.nextAttemptAt)}
                                    </span>
                                  </div>
                                ) : null}
                              </div>

                              {item.lastError ? (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                                  <p className="font-semibold text-rose-800 mb-1">
                                    Lỗi gửi gần nhất:
                                  </p>
                                  <pre className="whitespace-pre-wrap font-mono">
                                    {item.lastError}
                                  </pre>
                                </div>
                              ) : null}

                              <div>
                                <p className="mb-1 text-xs font-bold text-muted">
                                  Dữ liệu mẫu (Payload):
                                </p>
                                <pre className="max-h-60 overflow-auto rounded-lg border border-border bg-surface p-3 text-xs leading-5 text-foreground">
                                  {JSON.stringify(item.payload, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <p className="text-xs text-muted">
            Tổng cộng: <strong className="text-foreground">{total}</strong> thư mục
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
            >
              Trang trước
            </Button>
            <span className="text-xs text-muted">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
