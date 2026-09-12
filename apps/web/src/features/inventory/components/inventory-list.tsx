"use client";

import {
  LoaderCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import {
  getInventory,
  type InventoryItem,
  type InventoryListResponse,
} from "../api/inventory-client";

const PAGE_LIMIT = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải tồn kho. Vui lòng thử lại.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function InventoryRow({
  item,
  basePath,
}: {
  item: InventoryItem;
  basePath: string;
}) {
  return (
    <tr>
      <td className="px-5 py-4 font-mono text-xs font-bold">
        {item.variant.sku}
      </td>
      <td className="px-5 py-4">
        <p className="font-bold">{item.variant.product.name}</p>
        <p className="mt-1 text-xs text-muted">
          {item.variant.color.name} · {item.variant.size.code}
        </p>
      </td>
      <td className="px-5 py-4 text-muted">{item.warehouse.name}</td>
      <td className="px-5 py-4 text-center">{item.onHand}</td>
      <td className="px-5 py-4 text-center">{item.reserved}</td>
      <td className="px-5 py-4 text-center">
        <Badge
          className={
            item.available <= 5
              ? "bg-[#f8e8cf] text-[#9a6734]"
              : "bg-sage-soft text-sage"
          }
        >
          {item.available}
        </Badge>
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="hidden text-xs text-muted xl:inline">
            {formatDate(item.updatedAt)}
          </span>
          <Link
            href={`${basePath}/${item.variantId}/adjust`}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:text-brand-strong"
            aria-label={`Điều chỉnh ${item.variant.sku}`}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

export function InventoryList({
  basePath = "/admin/inventory",
}: {
  basePath?: string;
}) {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<InventoryListResponse | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] =
    useState<NonNullable<Parameters<typeof getInventory>[1]>["sort"]>(
      "updatedAt:desc",
    );
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getInventory(authorizedRequest, {
      page,
      limit: PAGE_LIMIT,
      q: search || undefined,
      sort,
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
  }, [authorizedRequest, page, reloadKey, search, sort]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setSearch(searchDraft.trim());
  };

  if (loading && !result) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải tồn kho…
      </p>
    );
  }

  if (!result) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setLoading(true);
            setReloadKey((value) => value + 1);
          }}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                placeholder="SKU hoặc tên sản phẩm"
                className="pl-9"
              />
            </span>
          </label>
          <label className="w-52 text-xs font-bold text-muted">
            Sắp xếp
            <Select
              className="mt-1"
              value={sort}
              onChange={(event) => {
                setLoading(true);
                setPage(1);
                setSort(event.target.value as typeof sort);
              }}
            >
              <option value="updatedAt:desc">Cập nhật gần đây</option>
              <option value="updatedAt:asc">Cập nhật cũ trước</option>
              <option value="sku:asc">SKU A–Z</option>
              <option value="available:asc">Available thấp trước</option>
            </Select>
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            <Search className="size-4" aria-hidden="true" />
            Tìm
          </Button>
        </form>

        {error ? (
          <p
            role="alert"
            className="px-5 pt-4 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}

        {result.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Chưa có Product Variant"
              description="Tạo Variant trong Catalog hoặc đổi từ khóa để xem tồn kho. Variant chưa từng nhập kho vẫn hiển thị với onHand bằng 0."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-4">SKU</th>
                  <th className="px-5 py-4">Sản phẩm / Variant</th>
                  <th className="px-5 py-4">Kho</th>
                  <th className="px-5 py-4 text-center">On hand</th>
                  <th className="px-5 py-4 text-center">Reserved</th>
                  <th className="px-5 py-4 text-center">Available</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((item) => (
                  <InventoryRow
                    key={item.variantId}
                    item={item}
                    basePath={basePath}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {result.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            Trang {result.page}/{result.totalPages} · {result.total} variant
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage((value) => Math.max(1, value - 1));
              }}
            >
              Trước
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= result.totalPages || loading}
              onClick={() => {
                setLoading(true);
                setPage((value) => value + 1);
              }}
            >
              Sau
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
