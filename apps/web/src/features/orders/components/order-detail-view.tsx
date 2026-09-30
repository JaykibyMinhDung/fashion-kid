'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  ExternalLink,
  FileText,
  LoaderCircle,
  MapPin,
  Receipt,
  RefreshCw,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/session/auth-provider';
import { createVnpayUrl } from '@/features/payment/api/payment-client';
import { OrderItemReviewButton } from '@/features/reviews/components/order-item-review-button';
import { createShipment, syncShipment } from '../api/shipping-client';
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
  const { authorizedRequest } = useAuth();
  const [isCreatingUrl, setIsCreatingUrl] = useState<boolean>(false);
  const [isCreatingShipment, setIsCreatingShipment] = useState<boolean>(false);
  const [isSyncingShipment, setIsSyncingShipment] = useState<boolean>(false);

  async function handlePayOnline() {
    if (!order.payment?.id) return;
    setIsCreatingUrl(true);
    try {
      const res = await createVnpayUrl(authorizedRequest, order.payment.id);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    } catch {
      setIsCreatingUrl(false);
      alert('Không thể tạo liên kết thanh toán lúc này. Vui lòng thử lại sau.');
    }
  }

  async function handleCreateShipment() {
    setIsCreatingShipment(true);
    try {
      const res = await createShipment(authorizedRequest, order.id);
      onOrderUpdate({
        ...order,
        shipping: {
          ...order.shipping,
          shippingTrackingCode: res.shippingTrackingCode,
          shippingProvider: res.shippingProvider,
          shippingProviderStatus: res.shippingProviderStatus,
          shippingLastSyncedAt: res.shippingLastSyncedAt,
        },
      });
      alert(`Đã tạo vận đơn GHN thành công: ${res.shippingTrackingCode}`);
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Tạo vận đơn GHN thất bại');
    } finally {
      setIsCreatingShipment(false);
    }
  }

  async function handleSyncShipment() {
    setIsSyncingShipment(true);
    try {
      const res = await syncShipment(authorizedRequest, order.id);
      onOrderUpdate({
        ...order,
        status: res.orderStatus,
        shipping: {
          ...order.shipping,
          shippingTrackingCode: res.shippingTrackingCode,
          shippingProvider: res.shippingProvider,
          shippingProviderStatus: res.shippingProviderStatus,
          shippingLastSyncedAt: res.shippingLastSyncedAt,
        },
      });
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Đồng bộ vận đơn thất bại');
    } finally {
      setIsSyncingShipment(false);
    }
  }

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
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <Link
            href={`/account/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-soft shadow-sm transition-colors"
          >
            <Receipt className="h-3.5 w-3.5 text-muted" />
            Biên nhận bán hàng
          </Link>
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
                        {isCustomer && order.status === 'COMPLETED' ? (
                          <div className="mt-2">
                            <OrderItemReviewButton
                              orderItemId={item.id}
                              productName={item.productName}
                            />
                          </div>
                        ) : null}
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
                {order.taxAmount && order.taxAmount !== '0' && (
                  <div className="flex justify-between text-xs text-muted pt-1">
                    <span>(Đã gồm thuế GTGT {((order.taxRateBps ?? 800) / 100)}%):</span>
                    <span className="font-medium text-foreground">
                      {formatVnd(order.taxAmount)}
                    </span>
                  </div>
                )}
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
                    {order.payment?.method === 'ONLINE'
                      ? 'VNPay (Trực tuyến)'
                      : 'Thanh toán khi nhận hàng (COD)'}
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
                        : order.payment?.status === 'FAILED'
                          ? 'Thanh toán thất bại'
                          : order.payment?.method === 'ONLINE'
                            ? 'Chờ thanh toán VNPay'
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
                {isCustomer &&
                  order.payment?.method === 'ONLINE' &&
                  (order.payment?.status === 'PENDING' ||
                    order.payment?.status === 'FAILED') &&
                  order.status === 'PENDING' && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handlePayOnline}
                        disabled={isCreatingUrl}
                        className="w-full font-bold text-xs"
                      >
                        {isCreatingUrl ? (
                          <>
                            <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Đang tạo liên kết VNPay...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Thanh toán ngay qua VNPay
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-muted">Đơn vị VC:</span>
                  <span className="font-medium text-foreground">
                    {order.shipping.shippingServiceName ??
                      order.shipping.shippingProvider ??
                      'Giao Hàng Nhanh'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dedicated Shipping & Fulfillment Card */}
          <Card>
            <CardContent className="space-y-3 p-5 text-xs">
              <div className="flex items-center justify-between font-bold text-muted uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-brand" />
                  Vận đơn ({order.shipping.shippingProvider ?? 'GHN'})
                </div>
                {order.shipping.shippingTrackingCode && !isCustomer && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncShipment}
                    disabled={isSyncingShipment}
                    className="h-6 px-2 text-[11px]"
                  >
                    <RefreshCw
                      className={`h-3 w-3 mr-1 ${
                        isSyncingShipment ? 'animate-spin' : ''
                      }`}
                    />
                    Đồng bộ
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Mã vận đơn:</span>
                  {order.shipping.shippingTrackingCode ? (
                    <span className="font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded text-xs">
                      {order.shipping.shippingTrackingCode}
                    </span>
                  ) : (
                    <span className="text-muted italic">Chưa tạo vận đơn</span>
                  )}
                </div>
                {order.shipping.shippingProviderStatus && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Trạng thái giao vận:</span>
                    <span className="font-semibold text-foreground bg-surface-soft px-2 py-0.5 rounded border border-border">
                      {order.shipping.shippingProviderStatus}
                    </span>
                  </div>
                )}
                {order.shipping.shippingLastSyncedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted">Đồng bộ gần nhất:</span>
                    <span className="text-muted">
                      {formatDate(order.shipping.shippingLastSyncedAt)}
                    </span>
                  </div>
                )}
                {!isCustomer &&
                  !order.shipping.shippingTrackingCode &&
                  (order.status === 'CONFIRMED' ||
                    order.status === 'PACKING') && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleCreateShipment}
                        disabled={isCreatingShipment}
                        className="w-full font-bold text-xs"
                      >
                        {isCreatingShipment ? (
                          <>
                            <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Đang tạo vận đơn GHN...
                          </>
                        ) : (
                          <>
                            <Truck className="mr-1.5 h-3.5 w-3.5" />
                            Tạo vận đơn GHN
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
