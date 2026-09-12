import { PageHeader } from "@/components/ui/page-header";
import { InventoryImportForm } from "@/features/inventory/components/inventory-import-form";

export default function AdminInventoryImportPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Admin · Inventory"
        title="Nhập kho"
        description="Stock Import chỉ tăng on_hand và phải sinh Inventory Transaction loại IMPORT."
      />
      <InventoryImportForm />
    </div>
  );
}
