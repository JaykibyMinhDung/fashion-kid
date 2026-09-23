import type { AuthContextValue } from '@/features/auth/session/auth-provider';
import type { ShippingBlock } from '../contracts';

type AuthorizedRequest = AuthContextValue['authorizedRequest'];

export function createShipment(
  request: AuthorizedRequest,
  orderId: string,
): Promise<ShippingBlock> {
  return request<ShippingBlock>(
    `/api/v1/operational/orders/${encodeURIComponent(orderId)}/shipping/create`,
    {
      method: 'POST',
    },
  );
}

export function syncShipment(
  request: AuthorizedRequest,
  orderId: string,
): Promise<ShippingBlock> {
  return request<ShippingBlock>(
    `/api/v1/operational/orders/${encodeURIComponent(orderId)}/shipping/sync`,
    {
      method: 'POST',
    },
  );
}

export function getShippingBlock(
  request: AuthorizedRequest,
  orderId: string,
): Promise<ShippingBlock> {
  return request<ShippingBlock>(
    `/api/v1/orders/${encodeURIComponent(orderId)}/shipping`,
  );
}
