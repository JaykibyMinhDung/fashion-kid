export interface ReportMetadata {
  from: string;
  to: string;
  timezone: string;
  generatedAt: string;
}

export interface DashboardSummary {
  grossRevenue: string;
  completedOrders: number;
  averageOrderValue: string;
  unitsSold: number;
  outOfStockVariants: number;
  lowStockVariants: number;
  newCustomers: number;
  metadata: ReportMetadata;
}

export interface RevenuePoint {
  date: string;
  grossRevenue: string;
  completedOrders: number;
}

export interface RevenueSeriesResponse {
  granularity: "day" | "week" | "month";
  series: RevenuePoint[];
  totalRevenue: string;
  totalOrders: number;
  metadata: ReportMetadata;
}

export interface OrderStatusItem {
  status: string;
  count: number;
  percentage: number;
}

export interface OrdersReportResponse {
  currentDistribution: OrderStatusItem[];
  totalCurrentOrders: number;
  periodCreatedOrders: number;
  periodCompletedOrders: number;
  periodCancelledOrders: number;
  metadata: ReportMetadata;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  variantName: string;
  unitsSold: number;
  productRevenue: string;
}

export interface TopProductsResponse {
  items: TopProductItem[];
  totalRevenueRanked: string;
  totalUnitsRanked: number;
  metadata: ReportMetadata;
}

export interface InventoryAlertItem {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  sizeName: string;
  colorName: string;
  onHand: number;
  reserved: number;
  available: number;
  isOutOfStock: boolean;
}

export interface InventoryAlertsResponse {
  items: InventoryAlertItem[];
  outOfStockCount: number;
  lowStockCount: number;
  threshold: number;
}

export interface DateRangeQuery {
  from?: string;
  to?: string;
}

export interface RevenueSeriesQuery extends DateRangeQuery {
  granularity?: "day" | "week" | "month";
}

export type OrdersReportQuery = DateRangeQuery;

export interface TopProductsQuery extends DateRangeQuery {
  limit?: number;
  sortBy?: "revenue" | "units";
}

export interface InventoryAlertsQuery {
  threshold?: number;
  limit?: number;
  // Phải khớp allow-list backend (INVENTORY_STATUS_FILTER) — dùng gạch ngang.
  status?: "all" | "out-of-stock" | "low-stock";
}

export interface CouponsReportQuery extends DateRangeQuery {
  limit?: number;
}

export interface CouponUsageItem {
  couponId: string;
  code: string;
  name: string;
  discountAmount: string;
  usageCount: number;
}

export interface CouponsReportResponse {
  realizedDiscountAmount: string;
  totalCompletedUsages: number;
  topCoupons: CouponUsageItem[];
  metadata: ReportMetadata;
}

export interface ReviewsReportResponse {
  // Khớp ReviewsReportResponseDto của backend: đếm PUBLISHED + phân bố dạng bản đồ {rating: count}.
  publishedReviewCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

export interface PaymentMethodItem {
  method: string;
  amount: string;
  count: number;
}

export interface PaymentsReportResponse {
  methods: PaymentMethodItem[];
  totalPaidAmount: string;
  metadata: ReportMetadata;
}


export function formatVnd(amount: string | number | bigint): string {
  try {
    const numeric = typeof amount === "bigint" ? Number(amount) : Number(amount);
    if (isNaN(numeric)) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${amount} ₫`;
  }
}

export function formatCompactVnd(amount: string | number | bigint): string {
  try {
    const numeric = Number(amount);
    if (isNaN(numeric) || numeric === 0) return "0 ₫";
    if (numeric >= 1_000_000_000) {
      return `${(numeric / 1_000_000_000).toFixed(1)}B ₫`;
    }
    if (numeric >= 1_000_000) {
      return `${(numeric / 1_000_000).toFixed(1)}M ₫`;
    }
    if (numeric >= 1_000) {
      return `${(numeric / 1_000).toFixed(0)}k ₫`;
    }
    return `${numeric} ₫`;
  } catch {
    return `${amount} ₫`;
  }
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ xác nhận", color: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-800" },
  PACKING: { label: "Đang đóng gói", color: "bg-purple-100 text-purple-800" },
  SHIPPING: { label: "Đang giao", color: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "Đã giao", color: "bg-teal-100 text-teal-800" },
  COMPLETED: { label: "Hoàn tất", color: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Đã hủy", color: "bg-rose-100 text-rose-800" },
};
