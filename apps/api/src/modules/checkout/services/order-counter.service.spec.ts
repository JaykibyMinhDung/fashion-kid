import { OrderCounterService } from './order-counter.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';

describe('OrderCounterService', () => {
  let service: OrderCounterService;

  beforeEach(() => {
    service = new OrderCounterService();
  });

  it('formats order numbers with ORD-YYYYMMDD-XXXXXX pattern', async () => {
    const mockTx = {
      $queryRaw: jest.fn().mockResolvedValue([{ last_value: 42 }]),
    } as unknown as PrismaTransactionClient;

    const fixedDate = new Date('2026-09-07T10:00:00.000Z');
    const orderNumber = await service.generateOrderNumber(mockTx, fixedDate);

    expect(orderNumber).toBe('ORD-20260907-000042');
    expect(mockTx.$queryRaw).toHaveBeenCalled();
  });

  it('pads sequence to 6 digits correctly', async () => {
    const mockTx = {
      $queryRaw: jest.fn().mockResolvedValue([{ last_value: 1 }]),
    } as unknown as PrismaTransactionClient;

    const fixedDate = new Date('2026-12-31T23:59:59.000Z');
    const orderNumber = await service.generateOrderNumber(mockTx, fixedDate);

    expect(orderNumber).toBe('ORD-20270101-000001');
  });
});
