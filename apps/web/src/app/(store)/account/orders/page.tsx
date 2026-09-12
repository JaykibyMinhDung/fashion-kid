'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import { getMyOrders } from '@/features/orders/api/order-client';
import {
  ORDER_STATUS_LABELS,
  type OrderListItem,
  type OrderStatus,
} from '@/features/orders/contracts';
import { OrderListTable } from '@/features/orders/components/order-list-table';

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: ORDER_STATUS_LABELS.PENDING, value: 'PENDING' },
  { label: ORDER_STATUS_LABELS.CONFIRMED, value: 'CONFIRMED' },
  { label: ORDER_STATUS_LABELS.PACKING, value: 'PACKING' },
  { label: ORDER_STATUS_LABELS.SHIPPING, value: 'SHIPPING' },
  { label: ORDER_STATUS_LABELS.DELIVERED, value: 'DELIVERED' },
  { label: ORDER_STATUS_LABELS.COMPLETED, value: 'COMPLETED' },
  { label: ORDER_STATUS_LABELS.CANCELLED, value: 'CANCELLED' },
];

export default function CustomerOrdersPage() {
  const { authorizedRequest } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyOrders(authorizedRequest, {
      page,
      limit: 20,
      status: (statusFilter as OrderStatus) || undefined,
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
              : 'Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.',
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
  }, [authorizedRequest, page, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Tài khoản của tôi"
          title="Đơn hàng của tôi"
          description="Quản lý và theo dõi tiến trình đơn hàng bạn đã đặt"
        />

        <div className="w-full sm:w-56 shrink-0">
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
          getDetailHref={(id) => `/account/orders/${id}`}
        />
      )}
    </div>
  );
}
