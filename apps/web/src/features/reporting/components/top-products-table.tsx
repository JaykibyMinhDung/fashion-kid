import { Card, CardContent } from "@/components/ui/card";
import { formatVnd, type TopProductsResponse } from "../contracts";

interface TopProductsTableProps {
  data: TopProductsResponse | null;
  loading?: boolean;
}

export function TopProductsTable({
  data,
  loading = false,
}: TopProductsTableProps) {
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
        <div className="border-b border-border/50 pb-4">
          <h3 className="text-base font-bold">Top sản phẩm bán chạy</h3>
          <p className="text-xs text-muted">
            Xếp hạng theo doanh thu sản phẩm trên các đơn hoàn tất
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted">
            Chưa có sản phẩm nào bán ra trong khoảng thời gian này
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/50 text-muted">
                <tr>
                  <th className="pb-2 font-semibold">#</th>
                  <th className="pb-2 font-semibold">Sản phẩm & Phân loại</th>
                  <th className="pb-2 font-semibold">SKU</th>
                  <th className="pb-2 text-right font-semibold">Đã bán</th>
                  <th className="pb-2 text-right font-semibold">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {items.map((item, idx) => (
                  <tr key={`${item.productId}-${item.variantId}-${idx}`}>
                    <td className="py-2.5 font-bold text-muted">{idx + 1}</td>
                    <td className="py-2.5">
                      <p className="font-semibold text-foreground">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-[11px] text-muted">
                          {item.variantName}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 font-mono text-muted">{item.sku}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {item.unitsSold.toLocaleString("vi-VN")} sp
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-700">
                      {formatVnd(item.productRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border/50 text-xs font-bold">
                <tr>
                  <td colSpan={3} className="pt-3 text-muted">
                    Tổng cộng top ({items.length} sản phẩm)
                  </td>
                  <td className="pt-3 text-right">
                    {data.totalUnitsRanked.toLocaleString("vi-VN")} sp
                  </td>
                  <td className="pt-3 text-right text-emerald-700">
                    {formatVnd(data.totalRevenueRanked)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
