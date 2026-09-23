"use client";

import { LoaderCircle, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { apiErrorMessage } from "@/lib/api/error-ux";
import { useAuth } from "@/features/auth/session/auth-provider";
import { createCoupon, updateCoupon } from "../api/admin-coupon-client";
import type { Coupon } from "../contracts";
import { couponFormSchema, type CouponFormValues } from "../forms";

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string {
  return new Date(local).toISOString();
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "COUPON_CODE_CONFLICT") {
      return "Mã coupon đã tồn tại. Vui lòng chọn mã khác.";
    }
    if (error.code === "COUPON_IMMUTABLE_AFTER_USAGE") {
      return "Không thể sửa mã đã phát sinh lượt sử dụng.";
    }
    return apiErrorMessage(error, "Không thể lưu coupon lúc này.");
  }
  return "Không thể lưu coupon lúc này. Vui lòng thử lại.";
}

export function AdminCouponFormModal({
  mode,
  coupon,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  coupon?: Coupon;
  onClose(): void;
  onSaved(message: string): void;
}) {
  const { authorizedRequest } = useAuth();
  const isEdit = mode === "edit";

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: coupon?.code ?? "",
      name: coupon?.name ?? "",
      description: coupon?.description ?? "",
      type: coupon?.type ?? "FIXED_AMOUNT",
      value: coupon?.value ?? "",
      minOrderAmount: coupon?.minOrderAmount ?? "0",
      maxDiscountAmount: coupon?.maxDiscountAmount ?? "",
      usageLimit: coupon?.usageLimit != null ? String(coupon.usageLimit) : "",
      perUserLimit:
        coupon?.perUserLimit != null ? String(coupon.perUserLimit) : "",
      startsAt: toLocalInput(coupon?.startsAt),
      endsAt: toLocalInput(coupon?.endsAt),
      status: coupon?.status ?? "ACTIVE",
    },
  });

  const { errors } = form.formState;
  const serverError = errors.root?.server?.message;
  const type = form.watch("type");

  const submit = async (values: CouponFormValues) => {
    form.clearErrors("root.server");
    try {
      if (isEdit && coupon) {
        await updateCoupon(authorizedRequest, coupon.id, {
          name: values.name,
          description: values.description.trim() ? values.description : null,
          minOrderAmount: values.minOrderAmount || "0",
          maxDiscountAmount:
            values.maxDiscountAmount.trim() === ""
              ? null
              : values.maxDiscountAmount,
          usageLimit:
            values.usageLimit.trim() === "" ? null : Number(values.usageLimit),
          perUserLimit:
            values.perUserLimit.trim() === ""
              ? null
              : Number(values.perUserLimit),
          startsAt: toIso(values.startsAt),
          endsAt: toIso(values.endsAt),
        });
        onSaved("Đã cập nhật coupon.");
      } else {
        await createCoupon(authorizedRequest, {
          code: values.code,
          name: values.name,
          description: values.description.trim()
            ? values.description
            : undefined,
          type: values.type,
          value: values.value,
          minOrderAmount: values.minOrderAmount || undefined,
          maxDiscountAmount: values.maxDiscountAmount.trim()
            ? values.maxDiscountAmount
            : undefined,
          usageLimit: values.usageLimit.trim()
            ? Number(values.usageLimit)
            : undefined,
          perUserLimit: values.perUserLimit.trim()
            ? Number(values.perUserLimit)
            : undefined,
          startsAt: toIso(values.startsAt),
          endsAt: toIso(values.endsAt),
          status: values.status,
        });
        onSaved("Đã tạo coupon mới.");
      }
    } catch (caught) {
      form.setError("root.server", {
        type: "server",
        message: saveErrorMessage(caught),
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Sửa coupon" : "Tạo coupon"}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">
            {isEdit ? `Sửa coupon ${coupon?.code}` : "Tạo coupon mới"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-1.5 text-muted hover:bg-surface-soft hover:text-foreground transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit(submit)}
          noValidate
          className="space-y-4 px-6 py-5"
        >
          {isEdit ? (
            <p className="rounded-xl bg-surface-soft p-3 text-xs text-muted">
              Không thể đổi <strong>mã</strong>, <strong>loại</strong> và{" "}
              <strong>giá trị</strong> sau khi tạo (đặc biệt sau khi có lượt
              dùng). Chỉnh các trường này bằng cách tạo coupon mới.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-muted">
              Mã coupon
              <Input
                className="mt-1 uppercase"
                {...form.register("code")}
                disabled={isEdit}
                placeholder="VD: SALE50K"
              />
              {errors.code ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.code.message}
                </span>
              ) : null}
            </label>
            <label className="text-xs font-bold text-muted">
              Tên chương trình
              <Input className="mt-1" {...form.register("name")} />
              {errors.name ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.name.message}
                </span>
              ) : null}
            </label>
          </div>

          <label className="block text-xs font-bold text-muted">
            Mô tả (tuỳ chọn)
            <Textarea
              className="mt-1"
              rows={2}
              {...form.register("description")}
            />
            {errors.description ? (
              <span className="mt-1 block font-medium text-red-700">
                {errors.description.message}
              </span>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-muted">
              Loại giảm
              <Select
                className="mt-1"
                {...form.register("type")}
                disabled={isEdit}
              >
                <option value="FIXED_AMOUNT">Giảm số tiền cố định (VND)</option>
                <option value="PERCENTAGE">Giảm theo phần trăm (%)</option>
              </Select>
            </label>
            <label className="text-xs font-bold text-muted">
              {type === "PERCENTAGE" ? "Phần trăm giảm (1–100)" : "Số tiền giảm (VND)"}
              <Input
                className="mt-1"
                inputMode="numeric"
                {...form.register("value")}
                disabled={isEdit}
                placeholder={type === "PERCENTAGE" ? "VD: 10" : "VD: 50000"}
              />
              {errors.value ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.value.message}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-muted">
              Đơn tối thiểu (VND)
              <Input
                className="mt-1"
                inputMode="numeric"
                {...form.register("minOrderAmount")}
                placeholder="0"
              />
              {errors.minOrderAmount ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.minOrderAmount.message}
                </span>
              ) : null}
            </label>
            <label className="text-xs font-bold text-muted">
              Giảm tối đa (VND){type === "PERCENTAGE" ? "" : " — chỉ cho %"}
              <Input
                className="mt-1"
                inputMode="numeric"
                {...form.register("maxDiscountAmount")}
                placeholder="Bỏ trống nếu không giới hạn"
              />
              {errors.maxDiscountAmount ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.maxDiscountAmount.message}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-muted">
              Giới hạn lượt dùng (tổng)
              <Input
                className="mt-1"
                inputMode="numeric"
                {...form.register("usageLimit")}
                placeholder="Bỏ trống = không giới hạn"
              />
              {errors.usageLimit ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.usageLimit.message}
                </span>
              ) : null}
            </label>
            <label className="text-xs font-bold text-muted">
              Giới hạn mỗi người
              <Input
                className="mt-1"
                inputMode="numeric"
                {...form.register("perUserLimit")}
                placeholder="Bỏ trống = không giới hạn"
              />
              {errors.perUserLimit ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.perUserLimit.message}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-muted">
              Bắt đầu
              <Input
                className="mt-1"
                type="datetime-local"
                {...form.register("startsAt")}
              />
              {errors.startsAt ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.startsAt.message}
                </span>
              ) : null}
            </label>
            <label className="text-xs font-bold text-muted">
              Kết thúc
              <Input
                className="mt-1"
                type="datetime-local"
                {...form.register("endsAt")}
              />
              {errors.endsAt ? (
                <span className="mt-1 block font-medium text-red-700">
                  {errors.endsAt.message}
                </span>
              ) : null}
            </label>
          </div>

          {!isEdit ? (
            <label className="block text-xs font-bold text-muted sm:w-1/2">
              Trạng thái
              <Select className="mt-1" {...form.register("status")}>
                <option value="ACTIVE">Kích hoạt</option>
                <option value="DISABLED">Vô hiệu hoá</option>
              </Select>
            </label>
          ) : null}

          {serverError ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {serverError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isEdit ? "Lưu thay đổi" : "Tạo coupon"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
