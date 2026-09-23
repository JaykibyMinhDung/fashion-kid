/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus } from '../../../generated/prisma/client';
import { ApiException } from '../../../common/errors/api-error';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoiceService } from './invoice.service';
import { TaxConfigService } from './tax-config.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let mockInvoiceRepo: jest.Mocked<InvoiceRepository>;
  let mockNumberService: jest.Mocked<InvoiceNumberService>;
  let taxConfigService: TaxConfigService;

  beforeEach(() => {
    mockInvoiceRepo = {
      findByOrderId: jest.fn(),
      findById: jest.fn(),
      findByInvoiceNumber: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      findManyAdmin: jest.fn(),
    };

    mockNumberService = {
      generateInvoiceNumber: jest.fn().mockResolvedValue('INV-202609-000001'),
    };

    const configService = new ConfigService({
      VAT_DEFAULT_RATE_BPS: '800',
    });
    taxConfigService = new TaxConfigService(configService);

    service = new InvoiceService(
      mockInvoiceRepo,
      mockNumberService,
      taxConfigService,
    );
  });

  describe('issueForOrder', () => {
    it('issues an invoice for order and computes tax correctly', async () => {
      const mockTx = {
        invoice: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        order: {
          update: jest.fn().mockResolvedValue({}),
        },
      } as any;

      const order: any = {
        id: 'order-123',
        orderNumber: 'ORD-20260916-000001',
        totalAmount: 1080000n,
        currency: 'VND',
        receiverName: 'Nguyễn Văn A',
        receiverPhone: '0901234567',
        shippingAddressLine: '123 Đội Cấn',
        shippingWardName: 'Liễu Giai',
        shippingProvinceName: 'Hà Nội',
        createdAt: new Date(),
        user: { email: 'a@example.com' },
      };

      mockInvoiceRepo.create.mockResolvedValue({
        id: 'inv-123',
        orderId: 'order-123',
        invoiceNumber: 'INV-202609-000001',
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
        voidedAt: null,
        currency: 'VND',
        netAmount: 1000000n,
        taxRateBps: 800,
        taxAmount: 80000n,
        grossAmount: 1080000n,
        sellerSnapshot: {},
        buyerSnapshot: {},
        createdAt: new Date(),
      });

      const result = await service.issueForOrder(mockTx, order);

      expect(result.invoiceNumber).toBe('INV-202609-000001');
      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          invoiceNumber: 'INV-202609-000001',
          netAmount: 1000000n,
          taxAmount: 80000n,
          grossAmount: 1080000n,
          taxRateBps: 800,
        }),
        mockTx,
      );
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-123' },
          data: {
            taxRateBps: 800,
            taxAmount: 80000n,
            netAmount: 1000000n,
          },
        }),
      );
    });

    it('is idempotent: returns existing invoice if already issued', async () => {
      const existingInvoice = {
        id: 'inv-existing',
        orderId: 'order-123',
        invoiceNumber: 'INV-202609-000001',
      };
      const mockTx = {
        invoice: {
          findUnique: jest.fn().mockResolvedValue(existingInvoice),
        },
      } as any;

      const order: any = { id: 'order-123' };
      const result = await service.issueForOrder(mockTx, order);

      expect(result).toBe(existingInvoice);
      expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('voidForOrder', () => {
    it('updates invoice status to VOID and sets voidedAt', async () => {
      const mockTx = {
        invoice: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'inv-123',
            status: InvoiceStatus.ISSUED,
          }),
          update: jest.fn().mockResolvedValue({
            id: 'inv-123',
            invoiceNumber: 'INV-202609-000001',
            status: InvoiceStatus.VOID,
          }),
        },
      } as any;

      const result = await service.voidForOrder(mockTx, 'order-123');

      expect(mockTx.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-123' },
          data: expect.objectContaining({ status: InvoiceStatus.VOID }),
        }),
      );
      expect(result?.status).toBe(InvoiceStatus.VOID);
    });
  });

  describe('getForOwner (Anti-IDOR)', () => {
    it('returns invoice detail when user is the owner', async () => {
      const mockInvoice: any = {
        id: 'inv-123',
        orderId: 'order-123',
        invoiceNumber: 'INV-202609-000001',
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
        netAmount: 1000000n,
        taxRateBps: 800,
        taxAmount: 80000n,
        grossAmount: 1080000n,
        sellerSnapshot: { name: 'Jaykiby' },
        buyerSnapshot: { receiverName: 'Nguyễn Văn A' },
        order: {
          userId: 'user-owner',
          orderNumber: 'ORD-1',
          itemsSubtotal: 1080000n,
          discountAmount: 0n,
          shippingFee: 0n,
          receiverName: 'Nguyễn Văn A',
          items: [],
        },
      };

      mockInvoiceRepo.findByOrderId.mockResolvedValue(mockInvoice);

      const result = await service.getForOwner('order-123', 'user-owner');
      expect(result.invoiceNumber).toBe('INV-202609-000001');
      expect(result.taxRatePercent).toBe(8);
    });

    it('throws 404 NOT_FOUND when accessed by non-owner (Anti-IDOR)', async () => {
      const mockInvoice: any = {
        id: 'inv-123',
        order: { userId: 'user-owner' },
      };
      mockInvoiceRepo.findByOrderId.mockResolvedValue(mockInvoice);

      await expect(
        service.getForOwner('order-123', 'user-attacker'),
      ).rejects.toThrow(ApiException);
    });
  });
});
