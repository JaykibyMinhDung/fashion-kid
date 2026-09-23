"use client";

import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api/error-ux";
import { forgotPassword as apiForgotPassword } from "../api/auth-client";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../forms";

export function ForgotPasswordForm({
  onSubmitEmail,
}: {
  onSubmitEmail?: (values: ForgotPasswordFormValues) => Promise<unknown>;
} = {}) {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const { errors } = form.formState;
  const error = errors.root?.server?.message ?? errors.email?.message;

  const submit = async (values: ForgotPasswordFormValues) => {
    form.clearErrors("root.server");
    try {
      if (onSubmitEmail) {
        await onSubmitEmail(values);
      } else {
        await apiForgotPassword({ email: values.email });
      }
      setSubmittedEmail(values.email);
    } catch (caught) {
      form.setError("root.server", {
        type: "server",
        message: apiErrorMessage(
          caught,
          "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.",
        ),
      });
    }
  };

  if (submittedEmail) {
    return (
      <div className="mt-8 space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="space-y-2 text-sm leading-6">
              <p className="font-semibold text-emerald-800">
                Đã gửi hướng dẫn khôi phục mật khẩu
              </p>
              <p>
                Nếu địa chỉ email <strong className="font-medium text-emerald-950">{submittedEmail}</strong> có trong hệ thống, bạn sẽ nhận được một email chứa liên kết và mã xác thực OTP gồm 6 chữ số.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href={`/auth/reset-password?email=${encodeURIComponent(submittedEmail)}`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong"
          >
            Nhập mã OTP đặt lại mật khẩu
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/auth/login"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-foreground hover:bg-surface-soft"
          >
            Quay lại trang Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <form className="mt-8 space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
        <label className="block text-sm font-semibold">
          Địa chỉ Email tài khoản
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

        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Đang gửi yêu cầu…" : "Gửi hướng dẫn đặt lại"}
          <Mail className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Nhớ lại mật khẩu?{" "}
        <Link href="/auth/login" className="font-bold text-brand-strong">
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
