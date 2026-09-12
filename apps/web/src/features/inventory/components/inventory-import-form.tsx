"use client";

import { ArrowDownToLine, LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import {
  getInventory,
  importInventory,
  type InventoryItem,
} from "../api/inventory-client";

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể nhập kho. Vui lòng thử lại.";
}

export function InventoryImportForm({
  basePath = "/admin/inventory",
}: {
  basePath?: string;
}) {
  const router = useRouter();
  const { authorizedRequest } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getInventory(authorizedRequest, { limit: 100, sort: "sku:asc" }).then(
      (result) => {
        if (active) {
          setItems(result.items);
          setVariantId(
            (current) => current || result.items[0]?.variantId || "",
          );
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
  }, [authorizedRequest]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (
      !variantId ||
      !Number.isSafeInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError("Chọn Variant và nhập số lượng nguyên dương.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await importInventory(authorizedRequest, {
        variantId,
        quantity: parsedQuantity,
        note: note.trim() || undefined,
      });
      setQuantity("");
      setNote("");
      setSuccess("Đã nhập kho và ghi Inventory Transaction.");
      const result = await getInventory(authorizedRequest, {
        limit: 100,
        sort: "sku:asc",
      });
      setItems(result.items);
      window.setTimeout(() => router.push(basePath), 450);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải danh sách Variant…
      </p>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title="Chưa có Product Variant"
        description="Tạo Product và Variant trước khi nhập kho."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/products/create")}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Mở Catalog
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <CardContent>
        {error ? (
          <p role="alert" className="mb-4 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="mb-4 text-sm font-medium text-green-700">
            {success}
          </p>
        ) : null}
        <form onSubmit={submit} className="grid max-w-2xl gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            SKU / Variant
            <Select
              className="mt-2"
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              disabled={saving}
            >
              {items.map((item) => (
                <option key={item.variantId} value={item.variantId}>
                  {item.variant.sku} · {item.variant.product.name} ·{" "}
                  {item.variant.color.name}/{item.variant.size.code} (available{" "}
                  {item.available})
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold">
            Số lượng nhập
            <Input
              className="mt-2"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={saving}
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Ghi chú
            <Input
              className="mt-2"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Lô nhập tháng 9…"
              maxLength={500}
              disabled={saving}
            />
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ArrowDownToLine className="size-4" aria-hidden="true" />
              )}
              {saving ? "Đang lưu…" : "Xác nhận nhập kho"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(basePath)}
              disabled={saving}
            >
              Hủy
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
