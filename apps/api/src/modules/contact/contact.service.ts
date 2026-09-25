import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { ApiException } from '../../common/errors/api-error';
import { PrismaService } from '../../database/prisma/prisma.service';
import { OutboxService } from '../notification/services/outbox.service';
import { CONTACT_TOPICS } from './contact.constants';
import type {
  ContactMessageDto,
  ContactSubmissionResponseDto,
} from './dto/contact-message.dto';

const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Mã phiếu dễ đọc: LH-yyMMdd-XXXXXX (bỏ ký tự dễ nhầm 0/O, 1/I). */
export function createContactTicketId(now: Date): string {
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const datePart = vn.toISOString().slice(2, 10).replace(/-/g, '');
  const bytes = randomBytes(6);
  const randomPart = Array.from(
    bytes,
    (byte) => TICKET_ALPHABET[byte % TICKET_ALPHABET.length],
  ).join('');
  return `LH-${datePart}-${randomPart}`;
}

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Ghi nhận tin nhắn liên hệ: xếp email thông báo tới hộp thư CSKH của shop
   * (CONTACT_INBOX_EMAIL) và — nếu khách có nhập email — email xác nhận cho khách.
   * Hai email cùng một transaction nên hoặc cả hai được xếp hàng, hoặc không cái nào.
   */
  async submit(
    input: ContactMessageDto,
  ): Promise<ContactSubmissionResponseDto> {
    const inboxEmail = this.configService.get<string>('CONTACT_INBOX_EMAIL');
    if (!inboxEmail) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_UNAVAILABLE',
        'Kênh liên hệ trực tuyến tạm thời chưa sẵn sàng. Vui lòng gọi hotline 1900 6868.',
      );
    }

    const receivedAt = new Date();
    const ticketId = createContactTicketId(receivedAt);
    const payload = {
      ticketId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email ?? null,
      topic: input.topic,
      topicLabel: CONTACT_TOPICS[input.topic],
      message: input.message,
      receivedAt: receivedAt.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
    };

    await this.prisma.$transaction(async (tx) => {
      await this.outboxService.enqueue(tx, {
        dedupeKey: `CONTACT_MESSAGE:${ticketId}`,
        toEmail: inboxEmail,
        template: 'contact-message',
        payload,
      });
      if (input.email) {
        await this.outboxService.enqueue(tx, {
          dedupeKey: `CONTACT_RECEIVED:${ticketId}`,
          toEmail: input.email,
          template: 'contact-received',
          payload,
        });
      }
    });

    return { ticketId, receivedAt: receivedAt.toISOString() };
  }
}
