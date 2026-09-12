import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RoutePlaceholder } from "@/components/shared/route-placeholder";

export default function SalesDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sales Staff"
        title="Vận hành bán hàng"
        description="Portal Sales đã được tách layout và navigation, nhưng nghiệp vụ Order chưa được triển khai trước khi tài liệu day tương ứng hoàn tất."
      />
      <Card className="bg-[#fbf2e7] shadow-none">
        <CardContent className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-[#a36b34]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">Ranh giới role đã sẵn sàng</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Sales không có quyền chỉnh Product hoặc Inventory. Route Order Queue sẽ được mở khi contract Order được freeze.
            </p>
          </div>
        </CardContent>
      </Card>
      <RoutePlaceholder
        eyebrow="Roadmap có kiểm soát"
        title="Order Queue chưa mở"
        description="Không giả định transition hoặc response shape trước tài liệu."
        checklist={[
          "Giữ riêng action Confirm/Cancel của Sales",
          "Dùng chung Order Detail từ feature/order",
          "Backend permission là security boundary",
        ]}
        documentStatus="Chờ tài liệu Order"
      />
    </div>
  );
}
