"use client";

import { useRef, useCallback } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { ChartOptions, TooltipItem } from "chart.js";
import { Line } from "react-chartjs-2";
import { Card, CardContent } from "@/components/ui/card";
import type { RevenueSeriesResponse } from "../contracts";
import {
  formatVnd,
  formatCompactVnd,
  formatDateDisplay,
} from "../contracts";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface RevenueChartProps {
  data: RevenueSeriesResponse | null;
  loading?: boolean;
  onGranularityChange?: (granularity: "day" | "week" | "month") => void;
}

const GRANULARITY_OPTIONS: {
  value: "day" | "week" | "month";
  label: string;
}[] = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
];

export function RevenueChart({
  data,
  loading,
  onGranularityChange,
}: RevenueChartProps) {
  const chartRef = useRef<Chart<"line">>(null);

  const createGradient = useCallback(
    (ctx: CanvasRenderingContext2D, chartArea: { top: number; bottom: number }) => {
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
      gradient.addColorStop(0.7, "rgba(16, 185, 129, 0.08)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
      return gradient;
    },
    [],
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 rounded bg-border" />
              <div className="flex gap-2">
                <div className="h-8 w-14 rounded bg-border" />
                <div className="h-8 w-14 rounded bg-border" />
                <div className="h-8 w-14 rounded bg-border" />
              </div>
            </div>
            <div className="h-4 w-64 rounded bg-border" />
            <div className="h-64 rounded bg-border" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.series.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Biểu đồ doanh thu
            </h3>
            {onGranularityChange && (
              <GranularityToggle
                active={data?.granularity ?? "day"}
                onChange={onGranularityChange}
              />
            )}
          </div>
          <div className="flex h-64 items-center justify-center text-muted">
            Chưa có dữ liệu doanh thu trong khoảng thời gian đã chọn
          </div>
        </CardContent>
      </Card>
    );
  }

  const labels = data.series.map((p) => {
    const display = formatDateDisplay(p.date);
    const parts = display.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : display;
  });

  const revenueValues = data.series.map((p) => Number(p.grossRevenue));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Doanh thu",
        data: revenueValues,
        borderColor: "#10b981",
        borderWidth: 2,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: (context: { chart: Chart<"line"> }) => {
          const { chart } = context;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "rgba(16, 185, 129, 0.1)";
          return createGradient(ctx, chartArea);
        },
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.5,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
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
        displayColors: false,
        callbacks: {
          title: (items: TooltipItem<"line">[]) => {
            if (!items.length) return "";
            const idx = items[0].dataIndex;
            return formatDateDisplay(data.series[idx].date);
          },
          label: (item: TooltipItem<"line">) => {
            const idx = item.dataIndex;
            const point = data.series[idx];
            return [
              `Doanh thu: ${formatVnd(point.grossRevenue)}`,
              `Đơn hoàn tất: ${point.completedOrders} đơn`,
            ] as unknown as string;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgb(156, 163, 175)",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: "rgba(156, 163, 175, 0.15)",
        },
        ticks: {
          color: "rgb(156, 163, 175)",
          callback: (value: string | number) => formatCompactVnd(String(value)),
        },
        border: {
          display: false,
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-foreground">
            Biểu đồ doanh thu
          </h3>
          {onGranularityChange && (
            <GranularityToggle
              active={data.granularity}
              onChange={onGranularityChange}
            />
          )}
        </div>

        <p className="text-sm text-muted mb-4">
          Tổng doanh thu: {formatVnd(data.totalRevenue)} &middot; Đơn hoàn
          tất: {data.totalOrders} đơn
        </p>

        <Line ref={chartRef} data={chartData} options={options} />
      </CardContent>
    </Card>
  );
}

function GranularityToggle({
  active,
  onChange,
}: {
  active: "day" | "week" | "month";
  onChange: (g: "day" | "week" | "month") => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border p-0.5">
      {GRANULARITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            active === opt.value
              ? "bg-emerald-500 text-white"
              : "text-muted hover:text-foreground hover:bg-surface"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
