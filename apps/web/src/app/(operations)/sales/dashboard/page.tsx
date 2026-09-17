'use client';

import { ClipboardList, LoaderCircle, ShoppingCart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/features/auth/session/auth-provider';
import { getOperationalOrders } from '@/features/orders/api/order-client';

type DashboardStats = {
  pendingCount: number;
  confirmedCount: number;
};

export default function SalesDashboardPage() {
  const { authorizedRequest } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, confirmedRes] = await Promise.all([
        getOperationalOrders(authorizedRequest, { status: 'PENDING', limit: 1 }),
        getOperationalOrders(authorizedRequest, { status: 'CONFIRMED', limit: 1 }),
      ]);
      setStats({
        pendingCount: pendingRes.total,
        confirmedCount: confirmedRes.total,
      });
    } catch {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
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
        eyebrow="Sales Staff"
        title="Vận hành bán hàng"
        description="Tổng quan đơn hàng cần xử lý hôm nay."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <LoaderCircle className="animate-spin" />
          <span className="ml-2 text-sm">Đang tải dữ liệu…</span>
        </div>
      ) : error ? (
        <Card className="bg-rose-50 shadow-none">
          <CardContent>
            <p className="text-sm text-rose-700">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            label="Chờ xác nhận"
            value={String(stats!.pendingCount).padStart(2, '0')}
            detail="Đơn hàng mới chưa được xác nhận."
            icon={ShoppingCart}
          />
          <StatCard
            label="Đã xác nhận"
            value={String(stats!.confirmedCount).padStart(2, '0')}
            detail="Đơn hàng đã xác nhận, chờ đóng gói."
            icon={ClipboardList}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/sales/orders?status=PENDING" variant="primary" size="md">
          Xem đơn chờ xác nhận
        </ButtonLink>
        <ButtonLink href="/sales/orders?status=CONFIRMED" variant="outline" size="md">
          Xem đơn đã xác nhận
        </ButtonLink>
      </div>
    </div>
  );
}
