import { PageHeader } from '@/components/ui/page-header';
import { AuditLogTable } from '@/features/audit/components/audit-log-table';

export default function AuditPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin · System"
        title="Audit Log"
        description="Lịch sử hoạt động hệ thống: ai làm gì, lúc nào, từ IP nào."
      />
      <AuditLogTable />
    </div>
  );
}
