'use client';

import { FileText, LoaderCircle, Printer, Search } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import { getAdminInvoices } from '@/features/billing/api/billing-client';
import type {
  InvoiceListItem,
  InvoiceStatus,
} from '@/features/billing/contracts';
import {
  INVOICE_STATUS_CLASSES,
  INVOICE_STATUS_LABELS,
} from '@/features/billing/contracts';

function formatVnd(amountStr: string): string {
  try {
    const num = BigInt(amountStr);
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  } catch {
    return amountStr + ' ₫';
  }
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Đã phát hành (ISSUED)', value: 'ISSUED' },
  { label: 'Đã huỷ (VOID)', value: 'VOID' },
];

export default function AdminInvoicesPage() {
  const { authorizedRequest } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchDraft, setSearchDraft] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getAdminInvoices(authorizedRequest, {
      page,
      limit: 20,
      status: (statusFilter as InvoiceStatus) || undefined,
      orderNumber: search || undefined,
    })
      .then((res) => {
        if (isMounted) {
          setInvoices(res.items);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Không thể tải danh sách hoá đơn',
          );
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
  }, [authorizedRequest, page, statusFilter, search]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

  function handleResetFilters() {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Hoá đơn & Thuế GTGT"
        description="Theo dõi biên nhận bán hàng, doanh thu trước thuế (Net), thuế GTGT (VAT 8%) và xuất in chứng từ"
      />

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                type="text"
                placeholder="Tìm mã đơn hàng..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" variant="primary">
              Lọc
            </Button>
            {(search || statusFilter) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleResetFilters}
              >
                Đặt lại
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Main Table */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
          {error}
        </div>
      ) : invoices.length === 0 ? (
        <Card className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted opacity-40" />
          <h3 className="mt-3 text-base font-semibold text-foreground">
            Không tìm thấy hoá đơn nào
          </h3>
          <p className="mt-1 text-sm text-muted">
            {search || statusFilter
              ? 'Thử thay đổi bộ lọc tìm kiếm'
              : 'Chưa có hoá đơn nào được phát hành'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-soft text-xs text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Số hoá đơn</th>
                    <th className="px-4 py-3 font-semibold">Mã đơn hàng</th>
                    <th className="px-4 py-3 font-semibold">Khách hàng</th>
                    <th className="px-4 py-3 font-semibold">Ngày phát hành</th>
                    <th className="px-4 py-3 font-semibold text-right">Tiền trước thuế (Net)</th>
                    <th className="px-4 py-3 font-semibold text-right">Thuế GTGT (VAT 8%)</th>
                    <th className="px-4 py-3 font-semibold text-right">Tổng cộng (Gross)</th>
                    <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-surface-soft/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono font-semibold text-foreground">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-muted">
                        <Link
                          href={`/admin/orders/${inv.orderId}`}
                          className="hover:text-brand hover:underline"
                        >
                          {inv.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">
                          {inv.receiverName}
                        </div>
                        <div className="text-xs text-muted">
                          {inv.receiverPhone}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted">
                        {formatDate(inv.issuedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-muted">
                        {formatVnd(inv.netAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-foreground">
                        {formatVnd(inv.taxAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-brand">
                        {formatVnd(inv.grossAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS_CLASSES[inv.status]}`}
                        >
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Link
                          href={`/admin/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Xem & In
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination Controls */}
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row text-xs text-muted">
            <div>
              Hiển thị {(page - 1) * 20 + 1} -{' '}
              {Math.min(page * 20, total)} trên tổng số {total} hoá đơn
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trang trước
                </Button>
                <span className="font-medium text-foreground">
                  Trang {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Trang sau
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
