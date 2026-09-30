"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  PackageCheck,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "@/features/auth/session/auth-provider";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

interface OrderSummary {
  pending: number;
  confirmed: number;
  total: number;
}

export default function SalesDashboardPage() {
  const { authorizedRequest } = useAuth();
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const [pendingRes, confirmedRes] = await Promise.allSettled([
        authorizedRequest<{ total: number }>("/api/v1/operational/orders/?status=PENDING&limit=1"),
        authorizedRequest<{ total: number }>("/api/v1/operational/orders/?status=CONFIRMED&limit=1"),
      ]);
      const pending = pendingRes.status === "fulfilled" ? pendingRes.value.total : 0;
      const confirmed = confirmedRes.status === "fulfilled" ? confirmedRes.value.total : 0;
      setSummary({ pending, confirmed, total: pending + confirmed });
    } catch {
      setSummary({ pending: 0, confirmed: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sales Staff"
        title="Vận hành bán hàng"
        description="Xác nhận đơn hàng, xử lý yêu cầu và quản lý trạng thái đơn."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Chờ xác nhận"
          value={loading ? "–" : String(summary?.pending ?? 0)}
          detail="Đơn hàng mới cần xác nhận"
          icon={ShoppingCart}
        />
        <StatCard
          label="Đã xác nhận"
          value={loading ? "–" : String(summary?.confirmed ?? 0)}
          detail="Đơn chờ kho đóng gói"
          icon={PackageCheck}
        />
        <StatCard
          label="Tổng cần xử lý"
          value={loading ? "–" : String(summary?.total ?? 0)}
          detail="Đơn hàng đang chờ hành động"
          icon={ClipboardList}
        />
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold text-foreground">
              Quản lý đơn hàng
            </h3>
            <p className="mt-1 text-sm text-muted">
              Xem danh sách đơn hàng, xác nhận hoặc huỷ đơn.
            </p>
          </div>
          <ButtonLink href="/sales/orders" variant="outline" size="sm">
            Xem đơn hàng
            <ArrowRight className="ml-2 size-4" />
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}
