/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../../common/errors/api-error';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../generated/prisma/client';
import { ShipmentService } from './shipment.service';

describe('ShipmentService', () => {
  let service: ShipmentService;
  let mockPrisma: any;
  let mockGhnClient: any;
  let mockAddressMapper: any;
  let mockOrderTransitionService: any;

  const mockOrderConfirmed = {
    id: 'order-uuid-1',
    orderNumber: 'ORD-20260915-001',
    status: OrderStatus.CONFIRMED,
    totalAmount: 350000n,
    paymentMethod: PaymentMethod.COD,
    receiverName: 'Nguyen Van B',
    receiverPhone: '0912345678',
    shippingAddressLine: '123 Pham Van Dong',
    shippingWardCode: '11001',
    shippingWardName: 'Phường Cổ Nhuế 1',
    shippingProvinceCode: '01',
    shippingProvinceName: 'Hà Nội',
    shippingTrackingCode: null,
    shippingProvider: null,
    shippingServiceCode: null,
    shippingServiceName: null,
    shippingProviderStatus: null,
    shippingLastSyncedAt: null,
    customerNote: null,
    items: [
      {
        productName: 'Áo Thun Trẻ Em',
        sku: 'AT-001',
        quantity: 2,
        unitPrice: 150000n,
        variant: {
          weightGrams: 200,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 5,
        },
      },
    ],
    payment: {
      status: PaymentStatus.PENDING,
    },
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockGhnClient = {
      createOrder: jest.fn(),
      getOrderDetail: jest.fn(),
      getOrderDetailByClientCode: jest.fn(),
    };

    mockAddressMapper = {
      resolveAddress: jest.fn().mockResolvedValue({
        provinceId: 201,
        provinceName: 'Hà Nội',
        districtId: 1482,
        districtName: 'Bắc Từ Liêm',
        wardCode: '11001',
        wardName: 'Phường Cổ Nhuế 1',
      }),
    };

    mockOrderTransitionService = {
      deliver: jest.fn().mockResolvedValue({}),
    };

    service = new ShipmentService(
      mockPrisma,
      mockGhnClient,
      mockAddressMapper,
      mockOrderTransitionService,
    );
  });

  describe('createShipment', () => {
    it('should create a shipment successfully for a CONFIRMED order', async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(mockOrderConfirmed) // First call in createShipment
        .mockResolvedValueOnce({
          ...mockOrderConfirmed,
          shippingTrackingCode: 'GHN-TRACK-001',
          shippingProvider: 'GHN',
          shippingProviderStatus: 'READY_TO_PICK',
        }); // Second call in getShippingBlock

      mockGhnClient.createOrder.mockResolvedValue({
        order_code: 'GHN-TRACK-001',
        total_fee: 30000,
        expected_delivery_time: '2026-09-17T12:00:00Z',
      });

      const result = await service.createShipment(
        'order-uuid-1',
        'staff-uuid-1',
      );

      expect(result.shippingTrackingCode).toBe('GHN-TRACK-001');
      expect(mockGhnClient.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          client_order_code: 'ORD-20260915-001',
          to_district_id: 1482,
          to_ward_code: '11001',
          cod_amount: 350000,
        }),
      );
    });

    it('should be idempotent and return existing shipment if tracking code already exists', async () => {
      const orderAlreadyShipped = {
        ...mockOrderConfirmed,
        shippingTrackingCode: 'GHN-EXISTING-999',
        shippingProvider: 'GHN',
        shippingProviderStatus: 'READY_TO_PICK',
      };

      mockPrisma.order.findUnique.mockResolvedValue(orderAlreadyShipped);

      const result = await service.createShipment(
        'order-uuid-1',
        'staff-uuid-1',
      );

      expect(result.shippingTrackingCode).toBe('GHN-EXISTING-999');
      expect(mockGhnClient.createOrder).not.toHaveBeenCalled();
    });

    it('should reject creation if order status is not CONFIRMED or PACKING', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrderConfirmed,
        status: OrderStatus.PENDING,
      });

      await expect(
        service.createShipment('order-uuid-1', 'staff-uuid-1'),
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.CONFLICT,
          code: 'SHIPMENT_NOT_READY',
        }),
      );
    });

    it('should reconcile on create timeout by checking detail-by-client-code', async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(mockOrderConfirmed)
        .mockResolvedValueOnce({
          ...mockOrderConfirmed,
          shippingTrackingCode: 'GHN-RECONCILED-123',
          shippingProvider: 'GHN',
          shippingProviderStatus: 'READY_TO_PICK',
        });

      // Simulate network timeout on createOrder
      mockGhnClient.createOrder.mockRejectedValue(
        new ApiException(
          HttpStatus.GATEWAY_TIMEOUT,
          'SHIPPING_TIMEOUT',
          'Timeout connecting to GHN',
        ),
      );

      // Reconcile finds the order at GHN
      mockGhnClient.getOrderDetailByClientCode.mockResolvedValue({
        order_code: 'GHN-RECONCILED-123',
        client_order_code: 'ORD-20260915-001',
        status: 'ready_to_pick',
      });

      const result = await service.createShipment(
        'order-uuid-1',
        'staff-uuid-1',
      );

      expect(result.shippingTrackingCode).toBe('GHN-RECONCILED-123');
      expect(mockGhnClient.getOrderDetailByClientCode).toHaveBeenCalledWith(
        'ORD-20260915-001',
      );
    });
  });

  describe('handleWebhook', () => {
    it('AC-GHN-W-03: should safely ignore webhook for unknown order without error', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const res = await service.handleWebhook({
        OrderCode: 'UNKNOWN-GHN-CODE',
        Status: 'delivered',
      });

      expect(res).toEqual({ received: true, ignored: true });
    });

    it('AC-GHN-W-04 & 05: DELIVERED webhook transitions order to DELIVERED via System actor when SHIPPING', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-uuid-1',
        orderNumber: 'ORD-20260915-001',
        status: OrderStatus.SHIPPING,
        shippingTrackingCode: 'GHN-TRACK-001',
        shippingProviderStatus: 'DELIVERING',
      });

      const res = await service.handleWebhook({
        OrderCode: 'GHN-TRACK-001',
        Status: 'delivered',
      });

      expect(res.status).toBe('DELIVERED');
      expect(mockOrderTransitionService.deliver).toHaveBeenCalledWith(
        'order-uuid-1',
        'SYSTEM',
        'ADMIN',
      );
    });

    it('AC-GHN-W-02: DELIVERED webhook does NOT trigger order transition if order is NOT SHIPPING', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-uuid-1',
        orderNumber: 'ORD-20260915-001',
        status: OrderStatus.CONFIRMED, // Not in SHIPPING state yet
        shippingTrackingCode: 'GHN-TRACK-001',
        shippingProviderStatus: 'READY_TO_PICK',
      });

      const res = await service.handleWebhook({
        OrderCode: 'GHN-TRACK-001',
        Status: 'delivered',
      });

      expect(res.status).toBe('DELIVERED');
      expect(mockOrderTransitionService.deliver).not.toHaveBeenCalled();
    });
  });
});
