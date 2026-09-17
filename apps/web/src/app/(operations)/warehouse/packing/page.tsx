import { PageHeader } from '@/components/ui/page-header';
import { PackingQueue } from '@/features/orders/components/packing-queue';

export default function WarehousePackingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Warehouse · Đóng gói"
        title="Packing Queue"
        description="Danh sách đơn hàng đã được xác nhận và sẵn sàng để đóng gói."
      />
      <PackingQueue />
    </div>
  );
}
