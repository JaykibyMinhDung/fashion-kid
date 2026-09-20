import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentProvider } from '../domain/payment-provider.interface';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTxStatus,
  PaymentTxType,
} from '../../../generated/prisma/client';
import { ApiException } from '../../../common/errors/api-error';
import {
  IpnSuccess,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  IpnOrderAlreadyConfirmed,
} from '../providers/vnpay/vnpay.mapper';

type MockTxClient = {
  $queryRaw: jest.Mock;
  payment: {
    findUniqueOrThrow: jest.Mock;
    update: jest.Mock;
  };
  paymentTransaction: {
    create: jest.Mock;
  };
  order: {
    update: jest.Mock;
  };
  orderStatusHistory: {
    create: jest.Mock;
  };
};

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: {
    payment: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    paymentTransaction: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let vnpayAdapter: {
    createPaymentUrl: jest.Mock;
    verifyCallback: jest.Mock;
    verifyIpn: jest.Mock;
  };

  const mockUserId = 'user-123';
  const mockOtherUserId = 'user-999';
  const mockPaymentId = 'pay-uuid-1';
  const mockOrderId = 'ord-uuid-1';

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(
        async <T>(cb: (tx: MockTxClient) => Promise<T>): Promise<T> => {
          const tx: MockTxClient = {
            $queryRaw: jest.fn().mockResolvedValue([]),
            payment: {
              findUniqueOrThrow: jest.fn(),
              update: jest.fn(),
            },
            paymentTransaction: {
              create: jest.fn(),
            },
            order: {
              update: jest.fn(),
            },
            orderStatusHistory: {
              create: jest.fn(),
            },
          };
          return await cb(tx);
        },
      ),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    vnpayAdapter = {
      createPaymentUrl: jest.fn(),
      verifyCallback: jest.fn(),
      verifyIpn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentProvider, useValue: vnpayAdapter },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('createVnpayUrl', () => {
    it('throws NOT_FOUND when payment record does not exist', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.createVnpayUrl(mockPaymentId, mockUserId, '127.0.0.1'),
      ).rejects.toThrow(ApiException);
    });

    it('throws FORBIDDEN when customer is not the owner of the order', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: mockPaymentId,
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.PENDING,
        order: { userId: mockOtherUserId, status: OrderStatus.PENDING },
      });

      await expect(
        service.createVnpayUrl(mockPaymentId, mockUserId, '127.0.0.1'),
      ).rejects.toThrow('Bạn không có quyền thao tác');
    });

    it('throws BAD_REQUEST when payment method is not ONLINE', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: mockPaymentId,
        method: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
        order: { userId: mockUserId, status: OrderStatus.PENDING },
      });

      await expect(
        service.createVnpayUrl(mockPaymentId, mockUserId, '127.0.0.1'),
      ).rejects.toThrow('không phải trực tuyến');
    });

    it('throws BAD_REQUEST when payment is already PAID', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: mockPaymentId,
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.PAID,
        order: { userId: mockUserId, status: OrderStatus.PENDING },
      });

      await expect(
        service.createVnpayUrl(mockPaymentId, mockUserId, '127.0.0.1'),
      ).rejects.toThrow('Đơn hàng đã được thanh toán');
    });

    it('throws BAD_REQUEST when order status is not PENDING', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: mockPaymentId,
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.PENDING,
        order: { userId: mockUserId, status: OrderStatus.CONFIRMED },
      });

      await expect(
        service.createVnpayUrl(mockPaymentId, mockUserId, '127.0.0.1'),
      ).rejects.toThrow('Trạng thái đơn hàng không hợp lệ');
    });

    it('creates attempt transaction and returns signed payment URL', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: mockPaymentId,
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.PENDING,
        amount: 250000n,
        currency: 'VND',
        order: {
          id: mockOrderId,
          orderNumber: 'ORD-20260915-001',
          userId: mockUserId,
          status: OrderStatus.PENDING,
        },
      });

      vnpayAdapter.createPaymentUrl.mockReturnValue({
        paymentUrl:
          'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=25000000',
        txnRef: 'PAY-ORD-20260915-001-XYZ',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const response = await service.createVnpayUrl(
        mockPaymentId,
        mockUserId,
        '127.0.0.1',
      );

      const createMock = prisma.paymentTransaction.create;
      expect(createMock).toHaveBeenCalledTimes(1);
      const callData = (
        createMock.mock.calls[0] as [
          {
            data: {
              paymentId: string;
              type: PaymentTxType;
              status: PaymentTxStatus;
              amount: bigint;
            };
          },
        ]
      )[0].data;
      expect(callData.paymentId).toBe(mockPaymentId);
      expect(callData.type).toBe(PaymentTxType.PAYMENT_ATTEMPT);
      expect(callData.status).toBe(PaymentTxStatus.PENDING);
      expect(callData.amount).toBe(250000n);
      expect(response.paymentUrl).toContain('vpcpay.html');
      expect(response.nextAction).toBe('REDIRECT_TO_PAYMENT');
    });
  });

  describe('getByOrder', () => {
    it('allows order owner to view payment details', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: mockPaymentId,
        orderId: mockOrderId,
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.PENDING,
        amount: 300000n,
        currency: 'VND',
        provider: 'VNPAY',
        paidAt: null,
        failedAt: null,
        order: {
          id: mockOrderId,
          orderNumber: 'ORD-001',
          userId: mockUserId,
          status: OrderStatus.PENDING,
        },
        transactions: [],
      });

      const detail = await service.getByOrder(mockOrderId, mockUserId);
      expect(detail.id).toBe(mockPaymentId);
      expect(detail.amount).toBe('300000');
      expect(detail.canRetry).toBe(true);
    });

    it('allows staff with ADMIN or SALES_STAFF role to view payment details', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: mockPaymentId,
        orderId: mockOrderId,
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.PAID,
        amount: 300000n,
        currency: 'VND',
        provider: 'VNPAY',
        paidAt: new Date(),
        failedAt: null,
        order: {
          id: mockOrderId,
          orderNumber: 'ORD-001',
          userId: mockUserId, // Different user
          status: OrderStatus.CONFIRMED,
        },
        transactions: [],
      });

      const detail = await service.getByOrder(
        mockOrderId,
        'staff-id-1',
        'ADMIN',
      );
      expect(detail.id).toBe(mockPaymentId);
      expect(detail.status).toBe(PaymentStatus.PAID);
    });

    it('rejects another user from viewing payment details', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: mockPaymentId,
        orderId: mockOrderId,
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.PENDING,
        order: {
          id: mockOrderId,
          orderNumber: 'ORD-001',
          userId: mockUserId,
          status: OrderStatus.PENDING,
        },
        transactions: [],
      });

      await expect(
        service.getByOrder(mockOrderId, mockOtherUserId),
      ).rejects.toThrow('Bạn không có quyền xem');
    });
  });

  describe('handleReturn (UX-only)', () => {
    it('returns isValid: false when checksum fails and does not query payment', async () => {
      vnpayAdapter.verifyCallback.mockReturnValue({
        isValid: false,
        isSuccess: false,
        responseCode: '97',
      });

      const res = await service.handleReturn({ vnp_SecureHash: 'bad_hash' });
      expect(res.isValid).toBe(false);
      expect(prisma.paymentTransaction.findUnique).not.toHaveBeenCalled();
    });

    it('returns normalized success details without setting PAID', async () => {
      vnpayAdapter.verifyCallback.mockReturnValue({
        isValid: true,
        isSuccess: true,
        txnRef: 'PAY-ORD-001-XYZ',
        responseCode: '00',
        responseMessage: 'Giao dịch thành công',
      });

      prisma.paymentTransaction.findUnique.mockResolvedValue({
        attemptRef: 'PAY-ORD-001-XYZ',
        payment: {
          id: mockPaymentId,
          status: PaymentStatus.PENDING, // Still PENDING in DB!
          amount: 200000n,
          order: {
            id: mockOrderId,
            orderNumber: 'ORD-001',
          },
        },
      });

      const res = await service.handleReturn({
        vnp_TxnRef: 'PAY-ORD-001-XYZ',
        vnp_SecureHash: 'good_hash',
      });

      expect(res.isValid).toBe(true);
      expect(res.isSuccess).toBe(true);
      expect(res.paymentStatus).toBe(PaymentStatus.PENDING); // Not set to PAID!
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('handleIpn (Authoritative)', () => {
    it('verifies checksum FIRST: returns RspCode 97 immediately if invalid checksum', async () => {
      vnpayAdapter.verifyIpn.mockReturnValue({
        isValid: false,
        isSuccess: false,
      });

      const res = await service.handleIpn({
        vnp_SecureHash: 'invalid_hash',
      });

      expect(res.RspCode).toBe(IpnFailChecksum.RspCode);
      expect(res.Message).toBe(IpnFailChecksum.Message);
      expect(prisma.paymentTransaction.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns RspCode 01 when txnRef does not match any known attempt', async () => {
      vnpayAdapter.verifyIpn.mockReturnValue({
        isValid: true,
        isSuccess: true,
        txnRef: 'UNKNOWN-TXN-REF',
      });
      prisma.paymentTransaction.findUnique.mockResolvedValue(null);

      const res = await service.handleIpn({
        vnp_TxnRef: 'UNKNOWN-TXN-REF',
        vnp_SecureHash: 'valid',
      });

      expect(res.RspCode).toBe(IpnOrderNotFound.RspCode);
      expect(res.Message).toBe('Order not found');
    });

    it('returns RspCode 04 when callback amount does not match payment.amount * 100', async () => {
      vnpayAdapter.verifyIpn.mockReturnValue({
        isValid: true,
        isSuccess: true,
        txnRef: 'PAY-ORD-001',
      });

      prisma.paymentTransaction.findUnique.mockResolvedValue({
        attemptRef: 'PAY-ORD-001',
        payment: {
          id: mockPaymentId,
          amount: 200000n, // Expected 20000000
        },
      });

      const res = await service.handleIpn({
        vnp_TxnRef: 'PAY-ORD-001',
        vnp_Amount: '10000000', // Forged/mismatched amount
        vnp_SecureHash: 'valid',
      });

      expect(res.RspCode).toBe(IpnInvalidAmount.RspCode);
      expect(res.Message).toBe('Invalid amount');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns RspCode 02 (already confirmed) idempotently on duplicate IPN with same providerTransactionId', async () => {
      vnpayAdapter.verifyIpn.mockReturnValue({
        isValid: true,
        isSuccess: true,
        txnRef: 'PAY-ORD-001',
        providerTransactionId: 'VNPAY-TX-12345',
      });

      prisma.paymentTransaction.findUnique.mockResolvedValue({
        attemptRef: 'PAY-ORD-001',
        payment: {
          id: mockPaymentId,
          amount: 200000n,
        },
      });

      prisma.payment.findFirst.mockResolvedValue(null);

      // Simulate lock returning already PAID payment with same providerTransactionId
      prisma.$transaction.mockImplementation(
        async (cb: (tx: MockTxClient) => Promise<unknown>) => {
          const txMock: MockTxClient = {
            $queryRaw: jest.fn().mockResolvedValue([]),
            payment: {
              findUniqueOrThrow: jest.fn().mockResolvedValue({
                id: mockPaymentId,
                status: PaymentStatus.PAID,
                providerTransactionId: 'VNPAY-TX-12345',
              }),
              update: jest.fn(),
            },
            paymentTransaction: {
              create: jest.fn(),
            },
          };
          return await cb(txMock);
        },
      );

      const res = await service.handleIpn({
        vnp_TxnRef: 'PAY-ORD-001',
        vnp_Amount: '20000000',
        vnp_TransactionNo: 'VNPAY-TX-12345',
        vnp_SecureHash: 'valid',
      });

      expect(res.RspCode).toBe(IpnOrderAlreadyConfirmed.RspCode);
      expect(res.Message).toBe('Order already confirmed');
    });

    it('transitions Payment to PAID and appends ONLINE_PAYMENT_SUCCESS on valid IPN', async () => {
      vnpayAdapter.verifyIpn.mockReturnValue({
        isValid: true,
        isSuccess: true,
        txnRef: 'PAY-ORD-001',
        providerTransactionId: 'VNPAY-TX-99999',
        responseCode: '00',
        responseMessage: 'Giao dịch thành công',
      });

      prisma.paymentTransaction.findUnique.mockResolvedValue({
        attemptRef: 'PAY-ORD-001',
        payment: {
          id: mockPaymentId,
          amount: 200000n,
          order: {
            id: mockOrderId,
            status: OrderStatus.PENDING,
          },
        },
      });

      prisma.payment.findFirst.mockResolvedValue(null);

      let updatedPaymentData:
        { status?: PaymentStatus; providerTransactionId?: string } | undefined;
      let createdTxData:
        { type?: PaymentTxType; status?: PaymentTxStatus } | undefined;

      const orderUpdateMock = jest.fn().mockResolvedValue({ id: mockOrderId });
      const orderHistoryMock = jest.fn().mockResolvedValue({ id: 'history-1' });

      prisma.$transaction.mockImplementation(
        async (cb: (tx: MockTxClient) => Promise<unknown>) => {
          const txMock: MockTxClient = {
            $queryRaw: jest.fn().mockResolvedValue([]),
            payment: {
              findUniqueOrThrow: jest.fn().mockResolvedValue({
                id: mockPaymentId,
                status: PaymentStatus.PENDING,
              }),
              update: jest.fn().mockImplementation(
                (args: {
                  data: {
                    status?: PaymentStatus;
                    providerTransactionId?: string;
                  };
                }) => {
                  updatedPaymentData = args.data;
                  return Promise.resolve({ id: mockPaymentId, ...args.data });
                },
              ),
            },
            paymentTransaction: {
              create: jest
                .fn()
                .mockImplementation(
                  (args: {
                    data: { type?: PaymentTxType; status?: PaymentTxStatus };
                  }) => {
                    createdTxData = args.data;
                    return Promise.resolve({ id: 'tx-1', ...args.data });
                  },
                ),
            },
            order: {
              update: orderUpdateMock,
            },
            orderStatusHistory: {
              create: orderHistoryMock,
            },
          };
          return await cb(txMock);
        },
      );

      const res = await service.handleIpn({
        vnp_TxnRef: 'PAY-ORD-001',
        vnp_Amount: '20000000',
        vnp_TransactionNo: 'VNPAY-TX-99999',
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_SecureHash: 'valid',
      });

      expect(res.RspCode).toBe(IpnSuccess.RspCode);
      expect(res.Message).toBe('Confirm Success');

      expect(updatedPaymentData?.status).toBe(PaymentStatus.PAID);
      expect(updatedPaymentData?.providerTransactionId).toBe('VNPAY-TX-99999');
      expect(createdTxData?.type).toBe(PaymentTxType.ONLINE_PAYMENT_SUCCESS);
      expect(createdTxData?.status).toBe(PaymentTxStatus.SUCCESS);
      expect(orderUpdateMock).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: expect.any(Date),
        },
      });
      expect(orderHistoryMock).toHaveBeenCalledWith({
        data: {
          orderId: mockOrderId,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          note: expect.stringContaining('VNPAY-TX-99999'),
        },
      });
    });

    it('handles failure callback when PENDING: appends failure event and keeps monotonic', async () => {
      vnpayAdapter.verifyIpn.mockReturnValue({
        isValid: true,
        isSuccess: false, // Cancelled or failed on gateway
        txnRef: 'PAY-ORD-001',
        providerTransactionId: 'VNPAY-TX-FAIL',
        responseCode: '24', // Customer cancelled
        responseMessage: 'Khách hàng hủy giao dịch',
      });

      prisma.paymentTransaction.findUnique.mockResolvedValue({
        attemptRef: 'PAY-ORD-001',
        payment: {
          id: mockPaymentId,
          amount: 200000n,
        },
      });

      prisma.payment.findFirst.mockResolvedValue(null);

      let createdTxData:
        | {
            type?: PaymentTxType;
            status?: PaymentTxStatus;
            responseCode?: string;
          }
        | undefined;

      prisma.$transaction.mockImplementation(
        async (cb: (tx: MockTxClient) => Promise<unknown>) => {
          const txMock: MockTxClient = {
            $queryRaw: jest.fn().mockResolvedValue([]),
            payment: {
              findUniqueOrThrow: jest.fn().mockResolvedValue({
                id: mockPaymentId,
                status: PaymentStatus.PENDING,
              }),
              update: jest.fn(),
            },
            paymentTransaction: {
              create: jest.fn().mockImplementation(
                (args: {
                  data: {
                    type?: PaymentTxType;
                    status?: PaymentTxStatus;
                    responseCode?: string;
                  };
                }) => {
                  createdTxData = args.data;
                  return Promise.resolve({ id: 'tx-fail', ...args.data });
                },
              ),
            },
          };
          return await cb(txMock);
        },
      );

      const res = await service.handleIpn({
        vnp_TxnRef: 'PAY-ORD-001',
        vnp_Amount: '20000000',
        vnp_ResponseCode: '24',
        vnp_SecureHash: 'valid',
      });

      expect(res.RspCode).toBe(IpnSuccess.RspCode);
      expect(createdTxData?.type).toBe(PaymentTxType.ONLINE_PAYMENT_FAILED);
      expect(createdTxData?.status).toBe(PaymentTxStatus.FAILED);
      expect(createdTxData?.responseCode).toBe('24');
    });
  });
});
