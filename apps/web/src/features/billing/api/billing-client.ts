import type { AuthContextValue } from '@/features/auth/session/auth-provider';
import type {
  AdminInvoiceQueryParams,
  InvoiceDetail,
  InvoicePaginatedResponse,
} from '../contracts';

type AuthorizedRequest = AuthContextValue['authorizedRequest'];

function queryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

/**
 * Lấy hoá đơn / biên nhận bán hàng của đơn hàng (khách hàng hoặc quản trị viên)
 */
export function getOrderInvoice(
  request: AuthorizedRequest,
  orderId: string,
): Promise<InvoiceDetail> {
  return request<InvoiceDetail>(
    `/api/v1/orders/${encodeURIComponent(orderId)}/invoice`,
  );
}

/**
 * Admin lấy danh sách hoá đơn bán hàng (phân trang, lọc theo trạng thái/mã đơn)
 */
export function getAdminInvoices(
  request: AuthorizedRequest,
  query: AdminInvoiceQueryParams = {},
): Promise<InvoicePaginatedResponse> {
  return request<InvoicePaginatedResponse>(
    `/api/v1/admin/invoices${queryString(query as Record<string, unknown>)}`,
  );
}

/**
 * Admin xem chi tiết hoá đơn theo ID
 */
export function getAdminInvoiceDetail(
  request: AuthorizedRequest,
  id: string,
): Promise<InvoiceDetail> {
  return request<InvoiceDetail>(
    `/api/v1/admin/invoices/${encodeURIComponent(id)}`,
  );
}
