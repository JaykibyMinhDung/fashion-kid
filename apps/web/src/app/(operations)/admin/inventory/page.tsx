import { ArrowDownToLine, History } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryList } from "@/features/inventory/components/inventory-list";

export default function AdminInventoryPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Admin · Inventory"
        title="Tồn kho theo biến thể"
        description="Available được tính từ on_hand − reserved. Mọi mutation tồn kho đi qua action Import/Adjustment và phải tạo Inventory Transaction."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/admin/inventory/history" variant="outline">
              <History className="size-4" aria-hidden="true" /> Lịch sử
            </ButtonLink>
            <ButtonLink href="/admin/inventory/import">
              <ArrowDownToLine className="size-4" aria-hidden="true" /> Nhập kho
            </ButtonLink>
          </div>
        }
      />
      <InventoryList />
    </div>
  );
}
