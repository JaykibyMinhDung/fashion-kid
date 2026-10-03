"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, PackageSearch, Warehouse, ArrowRight } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/features/auth/session/auth-provider";
import { getInventory } from "@/features/inventory/api/inventory-client";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

/** Ngưỡng "sắp hết" (khả dụng ≤ 5), khớp với báo cáo cảnh báo tồn kho. */
const LOW_STOCK_THRESHOLD = 5;

interface InventorySummary {
  totalSku: number;
  lowStock: number;
  outOfStock: number;
}

export default function WarehouseDashboardPage() {
  const { authorizedRequest } = useAuth();
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      // Endpoint đúng là /api/v1/admin/inventory (quyền INVENTORY_READ, kho có quyền này).
      // Sắp theo tồn khả dụng tăng dần: 100 dòng đầu chứa mọi SKU hết/sắp hết hàng,
      // còn tổng số SKU lấy từ `total` (không phải số dòng của 1 trang).
      const data = await getInventory(authorizedRequest, {
        sort: "available:asc",
        limit: 100,
      });
      const items = data.items ?? [];
      const totalSku = data.total ?? items.length;
      const lowStock = items.filter(
        (i) => i.available > 0 && i.available <= LOW_STOCK_THRESHOLD,
      ).length;
      const outOfStock = items.filter((i) => i.available <= 0).length;
      setSummary({ totalSku, lowStock, outOfStock });
    } catch {
      setSummary({ totalSku: 0, lowStock: 0, outOfStock: 0 });
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
        eyebrow="Warehouse Staff"
        title="Tổng quan kho"
        description="Quản lý tồn kho, nhập hàng và xử lý đơn hàng."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Tổng SKU"
          value={loading ? "–" : String(summary?.totalSku ?? 0)}
          detail="Tổng số SKU trong hệ thống"
          icon={Boxes}
        />
        <StatCard
          label="Sắp hết hàng"
          value={loading ? "–" : String(summary?.lowStock ?? 0)}
          detail="SKU có tồn khả dụng ≤ 5"
          icon={PackageSearch}
        />
        <StatCard
          label="Hết hàng"
          value={loading ? "–" : String(summary?.outOfStock ?? 0)}
          detail="SKU không còn tồn khả dụng"
          icon={Warehouse}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="font-semibold text-foreground">Quản lý tồn kho</h3>
              <p className="mt-1 text-sm text-muted">
                Xem chi tiết tồn kho, nhập hàng và điều chỉnh số lượng.
              </p>
            </div>
            <ButtonLink href="/warehouse/inventory" variant="outline" size="sm">
              Xem tồn kho
              <ArrowRight className="ml-2 size-4" />
            </ButtonLink>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="font-semibold text-foreground">Đơn hàng cần xử lý</h3>
              <p className="mt-1 text-sm text-muted">
                Đóng gói và giao hàng cho các đơn đã xác nhận.
              </p>
            </div>
            <ButtonLink href="/warehouse/orders" variant="outline" size="sm">
              Xem đơn hàng
              <ArrowRight className="ml-2 size-4" />
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
