'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { OrderListItem } from '../contracts';
import { OrderStatusBadge } from './order-status-badge';

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
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function OrderListTable({
  orders,
  page,
  totalPages,
  onPageChange,
  getDetailHref,
  isLoading = false,
}: {
  orders: OrderListItem[];
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  getDetailHref: (orderId: string) => string;
  isLoading?: boolean;
}) {
  if (orders.length === 0 && !isLoading) {
    return (
      <EmptyState
        title="Chưa có đơn hàng nào"
        description="Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3.5 font-bold">Mã đơn</th>
              <th className="px-5 py-3.5 font-bold">Ngày đặt</th>
              <th className="px-5 py-3.5 font-bold">Người nhận</th>
              <th className="px-5 py-3.5 font-bold text-center">SL</th>
              <th className="px-5 py-3.5 font-bold">Tổng tiền</th>
              <th className="px-5 py-3.5 font-bold">Thanh toán</th>
              <th className="px-5 py-3.5 font-bold">Trạng thái</th>
              <th className="px-5 py-3.5 font-bold text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="transition hover:bg-surface-soft/50"
              >
                <td className="px-5 py-4 font-mono font-bold text-foreground">
                  <Link
                    href={getDetailHref(order.id)}
                    className="hover:text-brand hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-5 py-4 text-xs text-muted">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium text-foreground">
                    {order.receiverName}
                  </div>
                  <div className="text-xs text-muted">
                    {order.receiverPhone}
                  </div>
                </td>
                <td className="px-5 py-4 text-center font-medium text-foreground">
                  {order.itemCount}
                </td>
                <td className="px-5 py-4 font-bold text-foreground">
                  {formatVnd(order.totalAmount)}
                </td>
                <td className="px-5 py-4 text-xs">
                  <span className="font-semibold text-foreground">
                    {order.paymentMethod}
                  </span>
                  <span className="ml-1 text-muted">
                    ({order.paymentStatus === 'PAID' ? 'Đã thu' : 'Chưa thu'})
                  </span>
                </td>
                <td className="px-5 py-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={getDetailHref(order.id)}
                    className="inline-flex items-center text-xs font-semibold text-brand hover:underline"
                  >
                    Xem &rarr;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
          <div>
            Trang <span className="font-semibold text-foreground">{page}</span>{' '}
            / <span className="font-semibold text-foreground">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
