"use client";

import { ArrowRight, CheckCircle2, KeyRound, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/password-input";
import { apiErrorMessage } from "@/lib/api/error-ux";
import {
  verifyResetOtp as apiVerifyResetOtp,
  resetPassword as apiResetPassword,
} from "../api/auth-client";
import {
  resetPasswordSchema,
  verifyOtpSchema,
  type ResetPasswordFormValues,
  type VerifyOtpFormValues,
} from "../forms";

export function ResetPasswordForm({
  onVerifyOtp,
  onResetPassword,
}: {
  onVerifyOtp?: (values: VerifyOtpFormValues) => Promise<{ resetToken: string }>;
  onResetPassword?: (values: { token: string; newPassword: string }) => Promise<void>;
} = {}) {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const emailFromUrl = searchParams.get("email") ?? "";

  const [activeToken, setActiveToken] = useState<string>(tokenFromUrl);
  const [isCompleted, setIsCompleted] = useState(false);

  // Form 1: Verify OTP (only when activeToken is not present)
  const otpForm = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email: emailFromUrl,
      otp: "",
    },
  });

  // Form 2: New Password
  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const otpErrors = otpForm.formState.errors;
  const otpError =
    otpErrors.root?.server?.message ??
    otpErrors.otp?.message ??
    otpErrors.email?.message;

  const passwordErrors = passwordForm.formState.errors;
  const passwordError =
    passwordErrors.root?.server?.message ??
    passwordErrors.confirmPassword?.message ??
    passwordErrors.newPassword?.message;

  const submitOtp = async (values: VerifyOtpFormValues) => {
    otpForm.clearErrors("root.server");
    try {
      const result = onVerifyOtp
        ? await onVerifyOtp({
            email: values.email,
            otp: values.otp.trim(),
          })
        : await apiVerifyResetOtp({
            email: values.email,
            otp: values.otp.trim(),
          });
      setActiveToken(result.resetToken);
    } catch (caught) {
      otpForm.setError("root.server", {
        type: "server",
        message: apiErrorMessage(
          caught,
          "Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại.",
        ),
      });
    }
  };

  const submitPassword = async (values: ResetPasswordFormValues) => {
    passwordForm.clearErrors("root.server");
    try {
      if (onResetPassword) {
        await onResetPassword({
          token: activeToken,
          newPassword: values.newPassword,
        });
      } else {
        await apiResetPassword({
          token: activeToken,
          newPassword: values.newPassword,
        });
      }
      setIsCompleted(true);
    } catch (caught) {
      passwordForm.setError("root.server", {
        type: "server",
        message: apiErrorMessage(
          caught,
          "Không thể đặt lại mật khẩu. Liên kết hoặc mã OTP có thể đã hết hạn. Vui lòng yêu cầu lại.",
        ),
      });
    }
  };

  if (isCompleted) {
    return (
      <div className="mt-8 space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="space-y-2 text-sm leading-6">
              <p className="font-semibold text-emerald-800">
                Đặt lại mật khẩu thành công!
              </p>
              <p>
                Mật khẩu tài khoản của bạn đã được cập nhật an toàn. Bạn có thể đăng nhập ngay bằng mật khẩu mới.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/auth/login"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong"
        >
          Đăng nhập ngay
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  // If token is already available (from URL or from verified OTP)
  if (activeToken) {
    return (
      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmit={passwordForm.handleSubmit(submitPassword)}
      >
        <div className="rounded-xl border border-border bg-surface-soft p-3 text-xs text-muted flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand-strong shrink-0" />
          <span>Mã xác thực hợp lệ. Vui lòng thiết lập mật khẩu mới (tối thiểu 15 ký tự).</span>
        </div>

        <label className="block text-sm font-semibold">
          Mật khẩu mới
          <PasswordInput
            className="mt-2"
            {...passwordForm.register("newPassword")}
            autoComplete="new-password"
            placeholder="Tối thiểu 15 ký tự"
            aria-invalid={passwordErrors.newPassword ? true : undefined}
            required
          />
        </label>

        <label className="block text-sm font-semibold">
          Xác nhận mật khẩu mới
          <PasswordInput
            className="mt-2"
            {...passwordForm.register("confirmPassword")}
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            aria-invalid={passwordErrors.confirmPassword ? true : undefined}
            required
          />
        </label>

        {passwordError ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {passwordError}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={passwordForm.formState.isSubmitting}
        >
          {passwordForm.formState.isSubmitting ? "Đang lưu mật khẩu…" : "Xác nhận đổi mật khẩu"}
          <Lock className="size-4" aria-hidden="true" />
        </Button>

        <p className="mt-4 text-center text-xs text-muted">
          <button
            type="button"
            onClick={() => setActiveToken("")}
            className="text-brand-strong hover:underline"
          >
            Nhập lại mã OTP khác hoặc đổi email
          </button>
        </p>
      </form>
    );
  }

  // Flow: Verify OTP
  return (
    <>
      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmit={otpForm.handleSubmit(submitOtp)}
      >
        <label className="block text-sm font-semibold">
          Email tài khoản
          <Input
            className="mt-2"
            {...otpForm.register("email")}
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            aria-invalid={otpErrors.email ? true : undefined}
            required
          />
        </label>

        <label className="block text-sm font-semibold">
          Mã xác thực OTP (6 chữ số)
          <Input
            className="mt-2 tracking-widest text-center font-mono text-lg"
            {...otpForm.register("otp")}
            type="text"
            maxLength={6}
            placeholder="123456"
            aria-invalid={otpErrors.otp ? true : undefined}
            required
          />
        </label>

        {otpError ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {otpError}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={otpForm.formState.isSubmitting}
        >
          {otpForm.formState.isSubmitting ? "Đang xác thực OTP…" : "Xác thực mã OTP"}
          <KeyRound className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Chưa nhận được mã OTP?{" "}
        <Link href="/auth/forgot-password" className="font-bold text-brand-strong">
          Gửi lại yêu cầu
        </Link>
      </p>
    </>
  );
}
