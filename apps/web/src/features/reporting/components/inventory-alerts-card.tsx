import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { InventoryAlertsResponse } from "../contracts";

interface InventoryAlertsCardProps {
  data: InventoryAlertsResponse | null;
  loading?: boolean;
}

export function InventoryAlertsCard({
  data,
  loading = false,
}: InventoryAlertsCardProps) {
  if (loading || !data) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-64" />
      </Card>
    );
  }

  const items = data.items ?? [];

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div>
            <h3 className="text-base font-bold">Cảnh báo tồn kho</h3>
            <p className="text-xs text-muted">
              {data.outOfStockCount} hết hàng · {data.lowStockCount} sắp hết (≤{" "}
              {data.threshold} cái)
            </p>
          </div>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong hover:underline"
          >
            Quản lý kho <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              ✓
            </span>
            <p>Tồn kho ở trạng thái an toàn, không có cảnh báo</p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-border/30 overflow-y-auto max-h-72">
            {items.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center justify-between py-2.5 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate font-semibold text-foreground">
                    {item.productName}
                  </p>
                  <p className="text-[11px] text-muted">
                    SKU: {item.sku} · {item.sizeName} / {item.colorName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      item.isOutOfStock
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    <AlertCircle className="size-3" />
                    {item.isOutOfStock
                      ? "Hết hàng"
                      : `Còn ${item.available}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
