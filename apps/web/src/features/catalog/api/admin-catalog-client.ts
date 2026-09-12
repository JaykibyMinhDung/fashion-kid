import type { AuthContextValue } from "@/features/auth/session/auth-provider";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export type AdminEntityStatus = "ACTIVE" | "DISABLED";
export type AdminProductStatus = AdminEntityStatus;
export type AdminVariantStatus = AdminEntityStatus;
export type AdminProductGender = "BOY" | "GIRL" | "UNISEX";

export type AdminCatalogCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: AdminEntityStatus;
};

export type AdminCatalogBrand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: AdminEntityStatus;
};

export type AdminCatalogSize = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  status: AdminEntityStatus;
};

export type AdminCatalogColor = {
  id: string;
  code: string;
  name: string;
  hexCode: string | null;
  status: AdminEntityStatus;
};

export type AdminProductSummary = {
  id: string;
  categoryId: string;
  categoryName: string;
  brandId: string | null;
  brandName: string | null;
  name: string;
  slug: string;
  description: string | null;
  gender: AdminProductGender | null;
  ageGroup: string | null;
  status: AdminProductStatus;
  imageCount: number;
  variantCount: number;
  activeVariantCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductImage = {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type AdminProductVariant = {
  id: string;
  productId: string;
  sizeId: string;
  colorId: string;
  sku: string;
  price: string;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  status: AdminVariantStatus;
  size: Pick<AdminCatalogSize, "id" | "code" | "name" | "sortOrder">;
  color: Pick<AdminCatalogColor, "id" | "code" | "name" | "hexCode">;
};

export type AdminProductDetail = AdminProductSummary & {
  images: AdminProductImage[];
  variants: AdminProductVariant[];
};

export type AdminProductList = {
  items: AdminProductSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminProductListQuery = {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  brandId?: string;
  status?: AdminProductStatus;
  sort?:
    | "createdAt:desc"
    | "createdAt:asc"
    | "name:asc"
    | "name:desc"
    | "status:asc"
    | "status:desc";
};

export type AdminProductInput = {
  categoryId: string;
  brandId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  gender?: AdminProductGender | null;
  ageGroup?: string | null;
};

export type AdminVariantInput = {
  sizeId: string;
  colorId: string;
  sku: string;
  price: string;
  weightGrams?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
};

export type AdminVariantUpdateInput = Partial<Omit<AdminVariantInput, "sku">> & {
  sku?: never;
};

export type AdminImageInput = {
  url: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

function queryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function getAdminProducts(
  request: AuthorizedRequest,
  query: AdminProductListQuery = {},
) {
  return request<AdminProductList>(
    `/api/v1/admin/catalog/products${queryString(query)}`,
  );
}

export function getAdminProduct(request: AuthorizedRequest, id: string) {
  return request<AdminProductDetail>(`/api/v1/admin/catalog/products/${id}`);
}

export function createAdminProduct(
  request: AuthorizedRequest,
  input: AdminProductInput,
) {
  return request<AdminProductDetail>("/api/v1/admin/catalog/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminProduct(
  request: AuthorizedRequest,
  id: string,
  input: Partial<AdminProductInput>,
) {
  return request<AdminProductDetail>(`/api/v1/admin/catalog/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateAdminProductStatus(
  request: AuthorizedRequest,
  id: string,
  status: AdminProductStatus,
) {
  return request<{ id: string; status: AdminProductStatus }>(
    `/api/v1/admin/catalog/products/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export function getAdminCatalogMasters(request: AuthorizedRequest) {
  return Promise.all([
    request<AdminCatalogCategory[]>("/api/v1/admin/catalog/categories"),
    request<AdminCatalogBrand[]>("/api/v1/admin/catalog/brands"),
    request<AdminCatalogSize[]>("/api/v1/admin/catalog/sizes"),
    request<AdminCatalogColor[]>("/api/v1/admin/catalog/colors"),
  ]).then(([categories, brands, sizes, colors]) => ({
    categories,
    brands,
    sizes,
    colors,
  }));
}

export function createAdminVariant(
  request: AuthorizedRequest,
  productId: string,
  input: AdminVariantInput,
) {
  return request<AdminProductVariant>(
    `/api/v1/admin/catalog/products/${productId}/variants`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updateAdminVariant(
  request: AuthorizedRequest,
  id: string,
  input: AdminVariantUpdateInput,
) {
  return request<AdminProductVariant>(`/api/v1/admin/catalog/variants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateAdminVariantStatus(
  request: AuthorizedRequest,
  id: string,
  status: AdminVariantStatus,
) {
  return request<AdminProductVariant>(
    `/api/v1/admin/catalog/variants/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export function createAdminImage(
  request: AuthorizedRequest,
  productId: string,
  input: AdminImageInput,
) {
  return request<AdminProductImage>(
    `/api/v1/admin/catalog/products/${productId}/images`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updateAdminImage(
  request: AuthorizedRequest,
  id: string,
  input: Partial<AdminImageInput>,
) {
  return request<AdminProductImage>(`/api/v1/admin/catalog/images/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminImage(request: AuthorizedRequest, id: string) {
  return request<{ id: string; deleted: boolean }>(
    `/api/v1/admin/catalog/images/${id}`,
    { method: "DELETE" },
  );
}
