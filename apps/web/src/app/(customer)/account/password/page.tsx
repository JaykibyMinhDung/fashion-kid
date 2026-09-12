import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export default function PasswordPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Customer · Day 4" title="Đổi mật khẩu" description="Mật khẩu mới cần khác mật khẩu hiện tại và tuân theo policy của backend." />
      <Card>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
