"use client";

import { ArrowLeft, Check, LoaderCircle, Pencil, Plus, Save, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";
import { formatCurrency } from "@/lib/utils";

import {
  createAdminVariant,
  getAdminCatalogMasters,
  getAdminProduct,
  updateAdminProductStatus,
  updateAdminVariant,
  updateAdminVariantStatus,
  type AdminCatalogColor,
  type AdminCatalogSize,
  type AdminProductDetail,
  type AdminProductStatus,
  type AdminProductVariant,
} from "../api/admin-catalog-client";

type VariantForm = {
  sizeId: string;
  colorId: string;
  sku: string;
  price: string;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};

const emptyForm: VariantForm = { sizeId: "", colorId: "", sku: "", price: "", weightGrams: "", lengthCm: "", widthCm: "", heightCm: "" };

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Không thể cập nhật Variant. Vui lòng thử lại.";
}

function toForm(variant: AdminProductVariant): VariantForm {
  return {
    sizeId: variant.sizeId,
    colorId: variant.colorId,
    sku: variant.sku,
    price: variant.price,
    weightGrams: variant.weightGrams === null ? "" : String(variant.weightGrams),
    lengthCm: variant.lengthCm === null ? "" : String(variant.lengthCm),
    widthCm: variant.widthCm === null ? "" : String(variant.widthCm),
    heightCm: variant.heightCm === null ? "" : String(variant.heightCm),
  };
}

function numberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export function AdminProductVariants({ productId }: { productId: string }) {
  const { authorizedRequest } = useAuth();
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [sizes, setSizes] = useState<AdminCatalogSize[]>([]);
  const [colors, setColors] = useState<AdminCatalogColor[]>([]);
  const [form, setForm] = useState<VariantForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusPending, setStatusPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedProduct, masters] = await Promise.all([
        getAdminProduct(authorizedRequest, productId),
        getAdminCatalogMasters(authorizedRequest),
      ]);
      setProduct(loadedProduct);
      setSizes(masters.sizes);
      setColors(masters.colors);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, productId]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getAdminProduct(authorizedRequest, productId),
      getAdminCatalogMasters(authorizedRequest),
    ]).then(
      ([loadedProduct, masters]) => {
        if (active) {
          setProduct(loadedProduct);
          setSizes(masters.sizes);
          setColors(masters.colors);
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

  const setField = <K extends keyof VariantForm>(field: K, value: VariantForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const edit = (variant: AdminProductVariant) => {
    setEditingId(variant.id);
    setForm(toForm(variant));
    setError(null);
    setSuccess(null);
  };

  const reset = () => { setEditingId(null); setForm(emptyForm); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const dimensions = {
      weightGrams: numberOrNull(form.weightGrams),
      lengthCm: numberOrNull(form.lengthCm),
      widthCm: numberOrNull(form.widthCm),
      heightCm: numberOrNull(form.heightCm),
    };
    try {
      if (editingId) {
        await updateAdminVariant(authorizedRequest, editingId, { sizeId: form.sizeId, colorId: form.colorId, price: form.price.trim(), ...dimensions });
        setSuccess("Đã cập nhật Variant. SKU không thay đổi.");
      } else {
        await createAdminVariant(authorizedRequest, productId, { sizeId: form.sizeId, colorId: form.colorId, sku: form.sku.trim().toUpperCase(), price: form.price.trim(), ...dimensions });
        setSuccess("Đã tạo Variant ở trạng thái DISABLED.");
      }
      reset();
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const toggleVariant = async (variant: AdminProductVariant) => {
    if (statusPending) return;
    const next: AdminProductStatus = variant.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setStatusPending(variant.id);
    setError(null);
    setSuccess(null);
    try {
      await updateAdminVariantStatus(authorizedRequest, variant.id, next);
      setSuccess(next === "ACTIVE" ? `Đã kích hoạt ${variant.sku}.` : `Đã vô hiệu hóa ${variant.sku}.`);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setStatusPending(null);
    }
  };

  const toggleProduct = async () => {
    if (!product || statusPending) return;
    const next: AdminProductStatus = product.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setStatusPending("product");
    setError(null);
    setSuccess(null);
    try {
      await updateAdminProductStatus(authorizedRequest, product.id, next);
      setProduct((current) => current ? { ...current, status: next } : current);
      setSuccess(next === "ACTIVE" ? "Đã kích hoạt sản phẩm." : "Đã vô hiệu hóa sản phẩm.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setStatusPending(null);
    }
  };

  if (loading) return <p role="status" className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Đang tải Variant…</p>;
  if (!product) return <div className="space-y-4"><p role="alert" className="text-sm font-medium text-red-700">{error}</p><Button type="button" variant="outline" onClick={() => void load()}>Thử lại</Button></div>;

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{success}</p> : null}
      <Card><CardContent><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Product Variant</p><h2 className="mt-1 text-xl font-black">{product.name}</h2><p className="mt-1 text-sm text-muted">{product.activeVariantCount}/{product.variantCount} variant ACTIVE · {product.imageCount} ảnh</p></div><div className="flex gap-2"><Badge className={product.status === "ACTIVE" ? "bg-sage-soft text-sage" : "bg-red-100 text-red-700"}>{product.status}</Badge><Button type="button" size="sm" variant="outline" disabled={Boolean(statusPending)} onClick={() => void toggleProduct()}>{statusPending === "product" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{product.status === "ACTIVE" ? "Vô hiệu hóa Product" : "Kích hoạt Product"}</Button></div></div></CardContent></Card>

      <Card><CardContent><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{editingId ? "Sửa Variant" : "Thêm Variant"}</h2><p className="mt-1 text-sm text-muted">SKU chỉ nhập khi tạo và sẽ được chuẩn hóa uppercase; không thể sửa sau đó.</p></div>{editingId ? <Button type="button" size="sm" variant="ghost" onClick={reset}><X className="size-4" aria-hidden="true" /> Hủy sửa</Button> : null}</div><form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold">Size<Select className="mt-2" required value={form.sizeId} onChange={(event) => setField("sizeId", event.target.value)}><option value="">Chọn size</option>{sizes.filter((size) => size.status === "ACTIVE" || size.id === form.sizeId).map((size) => <option key={size.id} value={size.id}>{size.code} · {size.name}{size.status === "DISABLED" ? " (đã tắt)" : ""}</option>)}</Select></label>
        <label className="text-sm font-semibold">Màu<Select className="mt-2" required value={form.colorId} onChange={(event) => setField("colorId", event.target.value)}><option value="">Chọn màu</option>{colors.filter((color) => color.status === "ACTIVE" || color.id === form.colorId).map((color) => <option key={color.id} value={color.id}>{color.code} · {color.name}{color.status === "DISABLED" ? " (đã tắt)" : ""}</option>)}</Select></label>
        <label className="text-sm font-semibold">SKU{editingId ? <span className="mt-2 block h-11 rounded-xl border border-dashed border-border bg-surface-soft px-4 py-3 font-mono text-sm text-muted">{form.sku}</span> : <Input className="mt-2 font-mono uppercase" required maxLength={100} value={form.sku} onChange={(event) => setField("sku", event.target.value.toUpperCase())} />}</label>
        <label className="text-sm font-semibold">Giá (decimal string)<Input className="mt-2 font-mono" required inputMode="numeric" pattern="(0|[1-9][0-9]*)" value={form.price} onChange={(event) => setField("price", event.target.value)} placeholder="129000" /></label>
        <label className="text-sm font-semibold">Khối lượng (g)<Input className="mt-2" type="number" min={1} max={10_000_000} value={form.weightGrams} onChange={(event) => setField("weightGrams", event.target.value)} /></label>
        <label className="text-sm font-semibold">Dài (cm)<Input className="mt-2" type="number" min={1} max={10_000} value={form.lengthCm} onChange={(event) => setField("lengthCm", event.target.value)} /></label>
        <label className="text-sm font-semibold">Rộng (cm)<Input className="mt-2" type="number" min={1} max={10_000} value={form.widthCm} onChange={(event) => setField("widthCm", event.target.value)} /></label>
        <label className="text-sm font-semibold">Cao (cm)<Input className="mt-2" type="number" min={1} max={10_000} value={form.heightCm} onChange={(event) => setField("heightCm", event.target.value)} /></label>
        <div className="flex gap-2 lg:col-span-4"><Button type="submit" disabled={saving || !form.sizeId || !form.colorId}>{saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : editingId ? <Save className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}{saving ? "Đang lưu…" : editingId ? "Lưu Variant" : "Thêm Variant"}</Button></div>
      </form></CardContent></Card>

      <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-4">SKU</th><th className="px-5 py-4">Size / Màu</th><th className="px-5 py-4">Giá</th><th className="px-5 py-4">Kích thước</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-border">{product.variants.map((variant) => <tr key={variant.id}><td className="px-5 py-4 font-mono font-semibold">{variant.sku}</td><td className="px-5 py-4"><p>{variant.size.code} · {variant.color.name}</p><p className="text-xs text-muted">{variant.color.code}</p></td><td className="px-5 py-4 font-semibold">{formatCurrency(variant.price)}</td><td className="px-5 py-4 text-xs text-muted">{variant.weightGrams ?? "—"}g · {variant.lengthCm ?? "—"}×{variant.widthCm ?? "—"}×{variant.heightCm ?? "—"}cm</td><td className="px-5 py-4"><Badge className={variant.status === "ACTIVE" ? "bg-sage-soft text-sage" : "bg-red-100 text-red-700"}>{variant.status}</Badge></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={Boolean(statusPending)} onClick={() => void toggleVariant(variant)}>{statusPending === variant.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : variant.status === "ACTIVE" ? <Check className="size-4" aria-hidden="true" /> : null}{variant.status === "ACTIVE" ? "Tắt" : "Kích hoạt"}</Button><Button type="button" size="sm" variant="ghost" aria-label={`Sửa ${variant.sku}`} onClick={() => edit(variant)} disabled={Boolean(statusPending)}><Pencil className="size-4" aria-hidden="true" /></Button></div></td></tr>)}</tbody></table></div></Card>
      <div className="flex flex-wrap gap-3"><ButtonLink href="/admin/products" variant="outline"><ArrowLeft className="size-4" aria-hidden="true" /> Danh sách sản phẩm</ButtonLink><ButtonLink href={`/admin/products/${product.id}/edit`} variant="outline">Thông tin & hình ảnh</ButtonLink></div>
    </div>
  );
}
