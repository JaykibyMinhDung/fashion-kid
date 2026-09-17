'use client';

import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Package,
  RefreshCw,
  ShoppingBag,
  Warehouse,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import { ORDER_STATUS_LABELS } from '@/features/orders/contracts';
import { getReportData, type ReportData } from '../api/reports-client';

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return 'Không thể tải báo cáo. Vui lòng thử lại.';
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className={highlight ? 'font-semibold text-foreground' : 'text-muted'}>
        {label}
      </span>
      <span
        className={`font-bold tabular-nums ${highlight ? 'text-brand-strong' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

export function AdminReportsView() {
  const { authorizedRequest } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportData(authorizedRequest);
      setData(result);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải báo cáo…
      </p>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="size-4" aria-hidden="true" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Products */}
        <Card>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted">Tổng sản phẩm</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {data?.totalProducts ?? '—'}
                </p>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
                <Package className="size-5" />
              </span>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              Catalog admin: toàn bộ sản phẩm (active + disabled).
            </p>
          </CardContent>
        </Card>

        {/* Total orders */}
        <Card>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted">Tổng đơn hàng</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {data?.totalOrders ?? '—'}
                </p>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
                <ShoppingBag className="size-5" />
              </span>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              Tổng số đơn tất cả trạng thái.
            </p>
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted">Sắp hết hàng</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {data?.lowStockCount ?? '—'}
                </p>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Warehouse className="size-5" />
              </span>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              Biến thể có available ≤ 5 đơn vị.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders by status */}
      <Card>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-strong">
              <CheckCircle2 className="size-5" />
            </span>
            <h2 className="font-bold">Đơn hàng theo trạng thái</h2>
          </div>
          <div className="divide-y divide-border">
            {data
              ? (
                  Object.entries(data.ordersByStatus) as [
                    keyof typeof ORDER_STATUS_LABELS,
                    number,
                  ][]
                ).map(([status, count]) => (
                  <StatRow
                    key={status}
                    label={ORDER_STATUS_LABELS[status] ?? status}
                    value={count}
                    highlight={status === 'PENDING'}
                  />
                ))
              : null}
          </div>
        </CardContent>
      </Card>

      {/* Low stock callout */}
      {data && data.lowStockCount > 0 ? (
        <Card>
          <CardContent className="flex items-start gap-4">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">
                {data.lowStockCount} biến thể sắp hết hàng
              </h2>
              <p className="mt-1 text-sm text-muted">
                Các biến thể có số lượng available ≤ 5 cần được nhập thêm
                hàng để tránh gián đoạn việc mua hàng của khách.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
          Đang cập nhật…
        </p>
      ) : null}
    </div>
  );
}
