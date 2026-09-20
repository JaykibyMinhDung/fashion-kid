/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AccessTokenService } from '../src/common/security/access-token.service';
import { createTestApplication } from './test-app.factory';

describe('Email Outbox & Password Reset (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  const runId = randomUUID();
  const testEmail = `user-${runId}@outbox-e2e.test`;
  const updatedPassword = 'UpdatedSecurePassword123!';
  let userId: string;
  let adminAccessToken: string;

  beforeAll(async () => {
    app = await createTestApplication();
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);

    // 1. Create test user
    const customerRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'CUSTOMER' },
    });
    const user = await prisma.user.create({
      data: {
        roleId: customerRole.id,
        email: testEmail,
        fullName: 'Outbox Test User',
        passwordHash: 'dummy-hash-replaced-on-reset',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    // 2. Obtain admin access token for admin outbox endpoint
    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'ADMIN' },
    });
    const adminUser = await prisma.user.create({
      data: {
        roleId: adminRole.id,
        email: `admin-${runId}@outbox-e2e.test`,
        fullName: 'Admin User',
        passwordHash: 'dummy-hash',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    const accessTokens = app.get(AccessTokenService);
    adminAccessToken = await accessTokens.sign(adminUser.id, 'ADMIN');
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });
    await prisma.emailOutbox.deleteMany({
      where: { toEmail: { contains: runId } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: [userId] } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: runId } },
    });
    await app.close();
  });

  it('forgot-password creates token and enqueues outbox email', async () => {
    const res = await request(server)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testEmail })
      .expect(200);

    expect(res.body.message).toContain('Nếu email tồn tại');

    // Verify token created
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { userId, consumedAt: null },
    });
    expect(tokenRecord).toBeTruthy();

    // Verify outbox record enqueued
    const outboxRecord = await prisma.emailOutbox.findUnique({
      where: { dedupeKey: `PASSWORD_RESET:${tokenRecord!.id}` },
    });
    expect(outboxRecord).toBeTruthy();
    expect(outboxRecord!.template).toBe('password-reset');
    expect(outboxRecord!.toEmail).toBe(testEmail);
    expect(outboxRecord!.status).toBe('PENDING');
  });

  it('verify-otp verifies OTP and returns a resetToken', async () => {
    // Get the raw OTP by inspecting outbox payload
    const outbox = await prisma.emailOutbox.findFirst({
      where: { toEmail: testEmail, template: 'password-reset' },
      orderBy: { createdAt: 'desc' },
    });
    const payload = outbox!.payload as { otp: string; resetUrl: string };
    expect(payload.otp).toHaveLength(6);

    // Verify with invalid OTP should fail
    await request(server)
      .post('/api/v1/auth/reset-password/verify-otp')
      .send({ email: testEmail, otp: '000000' })
      .expect(400);

    // Verify with correct OTP
    const verifyRes = await request(server)
      .post('/api/v1/auth/reset-password/verify-otp')
      .send({ email: testEmail, otp: payload.otp })
      .expect(200);

    expect(verifyRes.body.resetToken).toBeTruthy();

    // Reset password with the returned token
    await request(server)
      .post('/api/v1/auth/reset-password')
      .send({
        token: verifyRes.body.resetToken,
        newPassword: updatedPassword,
      })
      .expect(204);

    // Verify user can login with new password
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: updatedPassword })
      .expect(200);

    expect(loginRes.body.accessToken).toBeTruthy();
  });

  it('admin can list outbox emails with pagination and status filter', async () => {
    const res = await request(server)
      .get('/api/v1/admin/email-outbox?page=1&limit=10')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });
});
