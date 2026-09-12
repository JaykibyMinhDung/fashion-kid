'use client';

import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import type { OrderDetail } from '../contracts';
import { OrderActionButtons } from './order-action-buttons';
import { OrderStatusBadge } from './order-status-badge';
import { OrderTimeline } from './order-timeline';

function formatVnd(amountStr: string): string {
  try {
    const num = BigInt(amountStr);
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  } catch {
    return amountStr + ' ₫';
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
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

export function OrderDetailView({
  order,
  onOrderUpdate,
  onConflict,
  backHref,
  backLabel = 'Quay lại danh sách',
  isCustomer = false,
}: {
  order: OrderDetail;
  onOrderUpdate: (updated: OrderDetail) => void;
  onConflict: () => void;
  backHref: string;
  backLabel?: string;
  isCustomer?: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Top navigation & header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-foreground font-mono">
              {order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-xs text-muted">
            Ngày tạo: {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="shrink-0">
          <OrderActionButtons
            order={order}
            onSuccess={onOrderUpdate}
            onConflict={onConflict}
            isCustomer={isCustomer}
          />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 spans): Items & Pricing */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-surface-soft px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted">
              Danh sách sản phẩm ({order.items.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-soft/50 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3">Sản phẩm</th>
                    <th className="px-5 py-3 text-center">Đơn giá</th>
                    <th className="px-5 py-3 text-center">SL</th>
                    <th className="px-5 py-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">
                          {item.productName}
                        </div>
                        <div className="text-xs text-muted">
                          SKU: {item.sku} · Màu: {item.colorName} · Size:{' '}
                          {item.sizeName}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs text-muted">
                        {formatVnd(item.unitPrice)}
                      </td>
                      <td className="px-5 py-3.5 text-center font-medium">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-foreground">
                        {formatVnd(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pricing Summary */}
            <div className="border-t border-border bg-surface-soft/30 p-5">
              <div className="ml-auto max-w-xs space-y-2 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Tạm tính:</span>
                  <span className="font-medium text-foreground">
                    {formatVnd(order.itemsSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Phí vận chuyển:</span>
                  <span className="font-medium text-foreground">
                    {formatVnd(order.shippingFee)}
                  </span>
                </div>
                {order.discountAmount !== '0' && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá:</span>
                    <span className="font-medium">
                      -{formatVnd(order.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                  <span>Tổng thanh toán:</span>
                  <span className="text-brand">
                    {formatVnd(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes Card if present */}
          {(order.customerNote || order.cancelReason) && (
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wide">
                  <FileText className="h-4 w-4" />
                  Ghi chú & Lý do
                </div>
                {order.customerNote && (
                  <div>
                    <span className="text-xs font-semibold text-muted">
                      Ghi chú từ khách hàng:
                    </span>
                    <p className="mt-0.5 text-sm italic text-foreground">
                      &ldquo;{order.customerNote}&rdquo;
                    </p>
                  </div>
                )}
                {order.cancelReason && (
                  <div className="rounded-xl bg-rose-50 p-3 border border-rose-200">
                    <span className="text-xs font-bold text-rose-800">
                      Lý do huỷ đơn:
                    </span>
                    <p className="mt-0.5 text-sm text-rose-900 font-medium">
                      {order.cancelReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1 span): Address, Payment, Timeline */}
        <div className="space-y-6">
          {/* Receiver / Address */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wide">
                <MapPin className="h-4 w-4" />
                Địa chỉ giao hàng
              </div>
              <div className="text-sm">
                <div className="font-bold text-foreground">
                  {order.shipping.receiverName}
                </div>
                <div className="text-xs text-muted">
                  {order.shipping.receiverPhone}
                </div>
                <div className="mt-2 text-xs leading-5 text-foreground">
                  {order.shipping.shippingAddressLine},{' '}
                  {order.shipping.shippingWardName},{' '}
                  {order.shipping.shippingProvinceName}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Shipping info */}
          <Card>
            <CardContent className="space-y-3 p-5 text-xs">
              <div className="flex items-center gap-2 font-bold text-muted uppercase tracking-wide">
                <CreditCard className="h-4 w-4" />
                Thanh toán & Vận chuyển
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Hình thức:</span>
                  <span className="font-semibold text-foreground">
                    {order.payment?.method ?? 'COD'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Trạng thái TT:</span>
                  <span
                    className={`font-semibold ${
                      order.payment?.status === 'PAID'
                        ? 'text-emerald-600'
                        : order.payment?.status === 'CANCELLED'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {order.payment?.status === 'PAID'
                      ? 'Đã thanh toán'
                      : order.payment?.status === 'CANCELLED'
                        ? 'Đã huỷ thanh toán'
                        : 'Chờ thu tiền (COD)'}
                  </span>
                </div>
                {order.payment?.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-muted">Ngày thu tiền:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(order.payment.paidAt)}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-muted">Đơn vị VC:</span>
                  <span className="font-medium text-foreground">
                    {order.shipping.shippingServiceName ??
                      order.shipping.shippingProvider ??
                      'Tiêu chuẩn'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wide">
                <Calendar className="h-4 w-4" />
                Tiến trình đơn hàng
              </div>
              <OrderTimeline histories={order.statusHistories} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
