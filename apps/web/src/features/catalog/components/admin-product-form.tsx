"use client";

import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";

import {
  createAdminProduct,
  getAdminCatalogMasters,
  getAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,
  type AdminCatalogBrand,
  type AdminCatalogCategory,
  type AdminProductDetail,
  type AdminProductGender,
  type AdminProductStatus,
} from "../api/admin-catalog-client";

type ProductFormState = {
  categoryId: string;
  brandId: string;
  name: string;
  slug: string;
  description: string;
  gender: AdminProductGender | "";
  ageGroup: string;
};

const emptyForm: ProductFormState = {
  categoryId: "",
  brandId: "",
  name: "",
  slug: "",
  description: "",
  gender: "",
  ageGroup: "",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Không thể tải dữ liệu sản phẩm. Vui lòng thử lại.";
}

function toForm(product: AdminProductDetail): ProductFormState {
  return {
    categoryId: product.categoryId,
    brandId: product.brandId ?? "",
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    gender: product.gender ?? "",
    ageGroup: product.ageGroup ?? "",
  };
}

function statusLabel(status: AdminProductStatus): string {
  return status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu hóa";
}

export function AdminProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { authorizedRequest } = useAuth();
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
  const [brands, setBrands] = useState<AdminCatalogBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getAdminCatalogMasters(authorizedRequest),
      productId ? getAdminProduct(authorizedRequest, productId) : Promise.resolve(null),
    ]).then(
      ([masters, loadedProduct]) => {
        if (!active) return;
        setCategories(masters.categories);
        setBrands(masters.brands);
        if (loadedProduct) {
          setProduct(loadedProduct);
          setForm(toForm(loadedProduct));
        }
        setError(null);
      },
      (caught: unknown) => {
        if (active) setError(errorMessage(caught));
      },
    ).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [authorizedRequest, productId]);

  const updateField = <K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim() || null,
      gender: form.gender || null,
      ageGroup: form.ageGroup.trim() || null,
    };
    try {
      const saved = productId
        ? await updateAdminProduct(authorizedRequest, productId, payload)
        : await createAdminProduct(authorizedRequest, payload);
      setProduct(saved);
      setForm(toForm(saved));
      setSuccess(productId ? "Đã lưu thông tin sản phẩm." : "Đã tạo sản phẩm ở trạng thái DISABLED.");
      if (!productId) router.replace(`/admin/products/${saved.id}/edit`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!product || statusPending) return;
    const next: AdminProductStatus = product.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    if (next === "DISABLED" && !window.confirm("Vô hiệu hóa sản phẩm này?")) return;
    setStatusPending(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminProductStatus(authorizedRequest, product.id, next);
      setProduct((current) => current ? { ...current, status: updated.status } : current);
      setSuccess(next === "ACTIVE" ? "Đã kích hoạt sản phẩm." : "Đã vô hiệu hóa sản phẩm.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setStatusPending(false);
    }
  };

  if (loading) {
    return <p role="status" className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Đang tải sản phẩm…</p>;
  }

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{success}</p> : null}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-lg font-bold">Thông tin cơ bản</h2><p className="mt-1 text-sm text-muted">Giá, SKU và tồn kho được quản lý ở các lát riêng.</p></div>
            {product ? <div className="flex items-center gap-2"><Badge className={product.status === "ACTIVE" ? "bg-sage-soft text-sage" : "bg-red-100 text-red-700"}>{product.status}</Badge><Button type="button" size="sm" variant="outline" onClick={() => void toggleStatus()} disabled={statusPending}>{statusPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{product.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}</Button></div> : <Badge>DISABLED</Badge>}
          </div>
          <form onSubmit={submit} className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">Tên sản phẩm<Input className="mt-2" required minLength={1} maxLength={255} value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
            <label className="text-sm font-semibold">Slug<Input className="mt-2" required minLength={1} maxLength={280} value={form.slug} onChange={(event) => updateField("slug", event.target.value.toLowerCase())} /></label>
            <label className="text-sm font-semibold">Danh mục<Select className="mt-2" required value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)}><option value="">Chọn danh mục</option>{categories.filter((category) => category.status === "ACTIVE" || category.id === form.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}{category.status === "DISABLED" ? " (đã tắt)" : ""}</option>)}</Select></label>
            <label className="text-sm font-semibold">Thương hiệu<Select className="mt-2" value={form.brandId} onChange={(event) => updateField("brandId", event.target.value)}><option value="">Không có thương hiệu</option>{brands.filter((brand) => brand.status === "ACTIVE" || brand.id === form.brandId).map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.status === "DISABLED" ? " (đã tắt)" : ""}</option>)}</Select></label>
            <label className="text-sm font-semibold">Giới tính<Select className="mt-2" value={form.gender} onChange={(event) => updateField("gender", event.target.value as ProductFormState["gender"]) }><option value="">Chưa chọn</option><option value="BOY">Bé trai</option><option value="GIRL">Bé gái</option><option value="UNISEX">Unisex</option></Select></label>
            <label className="text-sm font-semibold">Nhóm tuổi<Input className="mt-2" maxLength={50} value={form.ageGroup} onChange={(event) => updateField("ageGroup", event.target.value)} placeholder="Ví dụ: 2-5 tuổi" /></label>
            <label className="text-sm font-semibold md:col-span-2">Mô tả<Textarea className="mt-2" maxLength={10_000} value={form.description} onChange={(event) => updateField("description", event.target.value)} /></label>
            <div className="flex flex-wrap gap-3 md:col-span-2"><Button type="submit" disabled={saving || !form.categoryId}>{saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{saving ? "Đang lưu…" : "Lưu sản phẩm"}</Button>{product ? <ButtonLink href={`/admin/products/${product.id}/variants`} variant="outline">Quản lý Variant <ArrowRight className="size-4" /></ButtonLink> : null}</div>
          </form>
        </CardContent>
      </Card>
      {product ? <p className="text-xs text-muted">Trạng thái hiện tại: {statusLabel(product.status)} · ID: {product.id}</p> : null}
    </div>
  );
}
