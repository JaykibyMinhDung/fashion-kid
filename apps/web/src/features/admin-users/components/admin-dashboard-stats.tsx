'use client';

import { Boxes, LoaderCircle, PackageCheck, RefreshCw, Warehouse } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import type { AdminProductList } from '@/features/catalog/api/admin-catalog-client';
import type { InventoryListResponse } from '@/features/inventory/api/inventory-client';
import type { OrderListResponse } from '@/features/orders/contracts';

type DashboardStats = {
  totalProducts: number;
  lowStockCount: number;
  pendingOrders: number;
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return 'Không thể tải dữ liệu dashboard.';
}

function padNumber(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function AdminDashboardStats() {
  const { authorizedRequest } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, inventory, orders] = await Promise.all([
        authorizedRequest<AdminProductList>(
          '/api/v1/admin/catalog/products?limit=1&page=1',
        ),
        authorizedRequest<InventoryListResponse>(
          '/api/v1/admin/inventory?limit=200&page=1',
        ),
        authorizedRequest<OrderListResponse>(
          '/api/v1/operational/orders?limit=1&page=1&status=PENDING',
        ),
      ]);

      const lowStockCount = inventory.items.filter(
        (item) => item.available <= 5,
      ).length;

      setStats({
        totalProducts: products.total,
        lowStockCount,
        pendingOrders: orders.total,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !stats) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải thống kê…
      </p>
    );
  }

  if (error && !stats) {
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
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Sản phẩm"
          value={stats ? padNumber(stats.totalProducts) : '—'}
          detail="Tổng sản phẩm trong catalog admin."
          icon={Boxes}
        />
        <StatCard
          label="Đơn chờ xác nhận"
          value={stats ? padNumber(stats.pendingOrders) : '—'}
          detail="Đơn hàng đang ở trạng thái Chờ xác nhận."
          icon={PackageCheck}
        />
        <StatCard
          label="Sắp hết hàng"
          value={stats ? padNumber(stats.lowStockCount) : '—'}
          detail="Biến thể có available ≤ 5 trong kho."
          icon={Warehouse}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-sage-soft text-sage">
              <PackageCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">Quản lý vận hành</h2>
              <p className="mt-1 text-sm text-muted">
                Admin tạo Product/Variant → nhập Inventory → Customer xem và chọn Variant.
              </p>
            </div>
          </div>
          <ButtonLink href="/admin/products">Quản lý sản phẩm</ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}
