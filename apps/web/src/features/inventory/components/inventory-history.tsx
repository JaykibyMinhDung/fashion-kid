"use client";

import { History, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import {
  getInventory,
  getInventoryHistory,
  type InventoryHistoryResponse,
  type InventoryItem,
  type InventoryTransactionType,
} from "../api/inventory-client";

const PAGE_LIMIT = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể tải lịch sử tồn kho. Vui lòng thử lại.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function quantityLabel(
  type: InventoryTransactionType,
  quantity: number,
): string {
  if (type === "ADJUSTMENT") {
    return quantity > 0 ? `+${quantity}` : String(quantity);
  }
  return type === "SALE" || type === "RESERVE" || type === "RELEASE"
    ? String(quantity)
    : `+${quantity}`;
}

export function InventoryHistory({
  initialVariantId = "",
}: {
  initialVariantId?: string;
}) {
  const { authorizedRequest } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [type, setType] = useState<InventoryTransactionType | "">("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<InventoryHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getInventory(authorizedRequest, { limit: 100, sort: "sku:asc" }),
      getInventoryHistory(authorizedRequest, {
        page,
        limit: PAGE_LIMIT,
        type: type || undefined,
        variantId: selectedVariantId || undefined,
      }),
    ]).then(
      ([inventory, history]) => {
        if (active) {
          setItems(inventory.items);
          setResult(history);
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
  }, [authorizedRequest, page, reloadKey, selectedVariantId, type]);

  const variantById = new Map(items.map((item) => [item.variantId, item]));

  if (loading && !result) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải lịch sử tồn kho…
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
          onClick={() => setReloadKey((value) => value + 1)}
        >
          <RefreshCw className="size-4" aria-hidden="true" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <label className="min-w-64 flex-1 text-xs font-bold text-muted">
            Variant
            <Select
              className="mt-1"
              value={selectedVariantId}
              onChange={(event) => {
                setLoading(true);
                setSelectedVariantId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả Variant</option>
              {items.map((item) => (
                <option key={item.variantId} value={item.variantId}>
                  {item.variant.sku} · {item.variant.product.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="w-52 text-xs font-bold text-muted">
            Loại giao dịch
            <Select
              className="mt-1"
              value={type}
              onChange={(event) => {
                setLoading(true);
                setType(event.target.value as InventoryTransactionType | "");
                setPage(1);
              }}
            >
              <option value="">Tất cả loại</option>
              <option value="IMPORT">IMPORT</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="RESERVE">RESERVE</option>
              <option value="RELEASE">RELEASE</option>
              <option value="SALE">SALE</option>
            </Select>
          </label>
        </div>
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
              title="Chưa có biến động"
              description="Các lần nhập, điều chỉnh, giữ chỗ, hoàn giữ chỗ và xuất bán sẽ xuất hiện tại đây."
              action={
                <History
                  className="mx-auto size-5 text-muted"
                  aria-hidden="true"
                />
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-4">Thời gian</th>
                  <th className="px-5 py-4">SKU / Variant</th>
                  <th className="px-5 py-4">Loại</th>
                  <th className="px-5 py-4 text-center">Quantity</th>
                  <th className="px-5 py-4 text-center">On hand</th>
                  <th className="px-5 py-4 text-center">Reserved</th>
                  <th className="px-5 py-4">Actor / Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((transaction) => {
                  const item = variantById.get(transaction.variantId);
                  return (
                    <tr key={transaction.id}>
                      <td className="px-5 py-4 text-xs text-muted">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-bold">
                          {item?.variant.sku ?? transaction.variantId}
                        </p>
                        {item ? (
                          <p className="mt-1 text-xs text-muted">
                            {item.variant.product.name}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <Badge className="bg-surface-soft text-foreground">
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-center font-semibold">
                        {quantityLabel(transaction.type, transaction.quantity)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {transaction.onHandBefore} → {transaction.onHandAfter}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {transaction.reservedBefore} →{" "}
                        {transaction.reservedAfter}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold">
                          {transaction.actor?.fullName ?? "System"}
                        </p>
                        {transaction.note ? (
                          <p className="mt-1 text-xs text-muted">
                            {transaction.note}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {result.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            Trang {result.page}/{result.totalPages} · {result.total} giao dịch
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
