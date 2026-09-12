'use client';

import { LoaderCircle, Search } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import { getOperationalOrders } from '@/features/orders/api/order-client';
import {
  ORDER_STATUS_LABELS,
  type OrderListItem,
  type OrderStatus,
} from '@/features/orders/contracts';
import { OrderListTable } from '@/features/orders/components/order-list-table';

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: `${ORDER_STATUS_LABELS.CONFIRMED} (Chờ đóng gói)`, value: 'CONFIRMED' },
  { label: `${ORDER_STATUS_LABELS.PACKING} (Đang đóng gói)`, value: 'PACKING' },
  { label: ORDER_STATUS_LABELS.SHIPPING, value: 'SHIPPING' },
  { label: ORDER_STATUS_LABELS.DELIVERED, value: 'DELIVERED' },
  { label: ORDER_STATUS_LABELS.COMPLETED, value: 'COMPLETED' },
  { label: ORDER_STATUS_LABELS.CANCELLED, value: 'CANCELLED' },
];

export default function WarehouseOrdersPage() {
  const { authorizedRequest } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('CONFIRMED');
  const [searchDraft, setSearchDraft] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getOperationalOrders(authorizedRequest, {
      page,
      limit: 20,
      status: (statusFilter as OrderStatus) || undefined,
      orderNumber: search || undefined,
    })
      .then((res) => {
        if (isMounted) {
          setOrders(res.items);
          setTotalPages(res.totalPages);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Không thể tải danh sách đơn hàng kho.',
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

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vận hành kho"
        title="Hàng đợi đóng gói & xuất kho"
        description="Đóng gói và bàn giao đơn hàng cho đơn vị vận chuyển"
      />

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-80">
          <Input
            placeholder="Tìm theo mã đơn hàng..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="md">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="w-full sm:w-64">
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

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : (
        <OrderListTable
          orders={orders}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          getDetailHref={(id) => `/warehouse/orders/${id}`}
        />
      )}
    </div>
  );
}
