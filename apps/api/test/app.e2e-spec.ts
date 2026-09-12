import {
  Body,
  Controller,
  Get,
  INestApplication,
  Post,
  Req,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { CurrentUser } from '../src/common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../src/common/auth/authenticated-user';
import { Public } from '../src/common/auth/public.decorator';
import { RequirePermissions } from '../src/authorization/require-permissions.decorator';
import { AccessTokenService } from '../src/common/security/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { createTestApplication } from './test-app.factory';

class ValidationProbeDto {
  @IsString()
  value!: string;
}

@Controller('__test')
class BootstrapProbeController {
  @Post('validation')
  @Public()
  validate(@Body() body: ValidationProbeDto): ValidationProbeDto {
    return body;
  }

  @Get('cookies')
  @Public()
  cookies(@Req() request: Request): Record<string, string> {
    return request.cookies as Record<string, string>;
  }

  @Get('protected')
  protected(@CurrentUser() user: AuthenticatedRequestUser) {
    return user;
  }

  @Get('admin')
  @RequirePermissions('AUDIT_READ')
  admin(@CurrentUser() user: AuthenticatedRequestUser) {
    return user;
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let accessTokenService: AccessTokenService;
  let authTestUserId: string;
  let authTestToken: string;
  const authTestEmail = `guard-${randomUUID()}@auth-guard.test`;

  beforeAll(async () => {
    app = await createTestApplication([BootstrapProbeController]);
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
    accessTokenService = app.get(AccessTokenService);
    const customerRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'CUSTOMER' },
    });
    const authTestUser = await prisma.user.create({
      data: {
        roleId: customerRole.id,
        email: authTestEmail,
        passwordHash: 'guard-test-hash',
        fullName: 'Guard Test User',
      },
    });
    authTestUserId = authTestUser.id;
    authTestToken = await accessTokenService.sign(authTestUser.id, 'CUSTOMER');
  });

  it('/ (GET)', () => {
    return request(server).get('/').expect(200).expect('Hello World!');
  });

  it('serves unprefixed live and ready health probes', async () => {
    await request(server)
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok', service: 'api' });
    await request(server)
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ok', service: 'api', database: 'up' });
  });

  it('preserves safe request ids and replaces unsafe ones', async () => {
    await request(server)
      .get('/')
      .set('x-request-id', 'e2e:request-123')
      .expect('x-request-id', 'e2e:request-123')
      .expect(200);

    const replaced = await request(server)
      .get('/api/v1/__test/protected')
      .set('x-request-id', 'unsafe request id')
      .expect(401);
    expect(replaced.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/,
    );
    expect(replaced.body).toEqual(
      expect.objectContaining({
        code: 'INVALID_SESSION',
        requestId: replaced.headers['x-request-id'],
      }),
    );
  });

  it('uses whitelist validation and rejects unknown fields', async () => {
    await request(server)
      .post('/api/v1/__test/validation')
      .send({ value: 'valid', unexpected: true })
      .expect(400);
  });

  it('parses cookies with the runtime middleware', async () => {
    await request(server)
      .get('/api/v1/__test/cookies')
      .set('Cookie', 'probe=parsed')
      .expect(200)
      .expect({ probe: 'parsed' });
  });

  it('allows only the configured web origin with credentials', async () => {
    await request(server)
      .options('/')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET')
      .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect(204);

    const disallowed = await request(server)
      .options('/')
      .set('Origin', 'https://attacker.example')
      .set('Access-Control-Request-Method', 'GET')
      .expect(404);
    expect(disallowed.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serves Swagger from the shared bootstrap', () => {
    return request(server).get('/api/docs').expect(200);
  });

  it('adds baseline security headers', async () => {
    const response = await request(server).get('/').expect(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  it('enforces protected and role routes from current database state', async () => {
    await request(server)
      .get('/api/v1/__test/protected')
      .expect(401)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ code: 'INVALID_SESSION' }),
        );
      });

    await request(server)
      .get('/api/v1/__test/protected')
      .set('Authorization', `Bearer ${authTestToken}`)
      .expect(200)
      .expect({ id: authTestUserId, role: 'CUSTOMER' });
    await request(server)
      .get('/api/v1/__test/admin')
      .set('Authorization', `Bearer ${authTestToken}`)
      .expect(403);

    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'ADMIN' },
    });
    await prisma.user.update({
      where: { id: authTestUserId },
      data: { roleId: adminRole.id },
    });
    await request(server)
      .get('/api/v1/__test/admin')
      .set('Authorization', `Bearer ${authTestToken}`)
      .expect(200)
      .expect({ id: authTestUserId, role: 'ADMIN' });

    await prisma.user.update({
      where: { id: authTestUserId },
      data: { status: 'DISABLED' },
    });
    await request(server)
      .get('/api/v1/__test/protected')
      .set('Authorization', `Bearer ${authTestToken}`)
      .expect(401);
  });

  it('rate-limits login by IP plus canonical email with Retry-After', async () => {
    const email = `rate-limit-${randomUUID()}@auth-rate.test`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'incorrect password' })
        .expect(401);
    }

    const limited = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: ` ${email.toUpperCase()} `,
        password: 'incorrect password',
      })
      .expect(429);
    expect(limited.headers['retry-after']).toMatch(/^\d+$/);
    expect(limited.body).toEqual(
      expect.objectContaining({
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau',
      }),
    );
    expect(typeof (limited.body as { requestId?: unknown }).requestId).toBe(
      'string',
    );
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: authTestEmail } });
    await app.close();
  });
});
