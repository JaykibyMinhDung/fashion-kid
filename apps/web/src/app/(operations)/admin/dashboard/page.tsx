import { Boxes, Layers3, PackageCheck, Warehouse } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin Portal · Day 1–6" title="Tổng quan vận hành" description="Dashboard đang phản ánh các domain đã được chốt: Catalog, Product Variant và Inventory." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Sản phẩm mẫu" value="03" detail="Dữ liệu mock có cấu trúc sẵn cho Catalog API." icon={Boxes} />
        <StatCard label="Biến thể đang bán" value="12" detail="Mỗi biến thể có SKU, màu, size và giá riêng." icon={Layers3} />
        <StatCard label="Sắp hết hàng" value="01" detail="Ngưỡng demo: available ≤ 5." icon={Warehouse} />
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-sage-soft text-sage"><PackageCheck className="size-5" /></span>
            <div>
              <h2 className="font-bold">Checkpoint hiện tại</h2>
              <p className="mt-1 text-sm text-muted">Admin tạo Product/Variant → nhập Inventory → Customer xem và chọn Variant.</p>
            </div>
          </div>
          <ButtonLink href="/admin/products">Quản lý sản phẩm</ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}
