import { LockKeyhole } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-strong"><LockKeyhole className="size-5" /></span>
      <h1 className="mt-6 text-3xl font-black tracking-[-0.045em]">Chào mừng bạn trở lại</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Đăng nhập để mua sắm hoặc truy cập portal theo quyền được cấp.</p>

      <LoginForm />
    </div>
  );
}
