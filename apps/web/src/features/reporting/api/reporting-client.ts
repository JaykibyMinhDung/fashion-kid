import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type {
  CouponsReportQuery,
  CouponsReportResponse,
  DashboardSummary,
  DateRangeQuery,
  InventoryAlertsQuery,
  InventoryAlertsResponse,
  OrdersReportQuery,
  OrdersReportResponse,
  PaymentsReportResponse,
  RevenueSeriesQuery,
  RevenueSeriesResponse,
  ReviewsReportResponse,
  TopProductsQuery,
  TopProductsResponse,
} from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

function queryString(
  query: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

export function getDashboardSummary(
  request: AuthorizedRequest,
  query?: DateRangeQuery,
): Promise<DashboardSummary> {
  const qs = query ? queryString(query as Record<string, string>) : "";
  return request<DashboardSummary>(`/api/v1/admin/reports/summary${qs}` as `/${string}`);
}

export function getRevenueSeries(
  request: AuthorizedRequest,
  query?: RevenueSeriesQuery,
): Promise<RevenueSeriesResponse> {
  const qs = query ? queryString(query as Record<string, string>) : "";
  return request<RevenueSeriesResponse>(`/api/v1/admin/reports/revenue${qs}` as `/${string}`);
}

export function getOrdersReport(
  request: AuthorizedRequest,
  query?: OrdersReportQuery,
): Promise<OrdersReportResponse> {
  const qs = query ? queryString(query as Record<string, string>) : "";
  return request<OrdersReportResponse>(`/api/v1/admin/reports/orders${qs}` as `/${string}`);
}

export function getTopProducts(
  request: AuthorizedRequest,
  query?: TopProductsQuery,
): Promise<TopProductsResponse> {
  const qs = query ? queryString(query as Record<string, string | number>) : "";
  return request<TopProductsResponse>(`/api/v1/admin/reports/products${qs}` as `/${string}`);
}

export function getInventoryAlerts(
  request: AuthorizedRequest,
  query?: InventoryAlertsQuery,
): Promise<InventoryAlertsResponse> {
  const qs = query ? queryString(query as Record<string, string | number>) : "";
  return request<InventoryAlertsResponse>(`/api/v1/admin/reports/inventory${qs}` as `/${string}`);
}

export function getCouponsReport(
  request: AuthorizedRequest,
  query?: CouponsReportQuery,
): Promise<CouponsReportResponse> {
  const qs = query ? queryString(query as Record<string, string | number>) : "";
  return request<CouponsReportResponse>(`/api/v1/admin/reports/coupons${qs}` as `/${string}`);
}

export function getReviewsReport(
  request: AuthorizedRequest,
): Promise<ReviewsReportResponse> {
  return request<ReviewsReportResponse>("/api/v1/admin/reports/reviews");
}

export function getPaymentsReport(
  request: AuthorizedRequest,
  query?: DateRangeQuery,
): Promise<PaymentsReportResponse> {
  const qs = query ? queryString(query as Record<string, string>) : "";
  return request<PaymentsReportResponse>(`/api/v1/admin/reports/payments${qs}` as `/${string}`);
}

type AuthorizedBlobRequest = AuthContextValue["authorizedBlobRequest"];

export async function exportConsolidatedWorkbook(
  request: NonNullable<AuthorizedBlobRequest>,
  query: { from: string; to: string; granularity?: string },
): Promise<string> {
  const qs = queryString(query as Record<string, string>);
  const { blob } = await request(`/api/v1/admin/reports/export/consolidated${qs}` as `/${string}`);
  const filename = `bao-cao-tong-hop_${query.from}_${query.to}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}
