"use client";

import { LoaderCircle, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { apiErrorMessage } from "@/lib/api/error-ux";
import { useAuth } from "@/features/auth/session/auth-provider";
import { createReview, updateReview } from "../api/review-client";
import type { Review } from "../contracts";
import { reviewFormSchema, type ReviewFormValues } from "../forms";
import { StarRating } from "./star-rating";

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "REVIEW_ALREADY_EXISTS") {
      return "Bạn đã đánh giá sản phẩm này trong đơn hàng rồi.";
    }
    if (error.code === "REVIEW_NOT_ELIGIBLE") {
      return "Bạn chỉ có thể đánh giá sản phẩm thuộc đơn hàng đã hoàn tất.";
    }
    return apiErrorMessage(error, "Không thể lưu đánh giá lúc này.");
  }
  return "Không thể lưu đánh giá lúc này. Vui lòng thử lại.";
}

export function ReviewFormModal(
  props: {
    onClose(): void;
    onSaved(message: string): void;
  } & (
    | { mode: "create"; orderItemId: string; productName: string; review?: never }
    | { mode: "edit"; review: Review; orderItemId?: never; productName?: never }
  ),
) {
  const { onClose, onSaved } = props;
  const isEdit = props.mode === "edit";
  const { authorizedRequest } = useAuth();

  const initialRating = props.mode === "edit" ? props.review.rating : 0;
  const initialComment =
    props.mode === "edit" ? (props.review.comment ?? "") : "";
  const title =
    props.mode === "edit"
      ? (props.review.product?.name ?? "Đánh giá của bạn")
      : props.productName;

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: initialRating,
      comment: initialComment,
    },
  });

  const { errors } = form.formState;
  const rating = form.watch("rating");
  const comment = form.watch("comment");
  const serverError = errors.root?.server?.message;

  const submit = async (values: ReviewFormValues) => {
    form.clearErrors("root.server");
    try {
      if (props.mode === "edit") {
        await updateReview(authorizedRequest, props.review.id, {
          rating: values.rating,
          comment: values.comment.trim() ? values.comment : null,
        });
        onSaved("Đã cập nhật đánh giá.");
      } else {
        await createReview(authorizedRequest, {
          orderItemId: props.orderItemId,
          rating: values.rating,
          comment: values.comment.trim() ? values.comment : undefined,
        });
        onSaved("Cảm ơn bạn đã đánh giá sản phẩm!");
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
      aria-label={isEdit ? "Sửa đánh giá" : "Viết đánh giá"}
    >
      <div className="w-full max-w-lg rounded-3xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">
            {isEdit ? "Sửa đánh giá" : "Viết đánh giá"}
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
          <p className="text-sm text-muted">
            Sản phẩm: <span className="font-semibold text-foreground">{title}</span>
          </p>

          <div>
            <p className="mb-1.5 text-xs font-bold text-muted">Chấm điểm</p>
            <StarRating
              value={rating}
              size="lg"
              onChange={(n) =>
                form.setValue("rating", n, { shouldValidate: true })
              }
            />
            {errors.rating ? (
              <p className="mt-1 text-xs font-medium text-red-700">
                {errors.rating.message}
              </p>
            ) : null}
          </div>

          <label className="block text-xs font-bold text-muted">
            Nhận xét (tuỳ chọn)
            <Textarea
              className="mt-1"
              rows={4}
              maxLength={2000}
              {...form.register("comment")}
              placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
            />
            <span className="mt-1 block text-right text-[11px] font-normal text-muted">
              {comment.length}/2000
            </span>
            {errors.comment ? (
              <span className="block font-medium text-red-700">
                {errors.comment.message}
              </span>
            ) : null}
          </label>

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
              {isEdit ? "Lưu thay đổi" : "Gửi đánh giá"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
