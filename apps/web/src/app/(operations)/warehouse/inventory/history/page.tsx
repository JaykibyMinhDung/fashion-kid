import { PageHeader } from "@/components/ui/page-header";
import { InventoryHistory } from "@/features/inventory/components/inventory-history";

export default async function WarehouseInventoryHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ variantId?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Warehouse · Inventory"
        title="Lịch sử biến động tồn kho"
        description="Lịch sử là append-only projection; không có update hoặc delete từ UI."
      />
      <InventoryHistory initialVariantId={params.variantId} />
    </div>
  );
}
