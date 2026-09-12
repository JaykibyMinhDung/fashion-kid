import type { RoleCode } from "@/features/auth/contracts";

export const ADMIN_USER_ROLES = [
  "CUSTOMER",
  "SALES_STAFF",
  "WAREHOUSE_STAFF",
  "ADMIN",
] as const satisfies readonly RoleCode[];

export type AdminUserStatus = "ACTIVE" | "DISABLED";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: RoleCode;
  status: AdminUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AdminUserListResponse = {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminUserListQuery = {
  page: number;
  limit: number;
  q?: string;
  role?: RoleCode;
  status?: AdminUserStatus;
  sort?: string;
};
