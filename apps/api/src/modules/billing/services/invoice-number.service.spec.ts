/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { InvoiceNumberService } from './invoice-number.service';

describe('InvoiceNumberService', () => {
  let service: InvoiceNumberService;

  beforeEach(() => {
    service = new InvoiceNumberService();
  });

  it('generates invoice number in INV-YYYYMM-NNNNNN format', async () => {
    const mockTx = {
      $queryRaw: jest.fn().mockResolvedValue([{ last_value: 42 }]),
    } as any;

    const testDate = new Date('2026-09-16T10:00:00.000Z');
    const result = await service.generateInvoiceNumber(mockTx, testDate);

    expect(result).toBe('INV-202609-000042');
    expect(mockTx.$queryRaw).toHaveBeenCalled();
  });

  it('pads sequence with 6 digits', async () => {
    const mockTx = {
      $queryRaw: jest.fn().mockResolvedValue([{ last_value: 1 }]),
    } as any;

    const testDate = new Date('2026-01-01T00:00:00.000Z');
    const result = await service.generateInvoiceNumber(mockTx, testDate);

    expect(result).toBe('INV-202601-000001');
  });
});
