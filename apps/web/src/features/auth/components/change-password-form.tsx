"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/shared/password-input";
import { ApiClientError } from "@/lib/api/api-client";
import { apiErrorMessage } from "@/lib/api/error-ux";
import { changePasswordSchema, type ChangePasswordFormValues } from "../forms";
import { useAuth } from "../session/auth-provider";

function changePasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "INVALID_CREDENTIALS") {
    return "Mật khẩu hiện tại không đúng.";
  }
  return apiErrorMessage(error, "Không thể đổi mật khẩu lúc này. Vui lòng thử lại.");
}

export function ChangePasswordForm() {
  const auth = useAuth();
  const router = useRouter();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  const error = errors.root?.server?.message ?? errors.confirmPassword?.message ?? errors.newPassword?.message;

  const submit = async (values: ChangePasswordFormValues) => {
    form.clearErrors("root.server");
    try {
      await auth.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      router.replace("/auth/login");
    } catch (caught) {
      form.setError("root.server", { type: "server", message: changePasswordErrorMessage(caught) });
    }
  };

  return (
    <form className="max-w-lg space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
      <label className="block text-sm font-semibold">
        Mật khẩu hiện tại
        <PasswordInput
          className="mt-2"
          {...form.register("currentPassword")}
          autoComplete="current-password"
          required
          aria-invalid={errors.currentPassword ? true : undefined}
        />
      </label>
      <label className="block text-sm font-semibold">
        Mật khẩu mới
        <PasswordInput
          className="mt-2"
          {...form.register("newPassword")}
          autoComplete="new-password"
          required
          aria-invalid={errors.newPassword ? true : undefined}
        />
      </label>
      <label className="block text-sm font-semibold">
        Xác nhận mật khẩu mới
        <PasswordInput
          className="mt-2"
          {...form.register("confirmPassword")}
          autoComplete="new-password"
          required
          aria-invalid={errors.confirmPassword ? true : undefined}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        <KeyRound className="size-4" aria-hidden="true" />
        {form.formState.isSubmitting ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
      </Button>
    </form>
  );
}
