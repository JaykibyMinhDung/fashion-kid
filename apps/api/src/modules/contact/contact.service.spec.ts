import { HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ApiException } from '../../common/errors/api-error';
import type { PrismaService } from '../../database/prisma/prisma.service';
import type { OutboxService } from '../notification/services/outbox.service';
import { ContactService, createContactTicketId } from './contact.service';
import type { ContactMessageDto } from './dto/contact-message.dto';

const baseInput: ContactMessageDto = {
  fullName: 'Nguyễn Thu Trang',
  phone: '0988123456',
  email: 'trang@example.com',
  topic: 'doi-tra-hang',
  message: 'Mình muốn đổi size áo cho bé.',
};

function createService(inboxEmail: string | undefined) {
  const tx = { marker: 'tx' };
  const prisma = {
    $transaction: jest.fn((callback: (client: unknown) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const outbox = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue(inboxEmail) };
  const service = new ContactService(
    prisma as unknown as PrismaService,
    outbox as unknown as OutboxService,
    config as unknown as ConfigService,
  );
  return { service, prisma, outbox, tx };
}

describe('createContactTicketId', () => {
  it('uses the Vietnam calendar date and an unambiguous random suffix', () => {
    // 20:00 UTC ngày 24/09 = 03:00 ngày 25/09 giờ Việt Nam
    const ticketId = createContactTicketId(new Date('2026-09-24T20:00:00Z'));
    expect(ticketId).toMatch(/^LH-260925-[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe('ContactService', () => {
  it('queues a shop notification and a customer confirmation in one transaction', async () => {
    const { service, prisma, outbox, tx } = createService('cskh@mamnho.test');

    const result = await service.submit(baseInput);

    expect(result.ticketId).toMatch(/^LH-\d{6}-[A-HJ-NP-Z2-9]{6}$/);
    expect(Number.isNaN(Date.parse(result.receivedAt))).toBe(false);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledTimes(2);
    expect(outbox.enqueue).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        dedupeKey: `CONTACT_MESSAGE:${result.ticketId}`,
        toEmail: 'cskh@mamnho.test',
        template: 'contact-message',
        payload: expect.objectContaining({
          ticketId: result.ticketId,
          fullName: 'Nguyễn Thu Trang',
          topicLabel: 'Hỗ trợ đổi trả đơn hàng',
          email: 'trang@example.com',
        }) as unknown,
      }),
    );
    expect(outbox.enqueue).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        dedupeKey: `CONTACT_RECEIVED:${result.ticketId}`,
        toEmail: 'trang@example.com',
        template: 'contact-received',
      }),
    );
  });

  it('only notifies the shop when the customer leaves no email', async () => {
    const { service, outbox } = createService('cskh@mamnho.test');

    await service.submit({ ...baseInput, email: undefined });

    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        template: 'contact-message',
        payload: expect.objectContaining({ email: null }) as unknown,
      }),
    );
  });

  it('returns 503 without queueing anything when the inbox is not configured', async () => {
    const { service, prisma, outbox } = createService(undefined);

    const error = await service.submit(baseInput).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});
