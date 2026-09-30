"use client";

import { ArrowRight, CheckCircle2, LoaderCircle, Send, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api/error-ux";
import {
  verifyEmail as apiVerifyEmail,
  resendVerification as apiResendVerification,
} from "../api/auth-client";
import { resendVerificationSchema, type ResendVerificationFormValues } from "../forms";

export function VerifyEmailView({
  onVerifyEmail,
  onResendVerification,
}: {
  onVerifyEmail?: (values: { token: string }) => Promise<{ success: boolean; message: string }>;
  onResendVerification?: (values: { email: string }) => Promise<{ message: string }>;
} = {}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState<boolean>(Boolean(token));
  const [verifySuccess, setVerifySuccess] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const verificationAttempted = useRef(false);

  useEffect(() => {
    if (!token || verificationAttempted.current) {
      return;
    }
    verificationAttempted.current = true;

    const verifyPromise = onVerifyEmail
      ? onVerifyEmail({ token })
      : apiVerifyEmail({ token });

    verifyPromise
      .then(() => {
        setVerifySuccess(true);
        setVerifyError(null);
      })
      .catch((caught) => {
        setVerifySuccess(false);
        setVerifyError(
          apiErrorMessage(
            caught,
            "Liên kết xác thực email không hợp lệ hoặc đã hết hạn.",
          ),
        );
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token, onVerifyEmail]);

  const resendForm = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: "" },
  });

  const { errors: resendErrors } = resendForm.formState;
  const resendErrorMsg =
    resendErrors.root?.server?.message ?? resendErrors.email?.message;

  const submitResend = async (values: ResendVerificationFormValues) => {
    resendForm.clearErrors("root.server");
    try {
      if (onResendVerification) {
        await onResendVerification({ email: values.email });
      } else {
        await apiResendVerification({ email: values.email });
      }
      setResendSuccess(values.email);
    } catch (caught) {
      resendForm.setError("root.server", {
        type: "server",
        message: apiErrorMessage(
          caught,
          "Không thể gửi lại email xác thực. Vui lòng thử lại sau.",
        ),
      });
    }
  };

  // State 1: Verifying token in progress
  if (verifying) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
        <LoaderCircle className="size-8 animate-spin text-brand" />
        <p className="mt-4 text-base font-semibold">Đang xác thực địa chỉ email…</p>
        <p className="mt-1 text-sm text-muted">Vui lòng chờ trong giây lát.</p>
      </div>
    );
  }

  // State 2: Verification Successful
  if (verifySuccess) {
    return (
      <div className="mt-8 space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="space-y-2 text-sm leading-6">
              <p className="font-semibold text-emerald-800">
                Xác thực email thành công!
              </p>
              <p>
                Tài khoản của bạn đã được kích hoạt hoàn tất. Bây giờ bạn có thể đăng nhập để bắt đầu trải nghiệm mua sắm.
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

  // State 3: Verification Failed (or manual resend requested)
  return (
    <div className="mt-8 space-y-6">
      {verifyError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 text-red-900">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div className="space-y-1 text-sm leading-6">
              <p className="font-semibold text-red-800">
                Xác thực không thành công
              </p>
              <p>{verifyError}</p>
            </div>
          </div>
        </div>
      ) : null}

      {resendSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="space-y-1 text-sm leading-6">
              <p className="font-semibold text-emerald-800">
                Đã gửi email kích hoạt mới
              </p>
              <p>
                Nếu email <strong>{resendSuccess}</strong> tồn tại và chưa được xác thực, liên kết kích hoạt mới đã được gửi tới hộp thư của bạn.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Nhập địa chỉ email đăng ký để nhận liên kết xác thực mới:
          </p>

          <form
            className="space-y-4"
            noValidate
            onSubmit={resendForm.handleSubmit(submitResend)}
          >
            <label className="block text-sm font-semibold">
              Email tài khoản
              <Input
                className="mt-2"
                {...resendForm.register("email")}
                type="email"
                autoComplete="email"
                placeholder="ban@example.com"
                aria-invalid={resendErrors.email ? true : undefined}
                required
              />
            </label>

            {resendErrorMsg ? (
              <p role="alert" className="text-sm font-medium text-red-700">
                {resendErrorMsg}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={resendForm.formState.isSubmitting}
            >
              {resendForm.formState.isSubmitting
                ? "Đang gửi email…"
                : "Gửi lại email xác thực"}
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}

      <p className="text-center text-sm text-muted">
        Đã xác thực xong?{" "}
        <Link href="/auth/login" className="font-bold text-brand-strong">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
