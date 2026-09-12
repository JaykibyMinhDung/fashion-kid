import { PageHeader } from "@/components/ui/page-header";
import { AdminUserList } from "@/features/admin-users/components/admin-user-list";

export default function AdminUsersPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Admin · Access"
        title="Người dùng"
        description="Theo dõi tài khoản, vai trò và trạng thái truy cập. Mọi thay đổi đều được backend kiểm tra và ghi audit."
      />
      <AdminUserList />
    </div>
  );
}
