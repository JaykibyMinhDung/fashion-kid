/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import { OutboxService } from './outbox.service';
import { OutboxRepository } from '../repositories/outbox.repository';

describe('OutboxService', () => {
  let service: OutboxService;
  let repository: jest.Mocked<OutboxRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: OutboxRepository,
          useValue: {
            enqueue: jest.fn().mockResolvedValue(undefined),
            claimPending: jest.fn().mockResolvedValue([]),
            markSent: jest.fn().mockResolvedValue(undefined),
            markFailed: jest.fn().mockResolvedValue(undefined),
            markPermanentlyFailed: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(OutboxService);
    repository = module.get(OutboxRepository);
  });

  it('should enqueue a command', async () => {
    const tx = {} as any;
    const command = {
      dedupeKey: 'INVOICE_ISSUED:123',
      toEmail: 'test@example.com',
      template: 'invoice-issued' as const,
      payload: { invoiceId: '123' },
    };
    await service.enqueue(tx, command);
    expect(repository.enqueue).toHaveBeenCalledWith(tx, command);
  });

  it('should mark as permanently failed when attempts >= maxAttempts', async () => {
    await service.markFailed('id-1', 'SMTP error', 5, 5);
    expect(repository.markPermanentlyFailed).toHaveBeenCalledWith(
      'id-1',
      'SMTP error',
    );
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it('should mark as failed with backoff when attempts < maxAttempts', async () => {
    await service.markFailed('id-1', 'SMTP error', 2, 5);
    expect(repository.markFailed).toHaveBeenCalledWith(
      'id-1',
      'SMTP error',
      expect.any(Date),
    );
    expect(repository.markPermanentlyFailed).not.toHaveBeenCalled();
  });

  it('should claim pending records', async () => {
    await service.claimPending(10);
    expect(repository.claimPending).toHaveBeenCalledWith(10);
  });

  it('should mark sent', async () => {
    await service.markSent('id-1');
    expect(repository.markSent).toHaveBeenCalledWith('id-1', expect.any(Date));
  });
});
