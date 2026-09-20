export type EmailOutboxStatus = "PENDING" | "SENT" | "FAILED";

export interface EmailOutboxItem {
  id: string;
  dedupeKey: string;
  toEmail: string;
  template: string;
  payload: Record<string, unknown>;
  status: EmailOutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailOutboxListResponse {
  data: EmailOutboxItem[];
  total: number;
  page: number;
  limit: number;
}

export interface EmailOutboxQuery {
  status?: EmailOutboxStatus;
  page?: number;
  limit?: number;
}
