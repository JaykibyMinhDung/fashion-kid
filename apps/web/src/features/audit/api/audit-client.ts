import type { AuthContextValue } from '@/features/auth/session/auth-provider';

type AuthorizedRequest = AuthContextValue['authorizedRequest'];

export type AuditLog = {
  id: string;
  createdAt: string;
  action: string;
  actor?: string | null;
  actorId?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AuditLogListResponse = {
  items: AuditLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AuditLogQuery = {
  page?: number;
  limit?: number;
  action?: string;
  actor?: string;
};

function queryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export async function getAuditLogs(
  request: AuthorizedRequest,
  query: AuditLogQuery = {},
): Promise<AuditLogListResponse> {
  // Try primary admin audit endpoint first, fall back to generic audit
  try {
    return await request<AuditLogListResponse>(
      `/api/v1/admin/audit${queryString(query)}`,
    );
  } catch {
    return request<AuditLogListResponse>(
      `/api/v1/audit${queryString(query)}`,
    );
  }
}
