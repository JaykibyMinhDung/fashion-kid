"use client";

import { LoaderCircle, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import {
  adjustInventory,
  getInventoryDetail,
  type InventoryItem,
} from "../api/inventory-client";

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Không thể điều chỉnh tồn kho. Vui lòng thử lại.";
}

export function InventoryAdjustmentForm({
  variantId,
  basePath = "/admin/inventory",
}: {
  variantId: string;
  basePath?: string;
}) {
  const router = useRouter();
  const { authorizedRequest } = useAuth();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [targetOnHand, setTargetOnHand] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void getInventoryDetail(authorizedRequest, variantId).then(
      (loaded) => {
        if (active) {
          setItem(loaded);
          setTargetOnHand(String(loaded.onHand));
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
  }, [authorizedRequest, reloadKey, variantId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedTarget = Number(targetOnHand);
    if (
      !Number.isSafeInteger(parsedTarget) ||
      parsedTarget < 0 ||
      !reason.trim()
    ) {
      setError("On hand đích phải là số nguyên không âm và cần có lý do.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await adjustInventory(authorizedRequest, variantId, {
        targetOnHand: parsedTarget,
        reason: reason.trim(),
        note: note.trim() || undefined,
      });
      setItem(result.inventory);
      setTargetOnHand(String(result.inventory.onHand));
      setReason("");
      setNote("");
      setSuccess(
        `Đã điều chỉnh tồn kho (${result.transaction.quantity > 0 ? "+" : ""}${result.transaction.quantity}).`,
      );
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
        Đang tải tồn kho…
      </p>
    );
  }

  if (!item) {
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
    <Card>
      <CardContent>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-bold">{item.variant.sku}</p>
            <p className="mt-1 text-sm text-muted">
              {item.variant.product.name} · {item.variant.color.name}/
              {item.variant.size.code}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`${basePath}/${variantId}/history`)}
          >
            Xem lịch sử
          </Button>
        </div>
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
        <div className="mb-6 grid gap-3 rounded-2xl bg-surface-soft p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">On hand</p>
            <p className="mt-1 text-2xl font-black">{item.onHand}</p>
          </div>
          <div>
            <p className="text-xs text-muted">
              Reserved <span className="font-normal">(chỉ đọc)</span>
            </p>
            <p className="mt-1 text-2xl font-black">{item.reserved}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Available</p>
            <p className="mt-1 text-2xl font-black text-sage">
              {item.available}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="grid max-w-2xl gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            On hand đích
            <Input
              className="mt-2"
              type="number"
              min={0}
              step={1}
              value={targetOnHand}
              onChange={(event) => setTargetOnHand(event.target.value)}
              disabled={saving}
              required
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              Backend sẽ tính delta và tạo ADJUSTMENT ledger.
            </span>
          </label>
          <label className="text-sm font-semibold">
            Lý do
            <Input
              className="mt-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Kiểm kê thực tế"
              maxLength={100}
              disabled={saving}
              required
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Ghi chú
            <Textarea
              className="mt-2"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Mô tả nguyên nhân…"
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
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              )}
              {saving ? "Đang lưu…" : "Xác nhận điều chỉnh"}
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
