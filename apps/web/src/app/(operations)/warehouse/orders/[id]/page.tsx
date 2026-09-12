'use client';

import { LoaderCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import { getOperationalOrderDetail } from '@/features/orders/api/order-client';
import { OrderDetailView } from '@/features/orders/components/order-detail-view';
import type { OrderDetail } from '@/features/orders/contracts';

export default function WarehouseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authorizedRequest } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(() => {
    if (!id) return;
    setIsLoading(true);

    getOperationalOrderDetail(authorizedRequest, id)
      .then((data) => {
        setOrder(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Không thể tải chi tiết đơn hàng kho',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authorizedRequest, id]);

  useEffect(() => {
    if (!id) return;
    let active = true;

    getOperationalOrderDetail(authorizedRequest, id)
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
              : 'Không thể tải chi tiết đơn hàng kho',
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
      <div className="py-12">
        <EmptyState
          title="Không tìm thấy đơn hàng"
          description={error || 'Đơn hàng không tồn tại hoặc đã bị gỡ bỏ.'}
        />
      </div>
    );
  }

  return (
    <OrderDetailView
      order={order}
      onOrderUpdate={setOrder}
      onConflict={fetchOrder}
      backHref="/warehouse/orders"
      backLabel="Quay lại hàng đợi kho"
    />
  );
}
