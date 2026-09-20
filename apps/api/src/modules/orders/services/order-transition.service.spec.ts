import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ApiException } from '../../../common/errors/api-error';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import {
  OrderRepository,
  type OrderWithRelations,
} from '../repositories/order.repository';
import { OrderTransitionService } from './order-transition.service';
import { InvoiceService } from '../../billing/services/invoice.service';

describe('OrderTransitionService', () => {
  let service: OrderTransitionService;
  let orderRepository: {
    findById: jest.Mock;
    findByIdForUpdate: jest.Mock;
    findCustomerOrders: jest.Mock;
    findOperationalOrders: jest.Mock;
  };
  let inventoryRepository: {
    findWarehouseByCode: jest.Mock;
    list: jest.Mock;
    findByVariant: jest.Mock;
    listHistory: jest.Mock;
    importOne: jest.Mock;
    adjustOne: jest.Mock;
    reserveMany: jest.Mock;
    releaseMany: jest.Mock;
    saleMany: jest.Mock;
  };

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
    customerNote: 'Giao giờ hành chính',
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

    const mockInventoryRepo = {
      findWarehouseByCode: jest.fn(),
      list: jest.fn(),
      findByVariant: jest.fn(),
      listHistory: jest.fn(),
      importOne: jest.fn(),
      adjustOne: jest.fn(),
      reserveMany: jest.fn(),
      releaseMany: jest.fn(),
      saleMany: jest.fn(),
    };

    const mockTx = {
      order: {
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      payment: {
        update: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
      },
      inventoryTransaction: {
        findMany: jest.fn().mockResolvedValue([
          {
            warehouseId: 'wh-1',
            variantId: 'variant-1',
            quantity: 2,
          },
        ]),
      },
      warehouse: {
        findFirst: jest.fn(),
      },
    };

    const mockPrisma = {
      $transaction: jest
        .fn()
        .mockImplementation(
          (callback: (tx: typeof mockTx) => Promise<unknown>) => {
            return callback(mockTx);
          },
        ),
    };

    const mockInvoiceService = {
      voidForOrder: jest.fn().mockResolvedValue(null),
      issueForOrder: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTransitionService,
        { provide: OrderRepository, useValue: mockOrderRepo },
        { provide: InventoryRepository, useValue: mockInventoryRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InvoiceService, useValue: mockInvoiceService },
      ],
    }).compile();

    service = module.get<OrderTransitionService>(OrderTransitionService);
    orderRepository = mockOrderRepo;
    inventoryRepository = mockInventoryRepo;
  });

  describe('getAllowedActions', () => {
    it('returns CANCEL for customer on own PENDING order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.PENDING, userId: 'user-1' },
        'CUSTOMER',
        'user-1',
      );
      expect(actions).toEqual(['CANCEL']);
    });

    it('returns empty for customer on someone elses PENDING order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.PENDING, userId: 'user-2' },
        'CUSTOMER',
        'user-1',
      );
      expect(actions).toEqual([]);
    });

    it('returns CONFIRM and CANCEL for sales staff on PENDING order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.PENDING, userId: 'user-1' },
        'SALES_STAFF',
        'staff-1',
      );
      expect(actions).toContain('CONFIRM');
      expect(actions).toContain('CANCEL');
    });

    it('returns empty for warehouse staff on PENDING order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.PENDING, userId: 'user-1' },
        'WAREHOUSE_STAFF',
        'staff-2',
      );
      expect(actions).toEqual([]);
    });

    it('returns CANCEL for customer on own CONFIRMED order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.CONFIRMED, userId: 'user-1' },
        'CUSTOMER',
        'user-1',
      );
      expect(actions).toEqual(['CANCEL']);
    });

    it('returns START_PACKING for warehouse staff on CONFIRMED order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.CONFIRMED, userId: 'user-1' },
        'WAREHOUSE_STAFF',
        'staff-2',
      );
      expect(actions).toEqual(['START_PACKING']);
    });

    it('returns SHIP for warehouse staff on PACKING order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.PACKING, userId: 'user-1' },
        'WAREHOUSE_STAFF',
        'staff-2',
      );
      expect(actions).toEqual(['SHIP']);
    });

    it('returns DELIVER for admin on SHIPPING order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.SHIPPING, userId: 'user-1' },
        'ADMIN',
        'admin-1',
      );
      expect(actions).toEqual(['DELIVER']);
    });

    it('returns COMPLETE for admin on DELIVERED order', () => {
      const actions = service.getAllowedActions(
        { status: OrderStatus.DELIVERED, userId: 'user-1' },
        'ADMIN',
        'admin-1',
      );
      expect(actions).toEqual(['COMPLETE']);
    });

    it('returns empty for any role on COMPLETED or CANCELLED order', () => {
      expect(
        service.getAllowedActions(
          { status: OrderStatus.COMPLETED, userId: 'user-1' },
          'ADMIN',
          'admin-1',
        ),
      ).toEqual([]);

      expect(
        service.getAllowedActions(
          { status: OrderStatus.CANCELLED, userId: 'user-1' },
          'ADMIN',
          'admin-1',
        ),
      ).toEqual([]);
    });
  });

  describe('confirm', () => {
    it('confirms PENDING order successfully', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(mockOrder);
      orderRepository.findById.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      const result = await service.confirm('order-1', 'sales-1', 'SALES_STAFF');
      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(orderRepository.findByIdForUpdate).toHaveBeenCalledWith(
        expect.anything(),
        'order-1',
      );
    });

    it('throws INVALID_ORDER_TRANSITION if order is not PENDING', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });

      await expect(
        service.confirm('order-1', 'sales-1', 'SALES_STAFF'),
      ).rejects.toMatchObject({
        code: 'INVALID_ORDER_TRANSITION',
      } satisfies Partial<ApiException>);
    });

    it('throws NotFoundException if order is not found', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(null);

      await expect(
        service.confirm('order-unknown', 'sales-1', 'SALES_STAFF'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelByCustomer', () => {
    it('cancels PENDING order and releases inventory', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(mockOrder);
      orderRepository.findById.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
        cancelReason: 'Đổi ý',
        cancelledAt: new Date(),
      });

      const result = await service.cancelByCustomer(
        'order-1',
        'user-1',
        'Đổi ý',
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(inventoryRepository.releaseMany).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'ORDER',
          referenceId: 'order-1',
        }),
      );
    });

    it('cancels CONFIRMED order for customer', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });
      orderRepository.findById.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
        cancelReason: 'Muốn đổi size',
        cancelledAt: new Date(),
      });

      const result = await service.cancelByCustomer(
        'order-1',
        'user-1',
        'Muốn đổi size',
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('throws INVALID_ORDER_TRANSITION if order has reached PACKING', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PACKING,
      });

      await expect(
        service.cancelByCustomer('order-1', 'user-1', 'Huỷ đơn'),
      ).rejects.toMatchObject({
        code: 'INVALID_ORDER_TRANSITION',
      } satisfies Partial<ApiException>);
    });

    it('throws BadRequestException if reason is empty or whitespace', async () => {
      await expect(
        service.cancelByCustomer('order-1', 'user-1', '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if userId does not match order.userId (IDOR protection)', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(mockOrder);

      await expect(
        service.cancelByCustomer('order-1', 'other-user', 'Lý do'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('startPacking', () => {
    it('moves order from CONFIRMED to PACKING', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });
      orderRepository.findById.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PACKING,
        packingAt: new Date(),
      });

      const result = await service.startPacking(
        'order-1',
        'wh-1',
        'WAREHOUSE_STAFF',
      );
      expect(result.status).toBe(OrderStatus.PACKING);
    });

    it('rejects startPacking if order is PENDING', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue(mockOrder);

      await expect(
        service.startPacking('order-1', 'wh-1', 'WAREHOUSE_STAFF'),
      ).rejects.toMatchObject({
        code: 'INVALID_ORDER_TRANSITION',
      } satisfies Partial<ApiException>);
    });
  });

  describe('ship', () => {
    it('moves order from PACKING to SHIPPING and triggers inventory SALE', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PACKING,
      });
      orderRepository.findById.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPING,
        shippingAt: new Date(),
      });

      const result = await service.ship('order-1', 'wh-1', 'WAREHOUSE_STAFF');
      expect(result.status).toBe(OrderStatus.SHIPPING);
      expect(inventoryRepository.saleMany).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          referenceType: 'ORDER',
          referenceId: 'order-1',
        }),
      );
    });

    it('rejects ship if order is not PACKING', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });

      await expect(
        service.ship('order-1', 'wh-1', 'WAREHOUSE_STAFF'),
      ).rejects.toMatchObject({
        code: 'INVALID_ORDER_TRANSITION',
      } satisfies Partial<ApiException>);
    });
  });

  describe('deliver', () => {
    it('moves order from SHIPPING to DELIVERED', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPING,
      });
      orderRepository.findById.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      const result = await service.deliver('order-1', 'admin-1', 'ADMIN');
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('rejects deliver if order is not SHIPPING', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PACKING,
      });

      await expect(
        service.deliver('order-1', 'admin-1', 'ADMIN'),
      ).rejects.toMatchObject({
        code: 'INVALID_ORDER_TRANSITION',
      } satisfies Partial<ApiException>);
    });
  });

  describe('complete', () => {
    it('moves order from DELIVERED to COMPLETED and marks payment PAID', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });
      orderRepository.findById.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
        payment: {
          ...mockOrder.payment!,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });

      const result = await service.complete('order-1', 'admin-1', 'ADMIN');
      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(result.payment?.status).toBe(PaymentStatus.PAID);
    });

    it('rejects complete if order is not DELIVERED', async () => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPING,
      });

      await expect(
        service.complete('order-1', 'admin-1', 'ADMIN'),
      ).rejects.toMatchObject({
        code: 'INVALID_ORDER_TRANSITION',
      } satisfies Partial<ApiException>);
    });

    it.each([
      ['missing payment', null],
      [
        'online payment',
        { ...mockOrder.payment!, method: PaymentMethod.ONLINE },
      ],
      [
        'failed COD payment',
        { ...mockOrder.payment!, status: PaymentStatus.FAILED },
      ],
      [
        'cancelled COD payment',
        { ...mockOrder.payment!, status: PaymentStatus.CANCELLED },
      ],
      [
        'already-paid COD payment',
        { ...mockOrder.payment!, status: PaymentStatus.PAID },
      ],
    ])('rejects complete with %s', async (_label, payment) => {
      orderRepository.findByIdForUpdate.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
        payment,
      });

      await expect(
        service.complete('order-1', 'admin-1', 'ADMIN'),
      ).rejects.toMatchObject({
        code: 'INVALID_ORDER_TRANSITION',
      } satisfies Partial<ApiException>);
      expect(orderRepository.findById).not.toHaveBeenCalled();
    });
  });
});
