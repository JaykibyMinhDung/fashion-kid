import { ArrowDownToLine, History } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryList } from "@/features/inventory/components/inventory-list";

export default function WarehouseInventoryPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Warehouse · Inventory"
        title="Tồn kho vận hành"
        description="Warehouse xem stock theo SKU/Variant. Import và target adjustment đi qua permission backend và luôn sinh ledger."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/warehouse/inventory/history" variant="outline">
              <History className="size-4" aria-hidden="true" /> Lịch sử
            </ButtonLink>
            <ButtonLink href="/warehouse/inventory/import">
              <ArrowDownToLine className="size-4" aria-hidden="true" /> Nhập kho
            </ButtonLink>
          </div>
        }
      />
      <InventoryList basePath="/warehouse/inventory" />
    </div>
  );
}
