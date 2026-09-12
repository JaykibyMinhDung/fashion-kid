import { apiRequest } from "@/lib/api/api-client";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export type CatalogBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export type CatalogSize = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
};

export type CatalogColor = {
  id: string;
  code: string;
  name: string;
  hexCode: string | null;
};

export type CatalogImage = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type CatalogVariant = {
  id: string;
  sku: string;
  price: string;
  status: "ACTIVE" | "DISABLED";
  size: CatalogSize;
  color: CatalogColor;
};

export type CatalogProductCard = {
  id: string;
  slug: string;
  name: string;
  gender: "BOY" | "GIRL" | "UNISEX" | null;
  ageGroup: string | null;
  category: CatalogCategory;
  brand: CatalogBrand | null;
  primaryImage: CatalogImage | null;
  minPrice: string;
  maxPrice: string;
};

export type CatalogProductDetail = CatalogProductCard & {
  description: string | null;
  images: CatalogImage[];
  variants: CatalogVariant[];
};

export type CatalogProductList = {
  items: CatalogProductCard[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductListQuery = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  brand?: string;
  gender?: CatalogProductCard["gender"];
  ageGroup?: string;
  size?: string;
  color?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc";
};

function queryString(query: ProductListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== null) {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function getProducts(query: ProductListQuery = {}) {
  return apiRequest<CatalogProductList>(`/api/v1/products${queryString(query)}`);
}

export function getProductBySlug(slug: string) {
  return apiRequest<CatalogProductDetail>(
    `/api/v1/products/${encodeURIComponent(slug)}`,
  );
}

export function getCatalogFilters() {
  return Promise.all([
    apiRequest<CatalogCategory[]>("/api/v1/categories"),
    apiRequest<CatalogBrand[]>("/api/v1/brands"),
    apiRequest<CatalogSize[]>("/api/v1/sizes"),
    apiRequest<CatalogColor[]>("/api/v1/colors"),
  ]).then(([categories, brands, sizes, colors]) => ({
    categories,
    brands,
    sizes,
    colors,
  }));
}
