import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type {
  AuditLog,
  AuditLogListQuery,
  AuditLogListResponse,
} from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export function getAuditLogs(
  request: AuthorizedRequest,
  query: AuditLogListQuery,
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });
  return request<AuditLogListResponse>(`/api/v1/admin/audit-logs?${params}`);
}

export function getAuditLog(
  request: AuthorizedRequest,
  id: string,
): Promise<AuditLog> {
  return request<AuditLog>(`/api/v1/admin/audit-logs/${id}`);
}
