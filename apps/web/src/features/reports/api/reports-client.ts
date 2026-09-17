import type { AuthContextValue } from '@/features/auth/session/auth-provider';
import type { AdminProductList } from '@/features/catalog/api/admin-catalog-client';
import type { InventoryListResponse } from '@/features/inventory/api/inventory-client';
import type { OrderListResponse } from '@/features/orders/contracts';
import type { OrderStatus } from '@/features/orders/contracts';

type AuthorizedRequest = AuthContextValue['authorizedRequest'];

export type OrderStatusBreakdown = Partial<Record<OrderStatus, number>>;

export type ReportData = {
  totalProducts: number;
  ordersByStatus: OrderStatusBreakdown;
  totalOrders: number;
  lowStockCount: number;
};

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKING',
  'SHIPPING',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
];

export async function getReportData(
  request: AuthorizedRequest,
): Promise<ReportData> {
  // Try to get reports from dedicated endpoint first
  try {
    const result = await request<ReportData>('/api/v1/admin/reports');
    return result;
  } catch {
    // Fall back to aggregating from multiple endpoints
  }

  const [products, inventory, ...orderResults] = await Promise.all([
    request<AdminProductList>('/api/v1/admin/catalog/products?limit=1&page=1'),
    request<InventoryListResponse>('/api/v1/admin/inventory?limit=200&page=1'),
    ...ORDER_STATUSES.map((status) =>
      request<OrderListResponse>(
        `/api/v1/operational/orders?limit=1&page=1&status=${status}`,
      ).catch(() => ({ items: [], total: 0, page: 1, limit: 1, totalPages: 0 } as OrderListResponse)),
    ),
  ]);

  const ordersByStatus: OrderStatusBreakdown = {};
  let totalOrders = 0;
  for (let i = 0; i < ORDER_STATUSES.length; i++) {
    const status = ORDER_STATUSES[i];
    const total = orderResults[i]?.total ?? 0;
    if (status) {
      ordersByStatus[status] = total;
      totalOrders += total;
    }
  }

  const lowStockCount = inventory.items.filter(
    (item) => item.available <= 5,
  ).length;

  return {
    totalProducts: products.total,
    ordersByStatus,
    totalOrders,
    lowStockCount,
  };
}
