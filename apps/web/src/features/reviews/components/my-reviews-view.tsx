"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { getMyReviews } from "../api/review-client";
import type { Review, ReviewListResponse } from "../contracts";
import { ReviewFormModal } from "./review-form-modal";
import { StarRating } from "./star-rating";

const PAGE_LIMIT = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải đánh giá của bạn. Vui lòng thử lại.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function MyReviewsView() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<ReviewListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await getMyReviews(authorizedRequest, { page, limit: PAGE_LIMIT }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, page]);

  useEffect(() => {
    let active = true;
    void getMyReviews(authorizedRequest, { page, limit: PAGE_LIMIT }).then(
      (loaded) => {
        if (active) {
          setResult(loaded);
          setError(null);
          setLoading(false);
        }
      },
      (caught: unknown) => {
        if (active) {
          setError(errorMessage(caught));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest, page]);

  const handleSaved = async (message: string) => {
    setEditing(null);
    setSuccess(message);
    setError(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đánh giá của tôi"
        description="Xem và chỉnh sửa các đánh giá bạn đã gửi. Đánh giá bị ẩn bởi quản trị viên vẫn hiển thị ở đây."
      />

      {success ? (
        <p role="status" className="text-sm font-medium text-green-700">
          {success}
        </p>
      ) : null}

      {loading && !result ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Đang tải đánh giá…
        </p>
      ) : error && !result ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử lại
          </Button>
        </div>
      ) : !result || result.items.length === 0 ? (
        <EmptyState
          title="Bạn chưa có đánh giá nào"
          description="Sau khi đơn hàng hoàn tất, bạn có thể đánh giá sản phẩm từ trang chi tiết đơn hàng."
        />
      ) : (
        <>
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
          <ul className="space-y-3">
            {result.items.map((review) => (
              <li key={review.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground">
                          {review.product?.name ?? "Sản phẩm"}
                        </span>
                        <Badge
                          className={
                            review.status === "PUBLISHED"
                              ? "bg-sage-soft text-sage"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {review.status === "PUBLISHED"
                            ? "Đang hiển thị"
                            : "Đã bị ẩn"}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        <StarRating value={review.rating} readOnly size="sm" />
                      </div>
                      {review.comment ? (
                        <p className="mt-1.5 whitespace-pre-line text-sm text-foreground">
                          {review.comment}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-sm italic text-muted">
                          (Không có nội dung)
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        Cập nhật: {formatDate(review.updatedAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(review)}
                    >
                      Sửa
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>
              {result.total} đánh giá · Trang {result.page}/
              {Math.max(result.totalPages, 1)}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
              >
                Trang trước
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  page >= result.totalPages ||
                  loading ||
                  result.totalPages === 0
                }
                onClick={() => setPage((value) => value + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </>
      )}

      {editing ? (
        <ReviewFormModal
          mode="edit"
          review={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
