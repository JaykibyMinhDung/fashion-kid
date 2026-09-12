import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../generated/prisma/client';
import {
  OrderRepository,
  type OrderWithRelations,
} from '../repositories/order.repository';
import { OrderQueryService } from './order-query.service';
import { OrderTransitionService } from './order-transition.service';

describe('OrderQueryService', () => {
  let service: OrderQueryService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let orderTransitionService: jest.Mocked<OrderTransitionService>;

  const mockOrder: OrderWithRelations = {
    id: 'order-1',
    orderNumber: 'ORD-20260908-000001',
    userId: 'user-1',
    status: OrderStatus.PENDING,
    itemsSubtotal: 300000n,
    discountAmount: 0n,
    shippingFee: 30000n,
    totalAmount: 330000n,
    currency: 'VND',
    paymentMethod: PaymentMethod.COD,
    shippingProvider: 'STANDARD_FALLBACK',
    shippingServiceCode: 'STANDARD',
    shippingServiceName: 'Giao hàng tiêu chuẩn',
    shippingQuoteSource: 'FALLBACK',
    shippingQuoteMetadata: null,
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0901234567',
    shippingAddressLine: '123 Lê Lợi',
    shippingWardCode: '00001',
    shippingWardName: 'Phường Bến Nghé',
    shippingProvinceCode: '01',
    shippingProvinceName: 'Hà Nội',
    shippingTrackingCode: null,
    shippingProviderStatus: null,
    shippingLastSyncedAt: null,
    customerNote: null,
    cancelReason: null,
    confirmedAt: null,
    packingAt: null,
    shippingAt: null,
    deliveredAt: null,
    cancelledAt: null,
    completedAt: null,
    createdAt: new Date('2026-09-08T10:00:00Z'),
    updatedAt: new Date('2026-09-08T10:00:00Z'),
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        variantId: 'variant-1',
        productName: 'Áo thun',
        sku: 'AT-01-RED-M',
        colorName: 'Đỏ',
        sizeName: 'M',
        unitPrice: 150000n,
        quantity: 2,
        lineTotal: 300000n,
        createdAt: new Date('2026-09-08T10:00:00Z'),
      },
    ],
    payment: {
      id: 'payment-1',
      orderId: 'order-1',
      method: PaymentMethod.COD,
      provider: null,
      status: PaymentStatus.PENDING,
      amount: 330000n,
      currency: 'VND',
      providerTransactionId: null,
      paidAt: null,
      failedAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-09-08T10:00:00Z'),
      updatedAt: new Date('2026-09-08T10:00:00Z'),
    },
    statusHistories: [],
    user: {
      fullName: 'Nguyễn Văn A',
      email: 'customer@example.com',
    },
  };

  beforeEach(async () => {
    const mockOrderRepo = {
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      findCustomerOrders: jest.fn(),
      findOperationalOrders: jest.fn(),
    };

    const mockTransitionService = {
      getAllowedActions: jest.fn().mockReturnValue(['CANCEL']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderQueryService,
        { provide: OrderRepository, useValue: mockOrderRepo },
        { provide: OrderTransitionService, useValue: mockTransitionService },
      ],
    }).compile();

    service = module.get<OrderQueryService>(OrderQueryService);
    orderRepository = module.get(OrderRepository);
    orderTransitionService = module.get(OrderTransitionService);
  });

  describe('getCustomerOrders', () => {
    it('returns paginated customer orders', async () => {
      orderRepository.findCustomerOrders.mockResolvedValue({
        items: [mockOrder],
        total: 1,
      });

      const result = await service.getCustomerOrders('user-1', {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].orderNumber).toBe('ORD-20260908-000001');
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getCustomerOrderDetail', () => {
    it('returns order detail for owner', async () => {
      orderRepository.findById.mockResolvedValue(mockOrder);

      const result = await service.getCustomerOrderDetail('user-1', 'order-1');
      expect(result.id).toBe('order-1');
      expect(result.allowedActions).toEqual(['CANCEL']);
      expect(result).not.toHaveProperty('userId');
      expect(result).not.toHaveProperty('customerEmail');
    });

    it('throws NotFoundException on IDOR mismatch (not own order)', async () => {
      orderRepository.findById.mockResolvedValue(mockOrder);

      await expect(
        service.getCustomerOrderDetail('other-user', 'order-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if order does not exist', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expect(
        service.getCustomerOrderDetail('user-1', 'unknown-order'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOperationalOrders', () => {
    it('returns paginated operational orders', async () => {
      orderRepository.findOperationalOrders.mockResolvedValue({
        items: [mockOrder],
        total: 1,
      });

      const result = await service.getOperationalOrders({
        page: 1,
        limit: 20,
        sort: 'createdAt:desc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getOperationalOrderDetail', () => {
    it('returns operational order detail with staff allowed actions', async () => {
      orderRepository.findById.mockResolvedValue(mockOrder);
      orderTransitionService.getAllowedActions.mockReturnValue([
        'CONFIRM',
        'CANCEL',
      ]);

      const result = await service.getOperationalOrderDetail(
        'order-1',
        'SALES_STAFF',
        'sales-1',
      );

      expect(result.id).toBe('order-1');
      expect(result.allowedActions).toEqual(['CONFIRM', 'CANCEL']);
    });

    it('throws NotFoundException if order does not exist', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expect(
        service.getOperationalOrderDetail(
          'unknown-order',
          'SALES_STAFF',
          'sales-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
