"use client";

import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import type { ChartOptions, Plugin, TooltipItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card, CardContent } from "@/components/ui/card";
import type { OrdersReportResponse } from "../contracts";
import { ORDER_STATUS_LABELS } from "../contracts";

Chart.register(ArcElement, Tooltip, Legend);

interface OrderStatusDistributionProps {
  data: OrdersReportResponse | null;
  loading?: boolean;
}

const STATUS_CHART_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  PACKING: "#a855f7",
  SHIPPING: "#6366f1",
  DELIVERED: "#14b8a6",
  COMPLETED: "#10b981",
  CANCELLED: "#f43f5e",
};

const FALLBACK_COLOR = "#9ca3af";

const centerTextPlugin: Plugin<"doughnut"> = {
  id: "centerText",
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const dataset = chart.data.datasets[0];
    if (!dataset) return;

    const total = (dataset.data as number[]).reduce(
      (sum, v) => sum + (v ?? 0),
      0,
    );

    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.fillStyle = getComputedStyle(chart.canvas).color || "#111827";
    ctx.fillText(total.toLocaleString("vi-VN"), centerX, centerY - 10);

    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("đơn hàng", centerX, centerY + 14);

    ctx.restore();
  },
};

export function OrderStatusDistribution({
  data,
  loading,
}: OrderStatusDistributionProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-48 rounded bg-border" />
            <div className="flex items-center justify-center gap-8">
              <div className="h-48 w-48 rounded-full bg-border" />
              <div className="flex-1 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-border" />
                    <div className="h-4 w-24 rounded bg-border" />
                    <div className="ml-auto h-4 w-10 rounded bg-border" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-28 rounded bg-border" />
              <div className="h-4 w-28 rounded bg-border" />
              <div className="h-4 w-28 rounded bg-border" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.currentDistribution.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Phân bổ trạng thái đơn hàng
          </h3>
          <div className="flex h-48 items-center justify-center text-muted">
            Chưa có dữ liệu đơn hàng
          </div>
        </CardContent>
      </Card>
    );
  }

  const distribution = data.currentDistribution;

  const chartColors = distribution.map(
    (item) => STATUS_CHART_COLORS[item.status] ?? FALLBACK_COLOR,
  );

  const chartData = {
    labels: distribution.map(
      (item) => ORDER_STATUS_LABELS[item.status]?.label ?? item.status,
    ),
    datasets: [
      {
        data: distribution.map((item) => item.count),
        backgroundColor: chartColors,
        borderColor: chartColors.map(() => "rgba(255,255,255,0.8)"),
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "65%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<"doughnut">) => {
            const statusItem = distribution[item.dataIndex];
            return `${item.label}: ${statusItem.count} đơn (${statusItem.percentage.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Phân bổ trạng thái đơn hàng
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Doughnut chart */}
          <div className="w-48 h-48 flex-shrink-0">
            <Doughnut
              data={chartData}
              options={options}
              plugins={[centerTextPlugin]}
            />
          </div>

          {/* Custom legend */}
          <div className="flex-1 w-full space-y-2">
            {distribution.map((item) => {
              const meta = ORDER_STATUS_LABELS[item.status];
              const color =
                STATUS_CHART_COLORS[item.status] ?? FALLBACK_COLOR;

              return (
                <div
                  key={item.status}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-foreground truncate">
                    {meta?.label ?? item.status}
                  </span>
                  <span className="ml-auto font-medium text-foreground tabular-nums">
                    {item.count}
                  </span>
                  <span className="w-14 text-right text-muted tabular-nums">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Period summary */}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 text-sm text-muted">
          <span>
            Tạo mới:{" "}
            <span className="font-medium text-foreground">
              {data.periodCreatedOrders}
            </span>{" "}
            đơn
          </span>
          <span>
            Hoàn tất:{" "}
            <span className="font-medium text-emerald-600">
              {data.periodCompletedOrders}
            </span>{" "}
            đơn
          </span>
          <span>
            Đã hủy:{" "}
            <span className="font-medium text-rose-600">
              {data.periodCancelledOrders}
            </span>{" "}
            đơn
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
