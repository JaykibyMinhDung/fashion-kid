import { PageHeader } from '@/components/ui/page-header';
import { AdminDashboardStats } from '@/features/admin-users/components/admin-dashboard-stats';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin Portal"
        title="Tổng quan vận hành"
        description="Dashboard tổng hợp dữ liệu thực từ API: catalog, inventory và đơn hàng."
      />
      <AdminDashboardStats />
    </div>
  );
}
