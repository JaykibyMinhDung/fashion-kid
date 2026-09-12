import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "@/features/profile/components/profile-form";

export default function ProfilePage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ cá nhân"
        description="Thông tin cơ bản dùng cho tài khoản và liên hệ đơn hàng."
      />
      <Card>
        <CardContent>
          <ProfileForm />
        </CardContent>
      </Card>
    </div>
  );
}
