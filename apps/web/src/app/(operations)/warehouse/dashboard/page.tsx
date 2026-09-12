import { Boxes, PackageSearch, Warehouse } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { RoutePlaceholder } from "@/components/shared/route-placeholder";

export default function WarehouseDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Warehouse Staff · Day 6"
        title="Tổng quan kho"
        description="Portal Warehouse hiện chỉ mở phạm vi Inventory đã có tài liệu; Packing Queue được giữ ngoài backlog."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="SKU có tồn"
          value="03"
          detail="Dữ liệu mock theo Variant + Warehouse."
          icon={Boxes}
        />
        <StatCard
          label="Sắp hết hàng"
          value="01"
          detail="Available thấp hơn ngưỡng demo."
          icon={PackageSearch}
        />
        <StatCard
          label="Kho hoạt động"
          value="01"
          detail="MVP sử dụng một kho mặc định."
          icon={Warehouse}
        />
      </div>
      <RoutePlaceholder
        eyebrow="Warehouse boundary"
        title="Packing Queue chưa mở"
        description="Order fulfillment chưa được code trước khi tài liệu Order hoàn tất."
        checklist={[
          "Warehouse được đọc Inventory",
          "Import/Adjustment phụ thuộc permission",
          "Không chỉnh giá, Product hoặc Customer",
        ]}
        documentStatus="Chỉ triển khai Inventory"
      />
    </div>
  );
}
