import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
        <ShieldCheck className="size-5" />
      </span>
      <h1 className="mt-6 text-3xl font-black tracking-[-0.045em]">Đặt lại mật khẩu</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Nhập mã xác thực OTP từ email của bạn hoặc liên kết khôi phục để tạo mật khẩu mới.
      </p>

      <Suspense
        fallback={
          <div className="mt-8 text-center text-sm text-muted">
            Đang tải biểu mẫu đặt lại mật khẩu…
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
