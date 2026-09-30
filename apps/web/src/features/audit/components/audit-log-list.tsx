"use client";

import { ChevronDown, ChevronRight, LoaderCircle, Mail, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import {
  Fragment,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { getAuditLogs } from "../api/audit-client";
import type { AuditLog, AuditLogListResponse } from "../contracts";

const PAGE_LIMIT = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải nhật ký kiểm toán. Vui lòng thử lại.";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function hasContent(value: Record<string, unknown> | null): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

function JsonBlock({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) {
  if (!hasContent(value)) {
    return null;
  }
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-xs font-bold text-muted">{label}</p>
      <pre className="overflow-x-auto rounded-xl bg-surface-soft p-3 text-xs leading-5 text-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function AuditLogList() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<AuditLogListResponse | null>(null);
  const [actionDraft, setActionDraft] = useState("");
  const [entityTypeDraft, setEntityTypeDraft] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await getAuditLogs(authorizedRequest, {
          page,
          limit: PAGE_LIMIT,
          action: action || undefined,
          entityType: entityType || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, page, action, entityType, from, to]);

  useEffect(() => {
    let active = true;
    void getAuditLogs(authorizedRequest, {
      page,
      limit: PAGE_LIMIT,
      action: action || undefined,
      entityType: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
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
  }, [authorizedRequest, page, action, entityType, from, to]);

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAction(actionDraft.trim());
    setEntityType(entityTypeDraft.trim());
  };

  const toggleRow = (row: AuditLog) => {
    setExpandedId((current) => (current === row.id ? null : row.id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhật ký kiểm toán"
        description="Toàn bộ thao tác quản trị được ghi lại (chỉ đọc, không thể chỉnh sửa)."
        action={
          <Link
            href="/admin/email-outbox"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-soft shadow-sm transition-colors"
          >
            <Mail className="h-4 w-4 text-muted" />
            Hàng đợi Email
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <form
          onSubmit={submitFilters}
          className="flex flex-wrap items-end gap-3 border-b border-border p-4"
        >
          <label className="min-w-48 flex-1 text-xs font-bold text-muted">
            Hành động
            <Input
              className="mt-1"
              value={actionDraft}
              onChange={(event) => setActionDraft(event.target.value)}
              placeholder="VD: COUPON_CREATED, REVIEW_HIDDEN"
            />
          </label>
          <label className="min-w-40 flex-1 text-xs font-bold text-muted">
            Loại thực thể
            <Input
              className="mt-1"
              value={entityTypeDraft}
              onChange={(event) => setEntityTypeDraft(event.target.value)}
              placeholder="VD: Coupon, Review, User"
            />
          </label>
          <label className="w-40 text-xs font-bold text-muted">
            Từ ngày
            <Input
              className="mt-1"
              type="date"
              value={from}
              onChange={(event) => {
                setPage(1);
                setFrom(event.target.value);
              }}
            />
          </label>
          <label className="w-40 text-xs font-bold text-muted">
            Đến ngày
            <Input
              className="mt-1"
              type="date"
              value={to}
              onChange={(event) => {
                setPage(1);
                setTo(event.target.value);
              }}
            />
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            <Search className="size-4" aria-hidden="true" />
            Lọc
          </Button>
        </form>

        {error ? (
          <p role="alert" className="px-5 pt-4 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {loading && !result ? (
          <p
            role="status"
            className="flex items-center gap-2 p-5 text-sm text-muted"
          >
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Đang tải nhật ký…
          </p>
        ) : !result ? (
          <div className="space-y-4 p-5">
            <Button type="button" variant="outline" onClick={() => void load()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Thử lại
            </Button>
          </div>
        ) : result.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Chưa có nhật ký phù hợp"
              description="Thử thay đổi bộ lọc hành động, loại thực thể hoặc khoảng thời gian."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="w-8 px-3 py-4" />
                  <th className="px-5 py-4">Thời gian</th>
                  <th className="px-5 py-4">Hành động</th>
                  <th className="px-5 py-4">Thực thể</th>
                  <th className="px-5 py-4">Người thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((row) => {
                  const expanded = expandedId === row.id;
                  const detailAvailable =
                    hasContent(row.oldValues) ||
                    hasContent(row.newValues) ||
                    hasContent(row.metadata) ||
                    Boolean(row.ipAddress) ||
                    Boolean(row.requestId);
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className="cursor-pointer hover:bg-surface-soft/60"
                        onClick={() => toggleRow(row)}
                      >
                        <td className="px-3 py-4 text-muted">
                          {expanded ? (
                            <ChevronDown className="size-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="size-4" aria-hidden="true" />
                          )}
                        </td>
                        <td className="px-5 py-4 text-muted">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className="bg-brand-soft text-brand-strong">
                            {row.action}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold">{row.entityType}</p>
                          {row.entityId ? (
                            <p className="text-xs text-muted">{row.entityId}</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          {row.actor ? (
                            <>
                              <p className="font-semibold">
                                {row.actor.fullName}
                              </p>
                              <p className="text-xs text-muted">
                                {row.actor.email}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs italic text-muted">
                              Hệ thống
                            </span>
                          )}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-surface-soft/40">
                          <td colSpan={5} className="px-5 py-4">
                            {detailAvailable ? (
                              <div className="space-y-3">
                                <div className="flex flex-col gap-4 lg:flex-row">
                                  <JsonBlock
                                    label="Giá trị trước"
                                    value={row.oldValues}
                                  />
                                  <JsonBlock
                                    label="Giá trị sau"
                                    value={row.newValues}
                                  />
                                  <JsonBlock
                                    label="Metadata"
                                    value={row.metadata}
                                  />
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                                  {row.ipAddress ? (
                                    <span>IP: {row.ipAddress}</span>
                                  ) : null}
                                  {row.requestId ? (
                                    <span>Request ID: {row.requestId}</span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs italic text-muted">
                                Không có dữ liệu chi tiết cho bản ghi này.
                              </p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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
            {result.total} bản ghi · Trang {result.page}/
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
    </div>
  );
}
