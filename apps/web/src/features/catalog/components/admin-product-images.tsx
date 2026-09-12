"use client";

import { ImagePlus, LoaderCircle, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";

import {
  createAdminImage,
  deleteAdminImage,
  getAdminProduct,
  updateAdminImage,
  type AdminProductImage,
} from "../api/admin-catalog-client";

type ImageForm = {
  url: string;
  altText: string;
  sortOrder: string;
  isPrimary: boolean;
};

const emptyForm: ImageForm = { url: "", altText: "", sortOrder: "0", isPrimary: false };

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Không thể cập nhật hình ảnh. Vui lòng thử lại.";
}

function toForm(image: AdminProductImage): ImageForm {
  return { url: image.url, altText: image.altText ?? "", sortOrder: String(image.sortOrder), isPrimary: image.isPrimary };
}

export function AdminProductImages({ productId }: { productId: string }) {
  const { authorizedRequest } = useAuth();
  const [images, setImages] = useState<AdminProductImage[]>([]);
  const [form, setForm] = useState<ImageForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const product = await getAdminProduct(authorizedRequest, productId);
      setImages(product.images);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, productId]);

  useEffect(() => {
    let active = true;
    void getAdminProduct(authorizedRequest, productId).then(
      (product) => {
        if (active) {
          setImages(product.images);
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
  }, [authorizedRequest, productId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !form.url.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const input = { url: form.url.trim(), altText: form.altText.trim() || null, sortOrder: Number(form.sortOrder) || 0, isPrimary: form.isPrimary };
    try {
      if (editingId) {
        await updateAdminImage(authorizedRequest, editingId, input);
        setSuccess("Đã cập nhật hình ảnh.");
      } else {
        await createAdminImage(authorizedRequest, productId, input);
        setSuccess("Đã thêm hình ảnh.");
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (image: AdminProductImage) => {
    if (saving || !window.confirm(`Xóa hình ảnh ${image.url}?`)) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteAdminImage(authorizedRequest, image.id);
      setSuccess("Đã xóa hình ảnh.");
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const edit = (image: AdminProductImage) => {
    setEditingId(image.id);
    setForm(toForm(image));
    setError(null);
    setSuccess(null);
  };

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Hình ảnh</h2><p className="mt-1 text-sm text-muted">Một Product ACTIVE phải có đúng một ảnh primary.</p></div><Badge>{images.length} ảnh</Badge></div>
        {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p role="status" className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{success}</p> : null}
        <form onSubmit={submit} className="mt-5 grid gap-3 rounded-2xl bg-surface-soft p-4 md:grid-cols-[1.5fr_1fr_100px_auto_auto] md:items-end">
          <label className="text-xs font-bold text-muted">URL hình ảnh<Input className="mt-1" required value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} placeholder="/images/product.png hoặc https://…" /></label>
          <label className="text-xs font-bold text-muted">Alt text<Input className="mt-1" value={form.altText} onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))} /></label>
          <label className="text-xs font-bold text-muted">Thứ tự<Input className="mt-1" type="number" min={0} max={10_000} value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} /></label>
          <label className="flex items-center gap-2 pb-3 text-xs font-bold text-muted"><input type="checkbox" checked={form.isPrimary} onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))} /> Primary</label>
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : editingId ? <Save className="size-4" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}{editingId ? "Lưu" : "Thêm"}</Button>{editingId ? <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}><X className="size-4" aria-hidden="true" /> Hủy</Button> : null}</div>
        </form>
        {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Đang tải hình ảnh…</p> : images.length === 0 ? <div className="mt-5"><p className="text-sm text-muted">Chưa có hình ảnh. Thêm ảnh primary trước khi kích hoạt Product.</p></div> : <div className="mt-5 space-y-3">{images.map((image) => <div key={image.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{image.url}</p><p className="mt-1 text-xs text-muted">{image.altText || "Không có alt text"} · thứ tự {image.sortOrder}</p></div><div className="flex items-center gap-2"><Badge className={image.isPrimary ? "bg-brand-soft text-brand-strong" : "bg-surface-soft text-muted"}>{image.isPrimary ? "PRIMARY" : "Ảnh phụ"}</Badge><Button type="button" size="sm" variant="ghost" aria-label={`Sửa ${image.url}`} onClick={() => edit(image)} disabled={saving}><Pencil className="size-4" aria-hidden="true" /></Button><Button type="button" size="sm" variant="ghost" aria-label={`Xóa ${image.url}`} onClick={() => void remove(image)} disabled={saving}><Trash2 className="size-4 text-red-700" aria-hidden="true" /></Button></div></div>)}</div>}
        {!loading && images.length > 0 ? <Button type="button" className="mt-4" size="sm" variant="outline" onClick={() => void load()} disabled={saving}><RefreshCw className="size-4" aria-hidden="true" /> Làm mới</Button> : null}
      </CardContent>
    </Card>
  );
}
