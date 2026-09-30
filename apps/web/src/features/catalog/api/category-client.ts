type AuthorizedRequest = <T>(
  path: `/${string}`,
  options?: RequestInit,
) => Promise<T>;

export interface AdminCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: "ACTIVE" | "DISABLED";
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  status?: "ACTIVE" | "DISABLED";
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
}

export async function getAdminCategories(
  request: AuthorizedRequest,
  params?: { q?: string; status?: string },
): Promise<AdminCategory[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  const qs = search.toString();
  return request<AdminCategory[]>(
    `/api/v1/admin/catalog/categories${qs ? `?${qs}` : ""}`,
  );
}

export async function createCategory(
  request: AuthorizedRequest,
  input: CreateCategoryInput,
): Promise<AdminCategory> {
  return request<AdminCategory>("/api/v1/admin/catalog/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateCategory(
  request: AuthorizedRequest,
  id: string,
  input: UpdateCategoryInput,
): Promise<AdminCategory> {
  return request<AdminCategory>(`/api/v1/admin/catalog/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function setCategoryStatus(
  request: AuthorizedRequest,
  id: string,
  status: "ACTIVE" | "DISABLED",
): Promise<AdminCategory> {
  return request<AdminCategory>(
    `/api/v1/admin/catalog/categories/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
}
