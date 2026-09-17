'use client';

import { LoaderCircle, Package, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/features/auth/session/auth-provider';
import {
  getOperationalOrders,
  startPackingOrder,
} from '@/features/orders/api/order-client';
import type { OrderListItem, OrderListResponse } from '@/features/orders/contracts';
import { formatCurrency } from '@/lib/utils';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function PackingQueue() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<OrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packingId, setPackingId] = useState<string | null>(null);
  const [packingError, setPackingError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOperationalOrders(authorizedRequest, {
        status: 'CONFIRMED',
        limit: 50,
        sort: 'createdAt:asc',
      });
      setResult(data);
    } catch {
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStartPacking(order: OrderListItem) {
    setPackingId(order.id);
    setPackingError(null);
    try {
      await startPackingOrder(authorizedRequest, order.id);
      // Refresh the list after successfully starting packing
      await load();
    } catch {
      setPackingError(`Không thể bắt đầu đóng gói đơn #${order.orderNumber}.`);
    } finally {
      setPackingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <LoaderCircle className="animate-spin" />
        <span className="ml-2 text-sm">Đang tải packing queue…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-6 py-8 text-center">
        <p className="text-sm text-rose-700">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" /> Thử lại
        </Button>
      </div>
    );
  }

  if (!result || result.items.length === 0) {
    return (
      <EmptyState
        title="Không có đơn cần đóng gói"
        description="Tất cả đơn đã được xử lý hoặc chưa có đơn nào được xác nhận."
      />
    );
  }

  return (
    <div className="space-y-4">
      {packingError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {packingError}
        </div>
      )}

      <p className="text-sm text-muted">
        <span className="font-semibold text-foreground">{result.total}</span> đơn sẵn sàng đóng gói
      </p>

      <div className="space-y-3">
        {result.items.map((order) => (
          <Card key={order.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
                  <Package className="size-5" />
                </span>
                <div>
                  <p className="font-bold">#{order.orderNumber}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {order.receiverName} · {order.receiverPhone}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{order.itemCount} sản phẩm</span>
                    <span>·</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                    <span>·</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-800">Đã xác nhận</Badge>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={packingId === order.id}
                  onClick={() => void handleStartPacking(order)}
                >
                  {packingId === order.id ? (
                    <>
                      <LoaderCircle className="animate-spin size-4" />
                      Đang xử lý…
                    </>
                  ) : (
                    'Bắt đầu đóng gói'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
