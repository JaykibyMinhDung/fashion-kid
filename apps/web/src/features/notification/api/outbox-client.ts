import type { EmailOutboxListResponse, EmailOutboxQuery } from "../contracts";

export async function getEmailOutboxList(
  authorizedRequest: <T>(path: `/${string}`, init?: RequestInit) => Promise<T>,
  query: EmailOutboxQuery = {},
): Promise<EmailOutboxListResponse> {
  const params = new URLSearchParams();
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.page) {
    params.set("page", String(query.page));
  }
  if (query.limit) {
    params.set("limit", String(query.limit));
  }
  const queryString = params.toString();
  const path = `/api/v1/admin/email-outbox${queryString ? `?${queryString}` : ""}` as `/${string}`;
  return authorizedRequest<EmailOutboxListResponse>(path);
}
