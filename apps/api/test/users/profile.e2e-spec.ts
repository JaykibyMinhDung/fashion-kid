import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../../src/common/security/access-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { createTestApplication } from '../test-app.factory';

describe('Profile API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let userId: string;
  let accessToken: string;
  const email = `profile-${randomUUID()}@profile.test`;

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
    const customerRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'CUSTOMER' },
    });
    const user = await prisma.user.create({
      data: {
        roleId: customerRole.id,
        email,
        passwordHash: 'profile-e2e-password-hash',
        fullName: 'Profile Test User',
      },
    });
    userId = user.id;
    accessToken = await app.get(AccessTokenService).sign(user.id, 'CUSTOMER');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('protects the endpoint and returns only the current profile projection', async () => {
    await request(server).get('/api/v1/me').expect(401);

    const response = await request(server)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as Record<string, unknown>;

    expect(body).toEqual(
      expect.objectContaining({
        id: userId,
        email,
        fullName: 'Profile Test User',
        phone: null,
        avatarUrl: null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      }),
    );
    expect(typeof body.createdAt).toBe('string');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('roleId');
    expect(body).not.toHaveProperty('refreshTokens');
  });

  it('updates only editable fields and persists normalized values', async () => {
    const response = await request(server)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: '  Updated Profile User  ',
        phone: ' 00 84 901-234-567 ',
        avatarUrl: ' https://cdn.example.com/avatar.png ',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: userId,
        email,
        fullName: 'Updated Profile User',
        phone: '+84901234567',
        avatarUrl: 'https://cdn.example.com/avatar.png',
      }),
    );
    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ).resolves.toEqual(
      expect.objectContaining({
        email,
        fullName: 'Updated Profile User',
        phone: '+84901234567',
        avatarUrl: 'https://cdn.example.com/avatar.png',
      }),
    );
  });

  it('rejects mass assignment without applying any partial update', async () => {
    await request(server)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Must Not Be Applied',
        email: 'attacker@example.com',
        role: 'ADMIN',
        status: 'DISABLED',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        );
      });

    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ).resolves.toEqual(
      expect.objectContaining({
        email,
        fullName: 'Updated Profile User',
        status: 'ACTIVE',
      }),
    );
  });

  it.each([
    { fullName: ' ' },
    { phone: 'invalid-phone' },
    { avatarUrl: 'javascript:alert(1)' },
  ])('rejects invalid profile input %#', async (body) => {
    await request(server)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(body)
      .expect(400);
  });

  it('documents both self-profile operations under the versioned API', async () => {
    const response = await request(server).get('/api/docs-json').expect(200);
    const document = response.body as { paths?: Record<string, unknown> };

    expect(document.paths).toHaveProperty('/api/v1/me');
  });
});
