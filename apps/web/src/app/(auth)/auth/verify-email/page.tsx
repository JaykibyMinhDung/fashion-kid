import { Suspense } from "react";
import { MailCheck } from "lucide-react";
import { VerifyEmailView } from "@/features/auth/components/verify-email-view";

export default function VerifyEmailPage() {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
        <MailCheck className="size-5" />
      </span>
      <h1 className="mt-6 text-3xl font-black tracking-[-0.045em]">Xác thực tài khoản</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Xác nhận quyền sở hữu email để hoàn tất kích hoạt tài khoản Kids Fashion của bạn.
      </p>

      <Suspense
        fallback={
          <div className="mt-8 text-center text-sm text-muted">
            Đang tải thông tin xác thực…
          </div>
        }
      >
        <VerifyEmailView />
      </Suspense>
    </div>
  );
}
