"use client";

import { RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  getCatalogFilters,
  getProducts,
  type CatalogBrand,
  type CatalogCategory,
  type CatalogColor,
  type CatalogProductList,
  type CatalogSize,
} from "@/features/catalog/api/catalog-client";
import { ProductCard } from "@/features/catalog/components/product-card";
import type { Product } from "@/types/catalog";

type FilterState = {
  q: string;
  category: string;
  brand: string;
  size: string;
  color: string;
  sort: "newest" | "price_asc" | "price_desc" | "name_asc";
};

const initialFilters: FilterState = {
  q: "",
  category: "",
  brand: "",
  size: "",
  color: "",
  sort: "newest",
};

function toCardProduct(
  item: CatalogProductList["items"][number],
): Product {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category.name,
    price: item.minPrice,
    image: item.primaryImage?.url ?? "/images/kids-fashion-hero.png",
    imageAlt: item.primaryImage?.altText ?? item.name,
    colors: [],
    sizes: [],
    available: 0,
  };
}

function options<T extends { slug?: string; code?: string; name: string }>(
  values: T[],
  key: "slug" | "code",
) {
  return values.map((value) => ({
    value: value[key] ?? "",
    label: value.name,
  }));
}

export function ProductsCatalog({ initialCategory = "" }: { initialCategory?: string }) {
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...initialFilters,
    category: initialCategory,
  }));
  const [result, setResult] = useState<CatalogProductList | null>(null);
  const [metadata, setMetadata] = useState<{
    categories: CatalogCategory[];
    brands: CatalogBrand[];
    sizes: CatalogSize[];
    colors: CatalogColor[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({ ...filters, page: 1, limit: 20 }),
    [filters],
  );

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      setResult(await getProducts(query));
    } catch {
      setError("Không thể tải danh sách sản phẩm. Bạn thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void getCatalogFilters()
      .then(setMetadata)
      .catch(() => setError("Không thể tải bộ lọc Catalog. Bạn thử lại nhé."));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getProducts(query)
      .then((nextResult) => {
        if (!cancelled) {
          setResult(nextResult);
          setError(null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không thể tải danh sách sản phẩm. Bạn thử lại nhé.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setLoading(true);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Catalog · M2.2"
        title="Những món đồ bé sẽ muốn mặc mỗi ngày"
        description="Sản phẩm được lấy từ Catalog API; chỉ các Product có variant đủ điều kiện bán mới hiển thị."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-[1.5rem] border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-brand-strong" />
            <h2 className="font-bold">Bộ lọc</h2>
          </div>
          <div className="mt-5 space-y-5">
            <label className="block text-sm font-semibold">
              Từ khóa
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" />
                <Input
                  className="pl-9"
                  placeholder="Tên sản phẩm..."
                  value={filters.q}
                  onChange={(event) => updateFilter("q", event.target.value)}
                />
              </div>
            </label>
            <label className="block text-sm font-semibold">
              Danh mục
              <Select
                className="mt-2"
                value={filters.category}
                onChange={(event) => updateFilter("category", event.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {(metadata ? options(metadata.categories, "slug") : []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-semibold">
              Thương hiệu
              <Select
                className="mt-2"
                value={filters.brand}
                onChange={(event) => updateFilter("brand", event.target.value)}
              >
                <option value="">Tất cả thương hiệu</option>
                {(metadata ? options(metadata.brands, "slug") : []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-semibold">
              Kích thước
              <Select
                className="mt-2"
                value={filters.size}
                onChange={(event) => updateFilter("size", event.target.value)}
              >
                <option value="">Tất cả size</option>
                {(metadata ? options(metadata.sizes, "code") : []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-semibold">
              Màu sắc
              <Select
                className="mt-2"
                value={filters.color}
                onChange={(event) => updateFilter("color", event.target.value)}
              >
                <option value="">Tất cả màu</option>
                {(metadata ? options(metadata.colors, "code") : []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </label>
          </div>
        </aside>

        <section aria-label="Danh sách sản phẩm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-muted" aria-live="polite">
              <strong className="text-foreground">{result?.total ?? 0}</strong> sản phẩm
            </p>
            <Select
              className="max-w-48"
              value={filters.sort}
              onChange={(event) => updateFilter("sort", event.target.value as FilterState["sort"])}
              aria-label="Sắp xếp sản phẩm"
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="name_asc">Tên A–Z</option>
            </Select>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-square rounded-[1.75rem] bg-surface-soft" />
                  <div className="mt-4 h-4 w-2/3 rounded bg-surface-soft" />
                  <div className="mt-3 h-4 w-1/3 rounded bg-surface-soft" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[1.5rem] border border-border bg-surface p-8 text-center">
              <p className="text-muted">{error}</p>
              <Button className="mt-5" onClick={() => void loadProducts()}>
                <RefreshCw className="size-4" /> Thử lại
              </Button>
            </div>
          ) : result?.items.length ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={toCardProduct(product)} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-border p-10 text-center text-muted">
              Chưa có sản phẩm phù hợp với bộ lọc hiện tại.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
