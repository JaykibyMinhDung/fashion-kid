import type { AuthContextValue } from "@/features/auth/session/auth-provider";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export type InventoryTransactionType =
  "IMPORT" | "ADJUSTMENT" | "RESERVE" | "RELEASE" | "SALE";

export type InventoryItem = {
  inventoryId: string | null;
  variantId: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
    address: string | null;
    status: "ACTIVE" | "DISABLED";
  };
  variant: {
    id: string;
    sku: string;
    product: { id: string; name: string; slug: string };
    size: { id: string; code: string; name: string };
    color: { id: string; code: string; name: string; hexCode: string | null };
  };
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string;
};

export type InventoryListResponse = {
  items: InventoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryTransaction = {
  id: string;
  inventoryId: string;
  variantId: string;
  warehouseId: string;
  type: InventoryTransactionType;
  quantity: number;
  onHandBefore: number;
  onHandAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  actor: { id: string; fullName: string; email: string } | null;
  note: string | null;
  createdAt: string;
};

export type InventoryHistoryResponse = {
  items: InventoryTransaction[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryListQuery = {
  page?: number;
  limit?: number;
  q?: string;
  sort?: "updatedAt:desc" | "updatedAt:asc" | "sku:asc" | "available:asc";
  warehouseCode?: string;
};

export type InventoryHistoryQuery = {
  page?: number;
  limit?: number;
  type?: InventoryTransactionType;
  variantId?: string;
  warehouseCode?: string;
};

export type InventoryImportInput = {
  variantId: string;
  quantity: number;
  warehouseCode?: string;
  referenceId?: string;
  note?: string;
};

export type InventoryAdjustmentInput = {
  targetOnHand: number;
  reason: string;
  note?: string;
  referenceId?: string;
};

export type InventoryMutationResponse = {
  inventory: InventoryItem;
  transaction: InventoryTransaction;
};

function queryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== null) {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function getInventory(
  request: AuthorizedRequest,
  query: InventoryListQuery = {},
): Promise<InventoryListResponse> {
  return request<InventoryListResponse>(
    `/api/v1/admin/inventory${queryString(query)}`,
  );
}

export function getInventoryDetail(
  request: AuthorizedRequest,
  variantId: string,
  warehouseCode?: string,
): Promise<InventoryItem> {
  return request<InventoryItem>(
    `/api/v1/admin/inventory/${encodeURIComponent(variantId)}${queryString({ warehouseCode })}`,
  );
}

export function getInventoryHistory(
  request: AuthorizedRequest,
  query: InventoryHistoryQuery = {},
  variantId?: string,
): Promise<InventoryHistoryResponse> {
  const path = variantId
    ? `/api/v1/admin/inventory/${encodeURIComponent(variantId)}/history`
    : "/api/v1/admin/inventory/history";
  return request<InventoryHistoryResponse>(
    `${path}${queryString(query)}` as `/${string}`,
  );
}

export function importInventory(
  request: AuthorizedRequest,
  input: InventoryImportInput,
): Promise<InventoryMutationResponse> {
  return request<InventoryMutationResponse>("/api/v1/admin/inventory/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function adjustInventory(
  request: AuthorizedRequest,
  variantId: string,
  input: InventoryAdjustmentInput,
): Promise<InventoryMutationResponse> {
  return request<InventoryMutationResponse>(
    `/api/v1/admin/inventory/${encodeURIComponent(variantId)}/adjust`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
