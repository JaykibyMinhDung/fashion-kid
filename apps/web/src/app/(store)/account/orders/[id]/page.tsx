'use client';

import { LoaderCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import { getMyOrderDetail } from '@/features/orders/api/order-client';
import { OrderDetailView } from '@/features/orders/components/order-detail-view';
import type { OrderDetail } from '@/features/orders/contracts';

export default function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authorizedRequest } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(() => {
    if (!id) return;
    setIsLoading(true);

    getMyOrderDetail(authorizedRequest, id)
      .then((data) => {
        setOrder(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Không thể tải thông tin đơn hàng',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authorizedRequest, id]);

  useEffect(() => {
    if (!id) return;
    let active = true;

    getMyOrderDetail(authorizedRequest, id)
      .then((data) => {
        if (active) {
          setOrder(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Không thể tải thông tin đơn hàng',
          );
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authorizedRequest, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircle className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <EmptyState
          title="Không tìm thấy đơn hàng"
          description={error || 'Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.'}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <OrderDetailView
        order={order}
        onOrderUpdate={setOrder}
        onConflict={fetchOrder}
        backHref="/account/orders"
        backLabel="Danh sách đơn hàng"
        isCustomer={true}
      />
    </div>
  );
}
