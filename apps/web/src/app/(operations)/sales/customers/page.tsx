import { PageHeader } from '@/components/ui/page-header';
import { CustomerList } from '@/features/admin-users/components/customer-list';

export default function SalesCustomersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sales · Khách hàng"
        title="Danh sách khách hàng"
        description="Xem thông tin và trạng thái tài khoản khách hàng."
      />
      <CustomerList />
    </div>
  );
}
