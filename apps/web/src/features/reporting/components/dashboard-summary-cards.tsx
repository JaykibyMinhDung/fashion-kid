import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatVnd, type DashboardSummary } from "../contracts";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary | null;
  loading?: boolean;
}

export function DashboardSummaryCards({
  summary,
  loading = false,
}: DashboardSummaryCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-28" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Doanh thu hoàn tất",
      value: formatVnd(summary.grossRevenue),
      detail: "Chỉ tính các đơn hàng có trạng thái COMPLETED",
      icon: DollarSign,
      highlight: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Đơn hoàn tất",
      value: summary.completedOrders.toLocaleString("vi-VN"),
      detail: "Số đơn hoàn tất thành công trong kỳ",
      icon: CheckCircle2,
      highlight: "text-blue-700 bg-blue-50",
    },
    {
      label: "Giá trị TB / đơn (AOV)",
      value: formatVnd(summary.averageOrderValue),
      detail: "Doanh thu hoàn tất / Số đơn hoàn tất",
      icon: TrendingUp,
      highlight: "text-indigo-700 bg-indigo-50",
    },
    {
      label: "Sản phẩm đã bán",
      value: summary.unitsSold.toLocaleString("vi-VN"),
      detail: "Tổng số lượng biến thể sản phẩm bán ra",
      icon: ShoppingBag,
      highlight: "text-amber-700 bg-amber-50",
    },
    {
      label: "Cảnh báo tồn kho",
      value: `${summary.outOfStockVariants} hết / ${summary.lowStockVariants} thấp`,
      detail: "Biến thể hết hàng hoặc tồn kho ≤ ngưỡng cảnh báo",
      icon: AlertTriangle,
      highlight:
        summary.outOfStockVariants > 0
          ? "text-rose-700 bg-rose-50"
          : "text-amber-700 bg-amber-50",
    },
    {
      label: "Khách hàng mới",
      value: summary.newCustomers.toLocaleString("vi-VN"),
      detail: "Tài khoản khách hàng đăng ký trong kỳ",
      icon: Users,
      highlight: "text-purple-700 bg-purple-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted">{card.label}</p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.03em]">
                    {card.value}
                  </p>
                </div>
                <span
                  className={`grid size-11 place-items-center rounded-2xl ${card.highlight}`}
                >
                  <Icon className="size-5" />
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">{card.detail}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
