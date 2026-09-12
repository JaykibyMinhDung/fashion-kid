"use client";

import { LoaderCircle, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/session/auth-provider";

import {
  getAdminCatalogMasters,
  getAdminProducts,
  updateAdminProductStatus,
  type AdminCatalogBrand,
  type AdminCatalogCategory,
  type AdminProductList,
  type AdminProductStatus,
} from "../api/admin-catalog-client";

const PAGE_LIMIT = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Không thể tải dữ liệu sản phẩm. Vui lòng thử lại.";
}

function statusLabel(status: AdminProductStatus): string {
  return status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu hóa";
}

function priceFromSummary(): string {
  return "—";
}

export function AdminProductsList() {
  const { authorizedRequest } = useAuth();
  const [result, setResult] = useState<AdminProductList | null>(null);
  const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
  const [brands, setBrands] = useState<AdminCatalogBrand[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [status, setStatus] = useState<AdminProductStatus | "">("");
  const [sort, setSort] = useState<
    "createdAt:desc" | "createdAt:asc" | "name:asc" | "name:desc" | "status:asc" | "status:desc"
  >("createdAt:desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await getAdminProducts(authorizedRequest, {
          page,
          limit: PAGE_LIMIT,
          q: search || undefined,
          categoryId: categoryId || undefined,
          brandId: brandId || undefined,
          status: status || undefined,
          sort,
        }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest, brandId, categoryId, page, search, sort, status]);

  useEffect(() => {
    let active = true;
    void getAdminProducts(authorizedRequest, {
      page,
      limit: PAGE_LIMIT,
      q: search || undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      status: status || undefined,
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
  }, [authorizedRequest, brandId, categoryId, page, search, sort, status]);

  useEffect(() => {
    let active = true;
    void getAdminCatalogMasters(authorizedRequest).then(
      (loaded) => {
        if (active) {
          setCategories(loaded.categories);
          setBrands(loaded.brands);
        }
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [authorizedRequest]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const changeStatus = async (id: string, current: AdminProductStatus) => {
    const nextStatus: AdminProductStatus = current === "ACTIVE" ? "DISABLED" : "ACTIVE";
    if (nextStatus === "DISABLED" && !window.confirm("Vô hiệu hóa sản phẩm này?")) return;
    if (pendingId) return;
    setPendingId(id);
    setError(null);
    setSuccess(null);
    try {
      await updateAdminProductStatus(authorizedRequest, id, nextStatus);
      setSuccess(nextStatus === "ACTIVE" ? "Đã kích hoạt sản phẩm." : "Đã vô hiệu hóa sản phẩm.");
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingId(null);
    }
  };

  if (loading && !result) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Đang tải danh sách sản phẩm…
      </p>
    );
  }

  if (!result) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="size-4" aria-hidden="true" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <label className="min-w-56 flex-1 text-xs font-bold text-muted">
            Tìm kiếm
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Tên hoặc slug sản phẩm" className="pl-9" />
            </span>
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Danh mục
            <Select className="mt-1" value={categoryId} onChange={(event) => { setPage(1); setCategoryId(event.target.value); }}>
              <option value="">Mọi danh mục</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Thương hiệu
            <Select className="mt-1" value={brandId} onChange={(event) => { setPage(1); setBrandId(event.target.value); }}>
              <option value="">Mọi thương hiệu</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </Select>
          </label>
          <label className="w-40 text-xs font-bold text-muted">
            Trạng thái
            <Select className="mt-1" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as AdminProductStatus | ""); }}>
              <option value="">Mọi trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="DISABLED">Đã vô hiệu hóa</option>
            </Select>
          </label>
          <label className="w-44 text-xs font-bold text-muted">
            Sắp xếp
            <Select className="mt-1" value={sort} onChange={(event) => { setPage(1); setSort(event.target.value as typeof sort); }}>
              <option value="createdAt:desc">Mới tạo trước</option>
              <option value="createdAt:asc">Cũ tạo trước</option>
              <option value="name:asc">Tên A–Z</option>
              <option value="name:desc">Tên Z–A</option>
              <option value="status:asc">Trạng thái</option>
            </Select>
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            <Search className="size-4" aria-hidden="true" /> Tìm
          </Button>
        </form>

        {error ? <p role="alert" className="px-5 pt-4 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p role="status" className="px-5 pt-4 text-sm font-medium text-green-700">{success}</p> : null}

        {result.items.length === 0 ? (
          <div className="p-4"><EmptyState title="Chưa có sản phẩm phù hợp" description="Thử thay đổi bộ lọc hoặc tạo một sản phẩm mới." action={<ButtonLink href="/admin/products/create" size="sm"><Plus className="size-4" /> Tạo sản phẩm</ButtonLink>} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-4">Sản phẩm</th><th className="px-5 py-4">Danh mục</th><th className="px-5 py-4">Variant</th><th className="px-5 py-4">Giá</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-border">
                {result.items.map((product) => {
                  const pending = pendingId === product.id;
                  return (
                    <tr key={product.id}>
                      <td className="px-5 py-4"><p className="font-bold">{product.name}</p><p className="text-xs text-muted">{product.slug}</p></td>
                      <td className="px-5 py-4 text-muted"><p>{product.categoryName}</p><p className="text-xs">{product.brandName ?? "Không có thương hiệu"}</p></td>
                      <td className="px-5 py-4"><span className="font-semibold">{product.activeVariantCount}/{product.variantCount}</span><p className="text-xs text-muted">{product.imageCount} ảnh</p></td>
                      <td className="px-5 py-4 text-muted">{priceFromSummary()}</td>
                      <td className="px-5 py-4"><Badge className={product.status === "ACTIVE" ? "bg-sage-soft text-sage" : "bg-red-100 text-red-700"}>{product.status}</Badge><p className="mt-1 text-xs text-muted">{statusLabel(product.status)}</p></td>
                      <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={Boolean(pendingId)} onClick={() => void changeStatus(product.id, product.status)}>{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{product.status === "ACTIVE" ? "Tắt" : "Kích hoạt"}</Button><Link href={`/admin/products/${product.id}/edit`} className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:text-brand-strong" aria-label={`Sửa ${product.name}`}><Pencil className="size-4" /></Link></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted"><span>{result.total} sản phẩm · Trang {result.page}/{Math.max(result.totalPages, 1)}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Trang trước</Button><Button type="button" size="sm" variant="outline" disabled={page >= result.totalPages || loading || result.totalPages === 0} onClick={() => setPage((value) => value + 1)}>Trang sau</Button></div></div>
    </div>
  );
}
