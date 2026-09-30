import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
        <KeyRound className="size-5" />
      </span>
      <h1 className="mt-6 text-3xl font-black tracking-[-0.045em]">Quên mật khẩu?</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Đừng lo lắng, hãy nhập địa chỉ email của bạn để nhận mã OTP hoặc liên kết đặt lại mật khẩu an toàn.
      </p>

      <ForgotPasswordForm />
    </div>
  );
}
