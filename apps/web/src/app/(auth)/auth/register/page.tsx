import { UserPlus } from "lucide-react";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-2xl bg-sage-soft text-sage"><UserPlus className="size-5" /></span>
      <h1 className="mt-6 text-3xl font-black tracking-[-0.045em]">Tạo tài khoản Customer</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Tài khoản đăng ký công khai luôn nhận role Customer.</p>

      <RegisterForm />
    </div>
  );
}
