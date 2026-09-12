import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelMyOrder,
  cancelOrderByStaff,
  completeOrder,
  confirmOrder,
  deliverOrder,
  getMyOrderDetail,
  getMyOrders,
  getOperationalOrderDetail,
  getOperationalOrders,
  shipOrder,
  startPackingOrder,
} from './order-client';

describe('Order API Client', () => {
  const mockAuthorizedRequest = vi.fn();

  beforeEach(() => {
    mockAuthorizedRequest.mockReset();
  });

  describe('Customer APIs', () => {
    it('getMyOrders calls /api/v1/orders/my-orders with query parameters', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ items: [], total: 0 });

      await getMyOrders(mockAuthorizedRequest, {
        page: 2,
        limit: 10,
        status: 'PENDING',
      });

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/orders/my-orders?page=2&limit=10&status=PENDING',
      );
    });

    it('getMyOrderDetail calls /api/v1/orders/:id', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await getMyOrderDetail(mockAuthorizedRequest, 'order-123');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/orders/order-123',
      );
    });

    it('cancelMyOrder sends POST with reason payload', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await cancelMyOrder(mockAuthorizedRequest, 'order-123', 'Đổi ý');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/orders/order-123/cancel',
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Đổi ý' }),
        },
      );
    });
  });

  describe('Operational APIs', () => {
    it('getOperationalOrders calls /api/v1/operational/orders with filters', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ items: [], total: 0 });

      await getOperationalOrders(mockAuthorizedRequest, {
        status: 'CONFIRMED',
        orderNumber: 'ORD-123',
        page: 1,
        limit: 20,
      });

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/operational/orders?status=CONFIRMED&orderNumber=ORD-123&page=1&limit=20',
      );
    });

    it('getOperationalOrderDetail calls /api/v1/operational/orders/:id', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await getOperationalOrderDetail(mockAuthorizedRequest, 'order-123');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/operational/orders/order-123',
      );
    });

    it('confirmOrder sends POST to /confirm', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await confirmOrder(mockAuthorizedRequest, 'order-123');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/operational/orders/order-123/confirm',
        { method: 'POST' },
      );
    });

    it('cancelOrderByStaff sends POST with reason', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await cancelOrderByStaff(mockAuthorizedRequest, 'order-123', 'Hết hàng');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/operational/orders/order-123/cancel',
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Hết hàng' }),
        },
      );
    });

    it('startPackingOrder sends POST to /start-packing', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await startPackingOrder(mockAuthorizedRequest, 'order-123');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/operational/orders/order-123/start-packing',
        { method: 'POST' },
      );
    });

    it('shipOrder sends POST to /ship', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await shipOrder(mockAuthorizedRequest, 'order-123');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/operational/orders/order-123/ship',
        { method: 'POST' },
      );
    });

    it('deliverOrder sends POST to /deliver', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await deliverOrder(mockAuthorizedRequest, 'order-123');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/operational/orders/order-123/deliver',
        { method: 'POST' },
      );
    });

    it('completeOrder sends POST to /complete', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ id: 'order-123' });

      await completeOrder(mockAuthorizedRequest, 'order-123');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/operational/orders/order-123/complete',
        { method: 'POST' },
      );
    });
  });
});
