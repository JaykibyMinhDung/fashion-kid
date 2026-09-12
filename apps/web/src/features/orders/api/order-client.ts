import type { AuthContextValue } from '@/features/auth/session/auth-provider';
import type {
  CustomerOrderQuery,
  OrderDetail,
  OrderListResponse,
  OperationalOrderQuery,
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

// ── Customer Order APIs ──

export function getMyOrders(
  request: AuthorizedRequest,
  query: CustomerOrderQuery = {},
): Promise<OrderListResponse> {
  return request<OrderListResponse>(
    `/api/v1/orders/my-orders${queryString(query as Record<string, unknown>)}`,
  );
}

export function getMyOrderDetail(
  request: AuthorizedRequest,
  id: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(`/api/v1/orders/${encodeURIComponent(id)}`);
}

export function cancelMyOrder(
  request: AuthorizedRequest,
  id: string,
  reason: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(
    `/api/v1/orders/${encodeURIComponent(id)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

// ── Operational / Staff Order APIs ──

export function getOperationalOrders(
  request: AuthorizedRequest,
  query: OperationalOrderQuery = {},
): Promise<OrderListResponse> {
  return request<OrderListResponse>(
    `/api/v1/operational/orders${queryString(query as Record<string, unknown>)}`,
  );
}

export function getOperationalOrderDetail(
  request: AuthorizedRequest,
  id: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(
    `/api/v1/operational/orders/${encodeURIComponent(id)}`,
  );
}

export function confirmOrder(
  request: AuthorizedRequest,
  id: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(
    `/api/v1/operational/orders/${encodeURIComponent(id)}/confirm`,
    {
      method: 'POST',
    },
  );
}

export function cancelOrderByStaff(
  request: AuthorizedRequest,
  id: string,
  reason: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(
    `/api/v1/operational/orders/${encodeURIComponent(id)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

export function startPackingOrder(
  request: AuthorizedRequest,
  id: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(
    `/api/v1/operational/orders/${encodeURIComponent(id)}/start-packing`,
    {
      method: 'POST',
    },
  );
}

export function shipOrder(
  request: AuthorizedRequest,
  id: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(
    `/api/v1/operational/orders/${encodeURIComponent(id)}/ship`,
    {
      method: 'POST',
    },
  );
}

export function deliverOrder(
  request: AuthorizedRequest,
  id: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(
    `/api/v1/operational/orders/${encodeURIComponent(id)}/deliver`,
    {
      method: 'POST',
    },
  );
}

export function completeOrder(
  request: AuthorizedRequest,
  id: string,
): Promise<OrderDetail> {
  return request<OrderDetail>(
    `/api/v1/operational/orders/${encodeURIComponent(id)}/complete`,
    {
      method: 'POST',
    },
  );
}
