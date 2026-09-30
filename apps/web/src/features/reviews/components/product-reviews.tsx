"use client";

import { LoaderCircle, MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { getPublicReviews } from "../api/review-client";
import type {
  PublicReviewListResponse,
  PublicReviewSort,
} from "../contracts";
import { StarRating } from "./star-rating";

const PAGE_LIMIT = 10;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const [result, setResult] = useState<PublicReviewListResponse | null>(null);
  const [sort, setSort] = useState<PublicReviewSort>("newest");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPublicReviews(productId, {
      page,
      limit: PAGE_LIMIT,
      sort,
      rating: rating ? Number(rating) : undefined,
    }).then(
      (loaded) => {
        if (active) {
          setResult(loaded);
          setError(null);
          setLoading(false);
        }
      },
      (caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiClientError
              ? caught.message
              : "Không thể tải đánh giá sản phẩm.",
          );
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [productId, page, sort, rating]);

  return (
    <section className="space-y-5" aria-label="Đánh giá sản phẩm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground">Đánh giá từ khách hàng</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Lọc theo số sao"
            className="h-9 w-36"
            value={rating}
            onChange={(event) => {
              setLoading(true);
              setPage(1);
              setRating(event.target.value);
            }}
          >
            <option value="">Mọi số sao</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} sao
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sắp xếp"
            className="h-9 w-40"
            value={sort}
            onChange={(event) => {
              setLoading(true);
              setPage(1);
              setSort(event.target.value as PublicReviewSort);
            }}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="rating_high">Điểm cao nhất</option>
            <option value="rating_low">Điểm thấp nhất</option>
          </Select>
        </div>
      </div>

      {result ? (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-soft/50 p-4">
          <div className="text-center">
            <p className="text-3xl font-black text-foreground">
              {result.averageRating != null
                ? result.averageRating.toFixed(1)
                : "—"}
            </p>
            <StarRating
              value={Math.round(result.averageRating ?? 0)}
              readOnly
              size="sm"
            />
          </div>
          <div className="text-sm text-muted">
            Dựa trên <strong className="text-foreground">{result.reviewCount}</strong>{" "}
            đánh giá đã duyệt
          </div>
        </div>
      ) : null}

      {loading && !result ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Đang tải đánh giá…
        </p>
      ) : error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : !result || result.items.length === 0 ? (
        <EmptyState
          title="Chưa có đánh giá"
          description="Hãy là người đầu tiên đánh giá sản phẩm này sau khi mua và nhận hàng."
        />
      ) : (
        <ul className="space-y-3">
          {result.items.map((review) => (
            <li key={review.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StarRating value={review.rating} readOnly size="sm" />
                      <span className="text-sm font-bold text-foreground">
                        {review.reviewerName}
                      </span>
                      {review.verifiedPurchase ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <MessageSquareText className="size-3" />
                          Đã mua hàng
                        </span>
                      ) : null}
                    </div>
                    {review.comment ? (
                      <p className="mt-1.5 whitespace-pre-line text-sm text-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {result && result.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            Trang {result.page}/{result.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage((v) => v - 1);
              }}
              className="rounded-full border border-border px-4 py-1.5 font-semibold text-foreground transition hover:border-brand disabled:opacity-50"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= result.totalPages || loading}
              onClick={() => {
                setLoading(true);
                setPage((v) => v + 1);
              }}
              className="rounded-full border border-border px-4 py-1.5 font-semibold text-foreground transition hover:border-brand disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
