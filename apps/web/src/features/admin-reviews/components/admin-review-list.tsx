"use client";

import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { getAdminReviews } from "../api/admin-review-client";
import type {
  AdminReview,
  AdminReviewListResponse,
  ReviewStatus,
} from "../contracts";
import { AdminReviewModerateModal } from "./admin-review-moderate-modal";

const PAGE_LIMIT = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải danh sách đánh giá. Vui lòng thử lại.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

export function AdminReviewList() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<AdminReviewListResponse | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [moderating, setModerating] = useState<AdminReview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await getAdminReviews(authorizedRequest, {
          page,
          limit: PAGE_LIMIT,
          q: search || undefined,
          status: status || undefined,
          rating: rating ? Number(rating) : undefined,
        }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, page, search, status, rating]);

  useEffect(() => {
    let active = true;
    void getAdminReviews(authorizedRequest, {
      page,
      limit: PAGE_LIMIT,
      q: search || undefined,
      status: status || undefined,
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
          setError(errorMessage(caught));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest, page, search, status, rating]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const handleModerated = async (message: string) => {
    setModerating(null);
    setSuccess(message);
    setError(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm duyệt đánh giá"
        description="Ẩn hoặc hiển thị lại đánh giá của khách hàng. Mọi thao tác được ghi vào nhật ký kiểm toán."
      />

      <Card className="overflow-hidden">
        <form
          onSubmit={submitSearch}
          className="flex flex-wrap items-end gap-3 border-b border-border p-4"
        >
          <label className="min-w-56 flex-1 text-xs font-bold text-muted">
            Tìm kiếm
            <span className="relative mt-1 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Nội dung, sản phẩm hoặc khách hàng"
                className="pl-9"
              />
            </span>
          </label>
          <label className="w-40 text-xs font-bold text-muted">
            Trạng thái
            <Select
              className="mt-1"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as ReviewStatus | "");
              }}
            >
              <option value="">Mọi trạng thái</option>
              <option value="PUBLISHED">Đang hiển thị</option>
              <option value="HIDDEN">Đã ẩn</option>
            </Select>
          </label>
          <label className="w-32 text-xs font-bold text-muted">
            Số sao
            <Select
              className="mt-1"
              value={rating}
              onChange={(event) => {
                setPage(1);
                setRating(event.target.value);
              }}
            >
              <option value="">Mọi mức</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} sao
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            <Search className="size-4" aria-hidden="true" />
            Tìm
          </Button>
        </form>

        {error ? (
          <p role="alert" className="px-5 pt-4 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="px-5 pt-4 text-sm font-medium text-green-700">
            {success}
          </p>
        ) : null}

        {loading && !result ? (
          <p
            role="status"
            className="flex items-center gap-2 p-5 text-sm text-muted"
          >
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Đang tải đánh giá…
          </p>
        ) : !result ? (
          <div className="p-5">
            <Button type="button" variant="outline" onClick={() => void load()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Thử lại
            </Button>
          </div>
        ) : result.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Không có đánh giá phù hợp"
              description="Thử thay đổi từ khoá hoặc bộ lọc trạng thái/số sao."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-4">Sản phẩm</th>
                  <th className="px-5 py-4">Khách hàng</th>
                  <th className="px-5 py-4">Đánh giá</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((review) => (
                  <tr key={review.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {review.product?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(review.createdAt)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {review.user ? (
                        <>
                          <p className="font-medium">{review.user.fullName}</p>
                          <p className="text-xs text-muted">
                            {review.user.email}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs italic text-muted">—</span>
                      )}
                    </td>
                    <td className="max-w-sm px-5 py-4">
                      <p
                        className="text-amber-500"
                        aria-label={`${review.rating}/5 sao`}
                      >
                        {stars(review.rating)}
                      </p>
                      {review.comment ? (
                        <p className="mt-1 line-clamp-3 text-xs text-muted">
                          {review.comment}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        className={
                          review.status === "PUBLISHED"
                            ? "bg-sage-soft text-sage"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {review.status === "PUBLISHED" ? "Đang hiển thị" : "Đã ẩn"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setModerating(review)}
                      >
                        {review.status === "PUBLISHED" ? "Ẩn" : "Hiển thị lại"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {result ? (
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
                page >= result.totalPages || loading || result.totalPages === 0
              }
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      ) : null}

      {moderating ? (
        <AdminReviewModerateModal
          review={moderating}
          onClose={() => setModerating(null)}
          onModerated={handleModerated}
        />
      ) : null}
    </div>
  );
}
