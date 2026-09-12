import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type {
  AdminUser,
  AdminUserListQuery,
  AdminUserListResponse,
  AdminUserStatus,
} from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export function getAdminUsers(
  request: AuthorizedRequest,
  query: AdminUserListQuery,
): Promise<AdminUserListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    ...(query.q ? { q: query.q } : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
  });
  return request<AdminUserListResponse>(`/api/v1/admin/users?${params}`);
}

export function updateAdminUserStatus(
  request: AuthorizedRequest,
  userId: string,
  status: AdminUserStatus,
): Promise<AdminUser> {
  return request<AdminUser>(`/api/v1/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateAdminUserRole(
  request: AuthorizedRequest,
  userId: string,
  role: AdminUser["role"],
): Promise<AdminUser> {
  return request<AdminUser>(`/api/v1/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
