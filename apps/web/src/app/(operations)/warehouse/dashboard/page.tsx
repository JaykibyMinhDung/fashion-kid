'use client';

import { Boxes, LoaderCircle, PackageSearch, Warehouse } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/features/auth/session/auth-provider';
import {
  getInventory,
  type InventoryListResponse,
} from '@/features/inventory/api/inventory-client';

type DashboardStats = {
  totalSku: number;
  lowStockCount: number;
  activeWarehouses: number;
};

const LOW_STOCK_THRESHOLD = 5;

export default function WarehouseDashboardPage() {
  const { authorizedRequest } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch enough items to compute warehouse stats
      const data: InventoryListResponse = await getInventory(authorizedRequest, {
        limit: 200,
        sort: 'available:asc',
      });

      const totalSku = data.total;
      const lowStockCount = data.items.filter(
        (item) => item.available <= LOW_STOCK_THRESHOLD,
      ).length;
      const activeWarehouses = new Set(
        data.items
          .filter((item) => item.warehouse.status === 'ACTIVE')
          .map((item) => item.warehouse.id),
      ).size;

      setStats({ totalSku, lowStockCount, activeWarehouses });
    } catch {
      setError('Không thể tải dữ liệu kho. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Warehouse Staff"
        title="Tổng quan kho"
        description="Theo dõi tồn kho và các tác vụ đóng gói cần xử lý."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <LoaderCircle className="animate-spin" />
          <span className="ml-2 text-sm">Đang tải dữ liệu kho…</span>
        </div>
      ) : error ? (
        <Card className="bg-rose-50 shadow-none">
          <CardContent>
            <p className="text-sm text-rose-700">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Tổng SKU"
            value={String(stats!.totalSku).padStart(2, '0')}
            detail="Số lượng SKU đang có trong hệ thống."
            icon={Boxes}
          />
          <StatCard
            label="Sắp hết hàng"
            value={String(stats!.lowStockCount).padStart(2, '0')}
            detail={`Available ≤ ${LOW_STOCK_THRESHOLD} cần nhập thêm.`}
            icon={PackageSearch}
          />
          <StatCard
            label="Kho hoạt động"
            value={String(stats!.activeWarehouses).padStart(2, '0')}
            detail="Kho đang ở trạng thái ACTIVE."
            icon={Warehouse}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/warehouse/inventory" variant="primary" size="md">
          Xem tồn kho
        </ButtonLink>
        <ButtonLink href="/warehouse/inventory/import" variant="outline" size="md">
          Nhập hàng
        </ButtonLink>
        <ButtonLink href="/warehouse/packing" variant="secondary" size="md">
          Packing Queue
        </ButtonLink>
      </div>
    </div>
  );
}
