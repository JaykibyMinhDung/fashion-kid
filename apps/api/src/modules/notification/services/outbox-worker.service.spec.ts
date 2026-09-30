/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OutboxWorkerService } from './outbox-worker.service';
import { OutboxService } from './outbox.service';
import { MailTemplateService } from './mail-template.service';
import { MAIL_PROVIDER } from '../domain/mail-provider.interface';

describe('OutboxWorkerService', () => {
  let worker: OutboxWorkerService;
  let outboxService: jest.Mocked<OutboxService>;
  let templateService: jest.Mocked<MailTemplateService>;
  let mailProvider: { send: jest.Mock };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OutboxWorkerService,
        {
          provide: OutboxService,
          useValue: {
            claimPending: jest.fn().mockResolvedValue([]),
            markSent: jest.fn().mockResolvedValue(undefined),
            markFailed: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MailTemplateService,
          useValue: {
            render: jest.fn().mockResolvedValue({
              subject: 'Test',
              html: '<p>test</p>',
              text: 'test',
            }),
          },
        },
        {
          provide: MAIL_PROVIDER,
          useValue: {
            send: jest.fn().mockResolvedValue({
              messageId: 'msg-1',
              accepted: ['test@x.com'],
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(20) },
        },
      ],
    }).compile();

    worker = module.get(OutboxWorkerService);
    outboxService = module.get(OutboxService);
    templateService = module.get(MailTemplateService);
    mailProvider = module.get(MAIL_PROVIDER);
  });

  it('should skip if no pending records', async () => {
    await worker.processOutbox();
    expect(outboxService.claimPending).toHaveBeenCalledWith(20);
    expect(templateService.render).not.toHaveBeenCalled();
  });

  it('should process and send pending records', async () => {
    outboxService.claimPending.mockResolvedValueOnce([
      {
        id: 'rec-1',
        dedupeKey: 'INVOICE_ISSUED:inv-1',
        toEmail: 'user@example.com',
        template: 'invoice-issued',
        payload: { invoiceId: 'inv-1' },
        status: 'PENDING',
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        lastError: null,
        sentAt: null,
        createdAt: new Date(),
      },
    ]);

    await worker.processOutbox();
    expect(templateService.render).toHaveBeenCalledWith('invoice-issued', {
      invoiceId: 'inv-1',
    });
    expect(mailProvider.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>test</p>',
      text: 'test',
    });
    expect(outboxService.markSent).toHaveBeenCalledWith('rec-1');
  });

  it('should mark failed on send error', async () => {
    outboxService.claimPending.mockResolvedValueOnce([
      {
        id: 'rec-2',
        dedupeKey: 'INVOICE_ISSUED:inv-2',
        toEmail: 'user@example.com',
        template: 'invoice-issued',
        payload: { invoiceId: 'inv-2' },
        status: 'PENDING',
        attempts: 2,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        lastError: null,
        sentAt: null,
        createdAt: new Date(),
      },
    ]);
    mailProvider.send.mockRejectedValueOnce(new Error('SMTP timeout'));

    await worker.processOutbox();
    expect(outboxService.markFailed).toHaveBeenCalledWith(
      'rec-2',
      'SMTP timeout',
      2,
      5,
    );
  });

  it('should prevent concurrent processing', async () => {
    outboxService.claimPending.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
    );
    const p1 = worker.processOutbox();
    const p2 = worker.processOutbox();
    await Promise.all([p1, p2]);
    expect(outboxService.claimPending).toHaveBeenCalledTimes(1);
  });
});
