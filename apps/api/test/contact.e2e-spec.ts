/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { createTestApplication } from './test-app.factory';

describe('Contact form (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  const runId = randomUUID();
  const customerEmail = `khach-${runId}@contact-e2e.test`;
  const ticketIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApplication();
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.emailOutbox.deleteMany({
      where: {
        OR: ticketIds.flatMap((ticketId) => [
          { dedupeKey: `CONTACT_MESSAGE:${ticketId}` },
          { dedupeKey: `CONTACT_RECEIVED:${ticketId}` },
        ]),
      },
    });
    await app.close();
  });

  it('accepts a public message and queues shop + customer emails', async () => {
    const response = await request(server)
      .post('/api/v1/contact')
      .send({
        fullName: '  Nguyễn Thu Trang  ',
        phone: '0988 123 456',
        email: customerEmail,
        topic: 'tu-van-size',
        message: 'Bé nhà mình 3 tuổi, nặng 14kg thì mặc size nào?',
      })
      .expect(201);

    const ticketId = String(response.body.ticketId);
    expect(ticketId).toMatch(/^LH-\d{6}-[A-HJ-NP-Z2-9]{6}$/);
    ticketIds.push(ticketId);

    const rows = await prisma.emailOutbox.findMany({
      where: { dedupeKey: { endsWith: ticketId } },
      orderBy: { dedupeKey: 'asc' },
    });
    expect(rows.map((row) => [row.template, row.toEmail])).toEqual([
      ['contact-message', process.env.CONTACT_INBOX_EMAIL],
      ['contact-received', customerEmail],
    ]);
    expect(rows[0].payload).toMatchObject({
      fullName: 'Nguyễn Thu Trang',
      phone: '0988123456',
      topic: 'tu-van-size',
    });
  });

  it('queues only the shop email when no customer email is given', async () => {
    const response = await request(server)
      .post('/api/v1/contact')
      .send({
        fullName: 'Khách ẩn danh',
        phone: '+84988123456',
        email: '',
        topic: 'gop-y-dich-vu',
        message: 'Giao hàng nhanh, đóng gói đẹp.',
      })
      .expect(201);

    const ticketId = String(response.body.ticketId);
    ticketIds.push(ticketId);

    const rows = await prisma.emailOutbox.findMany({
      where: { dedupeKey: { endsWith: ticketId } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].template).toBe('contact-message');
  });

  it('rejects invalid input without queueing emails', async () => {
    const before = await prisma.emailOutbox.count({
      where: { dedupeKey: { startsWith: 'CONTACT_' } },
    });

    await request(server)
      .post('/api/v1/contact')
      .send({
        fullName: 'A',
        phone: 'abc',
        email: 'khong-phai-email',
        topic: 'khong-ton-tai',
        message: '',
      })
      .expect(400);

    const after = await prisma.emailOutbox.count({
      where: { dedupeKey: { startsWith: 'CONTACT_' } },
    });
    expect(after).toBe(before);
  });
});
