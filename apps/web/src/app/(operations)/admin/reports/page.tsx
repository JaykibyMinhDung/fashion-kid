import { PageHeader } from '@/components/ui/page-header';
import { AdminReportsView } from '@/features/reports/components/admin-reports-view';

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin · Reports"
        title="Báo cáo vận hành"
        description="Tổng quan nhanh về sản phẩm, tồn kho và đơn hàng theo trạng thái."
      />
      <AdminReportsView />
    </div>
  );
}
