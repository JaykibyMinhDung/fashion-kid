import { PageHeader } from "@/components/ui/page-header";
import { InventoryImportForm } from "@/features/inventory/components/inventory-import-form";

export default function WarehouseInventoryImportPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Warehouse · Inventory"
        title="Nhập kho"
        description="Stock Import chỉ tăng on_hand và phải sinh Inventory Transaction loại IMPORT."
      />
      <InventoryImportForm basePath="/warehouse/inventory" />
    </div>
  );
}
