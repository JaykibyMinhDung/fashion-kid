import { PageHeader } from "@/components/ui/page-header";
import { InventoryAdjustmentForm } from "@/features/inventory/components/inventory-adjustment-form";

export default async function WarehouseInventoryAdjustmentPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Warehouse · Inventory"
        title="Điều chỉnh tồn kho"
        description="Không ghi đè quantity tùy ý; adjustment bắt buộc có on hand đích và lý do."
      />
      <InventoryAdjustmentForm variantId={variantId} basePath="/warehouse/inventory" />
    </div>
  );
}
