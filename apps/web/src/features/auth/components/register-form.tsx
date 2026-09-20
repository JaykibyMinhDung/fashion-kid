"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/password-input";
import { apiErrorMessage } from "@/lib/api/error-ux";
import { registerSchema, type RegisterFormValues } from "../forms";
import { landingPathForRole } from "../role-routing";
import { useAuth } from "../session/auth-provider";

function registrationErrorMessage(error: unknown): string {
  return apiErrorMessage(
    error,
    "Không thể tạo tài khoản. Vui lòng kiểm tra thông tin hoặc thử lại sau.",
  );
}

export function RegisterForm() {
  const auth = useAuth();
  const router = useRouter();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });
  const { errors } = form.formState;
  const error = errors.root?.server?.message ?? errors.confirmPassword?.message ?? errors.password?.message ?? errors.fullName?.message ?? errors.email?.message;

  const submit = async (values: RegisterFormValues) => {
    form.clearErrors("root.server");
    try {
      const user = await auth.register({
        fullName: values.fullName,
        email: values.email,
        ...(values.phone ? { phone: values.phone } : {}),
        password: values.password,
        remember: false,
      });
      router.replace(landingPathForRole(user.role));
    } catch (caught) {
      form.setError("root.server", { type: "server", message: registrationErrorMessage(caught) });
    }
  };

  return (
    <>
      <form
        className="mt-8 grid gap-5 sm:grid-cols-2"
        noValidate
        onSubmit={form.handleSubmit(submit)}
      >
        <label className="block text-sm font-semibold sm:col-span-2">
          Họ và tên
          <Input className="mt-2" {...form.register("fullName")} autoComplete="name" required aria-invalid={errors.fullName ? true : undefined} />
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          Email
          <Input
            className="mt-2"
            {...form.register("email")}
            type="email"
            autoComplete="email"
            required
            aria-invalid={errors.email ? true : undefined}
          />
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          Số điện thoại (không bắt buộc)
          <Input className="mt-2" {...form.register("phone")} type="tel" autoComplete="tel" />
        </label>
        <label className="block text-sm font-semibold">
          Mật khẩu
          <PasswordInput
            className="mt-2"
            {...form.register("password")}
            autoComplete="new-password"
            required
            aria-invalid={errors.password ? true : undefined}
          />
        </label>
        <label className="block text-sm font-semibold">
          Xác nhận mật khẩu
          <PasswordInput
            className="mt-2"
            {...form.register("confirmPassword")}
            autoComplete="new-password"
            required
            aria-invalid={errors.confirmPassword ? true : undefined}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700 sm:col-span-2">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="sm:col-span-2" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/auth/login" className="font-bold text-brand-strong">
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
