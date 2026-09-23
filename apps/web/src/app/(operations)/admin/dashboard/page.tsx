"use client";

import { useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/features/auth/session/auth-provider";
import {
  DashboardSummaryCards,
  DateRangeFilter,
  ExportReportButton,
  getDashboardSummary,
  getInventoryAlerts,
  getOrdersReport,
  getRevenueSeries,
  getTopProducts,
  InventoryAlertsCard,
  OrderStatusDistribution,
  RevenueChart,
  TopProductsTable,
  type DashboardSummary,
  type InventoryAlertsResponse,
  type OrdersReportResponse,
  type RevenueSeriesResponse,
  type TopProductsResponse,
} from "@/features/reporting";

function getDefaultDateRange() {
  // Tính theo giờ VN (UTC+7) bằng offset cố định để khớp semantics ngày của backend,
  // tránh lệch 1 ngày khi trình duyệt ở múi giờ khác.
  const OFFSET_MS = 7 * 3600 * 1000;
  const DAY_MS = 24 * 3600 * 1000;
  const localNow = new Date(Date.now() + OFFSET_MS);

  const format = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    from: format(new Date(localNow.getTime() - 29 * DAY_MS)),
    to: format(new Date(localNow.getTime() + DAY_MS)),
  };
}

export default function AdminDashboardPage() {
  const { authorizedRequest } = useAuth();

  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueSeriesResponse | null>(null);
  const [ordersData, setOrdersData] = useState<OrdersReportResponse | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductsResponse | null>(null);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlertsResponse | null>(null);

  const handleDateRangeChange = (newRange: { from: string; to: string }) => {
    setLoading(true);
    setDateRange(newRange);
  };

  const handleGranularityChange = (g: "day" | "week" | "month") => {
    setLoading(true);
    setGranularity(g);
  };

  useEffect(() => {
    let active = true;

    void Promise.allSettled([
      getDashboardSummary(authorizedRequest, dateRange),
      getRevenueSeries(authorizedRequest, { ...dateRange, granularity }),
      getOrdersReport(authorizedRequest, dateRange),
      getTopProducts(authorizedRequest, { ...dateRange, limit: 5 }),
      getInventoryAlerts(authorizedRequest, { threshold: 5, limit: 10 }),
    ])
      .then(([sumRes, revRes, ordRes, prodRes, invRes]) => {
        if (!active) return;
        if (
          sumRes.status === "fulfilled" &&
          sumRes.value &&
          typeof sumRes.value.grossRevenue === "string"
        ) {
          setSummary(sumRes.value);
        }
        if (
          revRes.status === "fulfilled" &&
          revRes.value &&
          Array.isArray(revRes.value.series)
        ) {
          setRevenueData(revRes.value);
        }
        if (
          ordRes.status === "fulfilled" &&
          ordRes.value &&
          Array.isArray(ordRes.value.currentDistribution)
        ) {
          setOrdersData(ordRes.value);
        }
        if (
          prodRes.status === "fulfilled" &&
          prodRes.value &&
          Array.isArray(prodRes.value.items)
        ) {
          setTopProducts(prodRes.value);
        }
        if (
          invRes.status === "fulfilled" &&
          invRes.value &&
          Array.isArray(invRes.value.items)
        ) {
          setInventoryAlerts(invRes.value);
        }
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
        setError(message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authorizedRequest, dateRange, granularity]);

  return (
    <div className="space-y-6">
      {/* Header invariant for regression tests */}
      <PageHeader
        eyebrow="Admin Portal · Báo cáo & Thống kê"
        title="Tổng quan vận hành"
        description="Dashboard phản ánh chỉ số KPI thời gian thực, liên kết dữ liệu Catalog, Product Variant và Inventory."
        action={
          <ExportReportButton
            dateRange={dateRange}
            granularity={granularity}
          />
        }
      />

      {/* Quick Action Navigation */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-5 py-4">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-sage-soft text-sage">
              <PackageCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">Quản trị danh mục & kho hàng</h2>
              <p className="mt-0.5 text-xs text-muted">
                Điều hướng nhanh tới khu vực quản lý sản phẩm và tồn kho.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ButtonLink href="/admin/products">Quản lý sản phẩm</ButtonLink>
          </div>
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <DateRangeFilter
        from={dateRange.from}
        to={dateRange.to}
        onChange={handleDateRangeChange}
        loading={loading}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          Lỗi: {error}
        </div>
      )}

      {/* KPI Cards */}
      <DashboardSummaryCards summary={summary} loading={loading && !summary} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RevenueChart
            data={revenueData}
            loading={loading && !revenueData}
            onGranularityChange={handleGranularityChange}
          />
        </div>
        <div className="lg:col-span-5">
          <OrderStatusDistribution
            data={ordersData}
            loading={loading && !ordersData}
          />
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <TopProductsTable
            data={topProducts}
            loading={loading && !topProducts}
          />
        </div>
        <div className="lg:col-span-5">
          <InventoryAlertsCard
            data={inventoryAlerts}
            loading={loading && !inventoryAlerts}
          />
        </div>
      </div>
    </div>
  );
}
