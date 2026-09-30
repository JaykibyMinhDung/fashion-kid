export type AuditLogActor = {
  id: string;
  fullName: string;
  email: string;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: AuditLogActor | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
};

export type AuditLogListResponse = {
  items: AuditLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AuditLogListQuery = {
  page: number;
  limit: number;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
};
