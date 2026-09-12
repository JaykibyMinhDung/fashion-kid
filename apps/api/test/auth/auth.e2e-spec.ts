import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { createTestApplication } from '../test-app.factory';

type AuthResponseBody = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
  };
};

function bodyAsAuthResponse(body: unknown): AuthResponseBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Expected an authentication response object');
  }
  return body as AuthResponseBody;
}

function setCookieHeaders(headers: Record<string, unknown>): string[] {
  const value = headers['set-cookie'];
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }
  throw new Error('Expected Set-Cookie response header');
}

function cookiePair(headers: Record<string, unknown>): string {
  const pair = setCookieHeaders(headers)[0]?.split(';')[0];
  if (!pair) {
    throw new Error('Expected refresh cookie pair');
  }
  return pair;
}

describe('Auth HTTP contract (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  const runId = randomUUID();
  const email = `auth-http-${runId}@auth-e2e.test`;
  const originalPassword = 'a unique original passphrase for auth e2e';
  const changedPassword = 'a unique changed passphrase for auth e2e';
  let userId: string | undefined;

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (userId) {
      await prisma.auditLog.deleteMany({ where: { entityId: userId } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('runs the six-endpoint session lifecycle with rotation and revocation', async () => {
    const registration = await request(server)
      .post('/api/v1/auth/register')
      .send({
        fullName: '  Auth HTTP User  ',
        email: ` ${email.toUpperCase()} `,
        phone: '+84 901-234-567',
        password: originalPassword,
        remember: false,
      })
      .expect(201);
    const registered = bodyAsAuthResponse(registration.body);
    userId = registered.user.id;

    expect(registered.accessToken).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(registered.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect({
      ...registered,
      accessToken: '<jwt>',
      user: { ...registered.user, id: '<uuid>' },
    }).toEqual({
      accessToken: '<jwt>',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: '<uuid>',
        email,
        fullName: 'Auth HTTP User',
        phone: '+84901234567',
        avatarUrl: null,
        role: 'CUSTOMER',
      },
    });
    expect(registered.user).not.toHaveProperty('passwordHash');
    const registrationCookie = setCookieHeaders(registration.headers)[0] ?? '';
    expect(registrationCookie).toContain('kf_refresh=');
    expect(registrationCookie).toContain('HttpOnly');
    expect(registrationCookie).toContain('SameSite=Strict');
    expect(registrationCookie).not.toContain('Max-Age=');
    const originalCookie = cookiePair(registration.headers);

    await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(200)
      .expect(registered.user);

    const refreshedResponse = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(200);
    const refreshed = bodyAsAuthResponse(refreshedResponse.body);
    const rotatedCookie = cookiePair(refreshedResponse.headers);
    expect(refreshed.accessToken).not.toBe(registered.accessToken);
    expect(rotatedCookie).not.toBe(originalCookie);

    const replay = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(401);
    expect(replay.body).toEqual(
      expect.objectContaining({ code: 'INVALID_SESSION' }),
    );
    await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedCookie)
      .expect(401);

    const wrongCredentials = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'a wrong but plausible password' })
      .expect(401);
    expect(wrongCredentials.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không hợp lệ',
      }),
    );
    expect(
      typeof (wrongCredentials.body as { requestId?: unknown }).requestId,
    ).toBe('string');

    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: originalPassword, remember: true })
      .expect(200);
    const loggedIn = bodyAsAuthResponse(loginResponse.body);
    const persistentCookieHeader =
      setCookieHeaders(loginResponse.headers)[0] ?? '';
    expect(persistentCookieHeader).toContain('Max-Age=');
    expect(persistentCookieHeader).toContain('Expires=');

    const changePasswordResponse = await request(server)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${loggedIn.accessToken}`)
      .set('Cookie', cookiePair(loginResponse.headers))
      .send({
        currentPassword: originalPassword,
        newPassword: changedPassword,
      })
      .expect(204);
    expect(setCookieHeaders(changePasswordResponse.headers)[0]).toContain(
      'kf_refresh=;',
    );
    await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loggedIn.accessToken}`)
      .expect(401);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: originalPassword })
      .expect(401);

    const changedLoginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: changedPassword })
      .expect(200);
    const changedLogin = bodyAsAuthResponse(changedLoginResponse.body);
    const logoutResponse = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookiePair(changedLoginResponse.headers))
      .expect(204);
    expect(setCookieHeaders(logoutResponse.headers)[0]).toContain(
      'kf_refresh=;',
    );
    await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair(changedLoginResponse.headers))
      .expect(401);
    await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${changedLogin.accessToken}`)
      .expect(401);
  });

  it('rejects unknown request fields and documents all auth operations', async () => {
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: changedPassword, role: 'ADMIN' })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        );
      });

    const swagger = await request(server).get('/api/docs-json').expect(200);
    const document = swagger.body as { paths?: Record<string, unknown> };
    expect(Object.keys(document.paths ?? {})).toEqual(
      expect.arrayContaining([
        '/api/v1/auth/register',
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout',
        '/api/v1/auth/me',
        '/api/v1/auth/change-password',
      ]),
    );
  });

  it('rejects browser Auth requests from an untrusted origin', async () => {
    const response = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://attacker.example')
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Nguồn yêu cầu không được phép',
      }),
    );
    expect(typeof (response.body as { requestId?: unknown }).requestId).toBe(
      'string',
    );
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
