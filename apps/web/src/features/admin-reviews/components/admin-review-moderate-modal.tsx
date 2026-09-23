"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { apiErrorMessage } from "@/lib/api/error-ux";
import { useAuth } from "@/features/auth/session/auth-provider";
import { moderateReview } from "../api/admin-review-client";
import type { AdminReview, ReviewStatus } from "../contracts";

export function AdminReviewModerateModal({
  review,
  onClose,
  onModerated,
}: {
  review: AdminReview;
  onClose(): void;
  onModerated(message: string): void;
}) {
  const { authorizedRequest } = useAuth();
  const nextStatus: ReviewStatus =
    review.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED";
  const isHiding = nextStatus === "HIDDEN";

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await moderateReview(authorizedRequest, review.id, {
        status: nextStatus,
        reason: reason.trim() ? reason.trim() : undefined,
      });
      onModerated(
        isHiding ? "Đã ẩn đánh giá." : "Đã hiển thị lại đánh giá.",
      );
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setError(apiErrorMessage(caught, "Không thể cập nhật đánh giá."));
      } else {
        setError("Không thể cập nhật đánh giá. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={isHiding ? "Ẩn đánh giá" : "Hiển thị đánh giá"}
    >
      <div className="w-full max-w-lg rounded-3xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">
            {isHiding ? "Ẩn đánh giá" : "Hiển thị lại đánh giá"}
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

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl bg-surface-soft p-4 text-sm">
            <p className="font-semibold text-foreground">
              {review.product?.name ?? "Sản phẩm"} · {review.rating}/5 ★
            </p>
            {review.user ? (
              <p className="text-xs text-muted">
                {review.user.fullName} ({review.user.email})
              </p>
            ) : null}
            {review.comment ? (
              <p className="mt-2 whitespace-pre-line text-foreground">
                {review.comment}
              </p>
            ) : (
              <p className="mt-2 italic text-muted">Không có nội dung.</p>
            )}
          </div>

          <label className="block text-xs font-bold text-muted">
            Lý do {isHiding ? "ẩn" : "hiển thị lại"} (tuỳ chọn — ghi vào nhật ký
            kiểm toán)
            <Textarea
              className="mt-1"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                isHiding
                  ? "VD: Nội dung vi phạm tiêu chuẩn cộng đồng"
                  : "VD: Đã xác minh nội dung hợp lệ"
              }
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button
              type="button"
              variant={isHiding ? "primary" : "secondary"}
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isHiding ? "Ẩn đánh giá" : "Hiển thị lại"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
