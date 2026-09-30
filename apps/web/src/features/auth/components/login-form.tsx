"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/password-input";
import { apiErrorMessage } from "@/lib/api/error-ux";
import { ApiClientError } from "@/lib/api/api-client";
import { loginSchema, type LoginFormValues } from "../forms";
import { landingPathForRole } from "../role-routing";
import { useAuth } from "../session/auth-provider";

function loginErrorMessage(error: unknown): string {
  return apiErrorMessage(error, "Không thể đăng nhập lúc này. Vui lòng thử lại.");
}

export function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const [isUnverifiedEmail, setIsUnverifiedEmail] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });
  const { errors } = form.formState;
  const error = errors.root?.server?.message ?? errors.email?.message ?? errors.password?.message;

  const submit = async (values: LoginFormValues) => {
    form.clearErrors("root.server");
    setIsUnverifiedEmail(false);
    try {
      const user = await auth.login({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });
      router.replace(landingPathForRole(user.role));
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === "EMAIL_NOT_VERIFIED") {
        setIsUnverifiedEmail(true);
      }
      form.setError("root.server", { type: "server", message: loginErrorMessage(caught) });
    }
  };

  return (
    <>
      <form className="mt-8 space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
        <label className="block text-sm font-semibold">
          Email
          <Input
            className="mt-2"
            {...form.register("email")}
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            aria-invalid={errors.email ? true : undefined}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Mật khẩu
          <PasswordInput
            className="mt-2"
            {...form.register("password")}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            aria-invalid={errors.password ? true : undefined}
            required
          />
        </label>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" {...form.register("remember")} /> Ghi nhớ đăng nhập
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-semibold text-brand-strong hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
        {error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
            {isUnverifiedEmail ? (
              <p className="text-xs">
                <Link
                  href="/auth/verify-email"
                  className="font-semibold text-brand-strong underline hover:text-brand"
                >
                  Nhấp vào đây để nhận lại email kích hoạt tài khoản
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link href="/auth/register" className="font-bold text-brand-strong">
          Đăng ký
        </Link>
      </p>
    </>
  );
}
