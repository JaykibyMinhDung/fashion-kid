import { PageHeader } from "@/components/ui/page-header";
import { InventoryHistory } from "@/features/inventory/components/inventory-history";

export default async function AdminInventoryHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ variantId?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Admin · Inventory"
        title="Lịch sử biến động tồn kho"
        description="Màn hình chỉ đọc cho Inventory Transaction; không cung cấp update hoặc delete."
      />
      <InventoryHistory initialVariantId={params.variantId} />
    </div>
  );
}
