/* eslint-disable @typescript-eslint/unbound-method -- assertions intentionally inspect Jest method doubles */
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { SessionCookieService } from '../../common/security/session-cookie.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { AuthOperationResult } from './auth.service';

const USER = {
  id: '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
  email: 'user@example.com',
  fullName: 'Test User',
  phone: null,
  avatarUrl: null,
  role: 'CUSTOMER' as const,
};

function request(
  cookies: Record<string, string | undefined> = {},
): Request & { cookies: Record<string, string | undefined> } {
  return {
    ip: '127.0.0.1',
    cookies,
    requestId: 'controller-request',
    header: (name: string) => {
      const headers: Record<string, string> = {
        'x-request-id': 'controller-request',
        'user-agent': 'controller-test-agent',
      };
      return headers[name.toLowerCase()];
    },
  } as unknown as Request & {
    cookies: Record<string, string | undefined>;
  };
}

describe('AuthController', () => {
  let authService: jest.Mocked<AuthService>;
  let cookieService: SessionCookieService;
  let controller: AuthController;
  let response: Response;
  let cookie: jest.Mock;
  let clearCookie: jest.Mock;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      me: jest.fn(),
      changePassword: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;
    cookieService = new SessionCookieService(
      new ConfigService({ NODE_ENV: 'test', COOKIE_SECURE: false }),
    );
    controller = new AuthController(authService, cookieService);
    cookie = jest.fn();
    clearCookie = jest.fn();
    response = { cookie, clearCookie } as unknown as Response;
  });

  it('sets the refresh cookie only after login succeeds', async () => {
    const expiresAt = new Date(Date.now() + 86_400_000);
    const result: AuthOperationResult = {
      session: {
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: USER,
      },
      refreshSession: {
        token: 'opaque-refresh-token',
        expiresAt,
        isPersistent: true,
      },
    };
    authService.login.mockResolvedValueOnce(result);

    const body = await controller.login(
      {
        email: 'user@example.com',
        password: 'submitted password remains exact',
        remember: true,
      },
      request(),
      response,
    );

    expect(body).toBe(result.session);
    expect(cookie).toHaveBeenCalledWith(
      'kf_refresh',
      'opaque-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        expires: expiresAt,
      }),
    );
  });

  it('clears the cookie when refresh fails', async () => {
    authService.refresh.mockRejectedValueOnce(new Error('invalid refresh'));

    await expect(
      controller.refresh(
        request({ kf_refresh: 'malformed-refresh' }),
        response,
      ),
    ).rejects.toThrow('invalid refresh');
    expect(clearCookie).toHaveBeenCalledWith('kf_refresh', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    });
  });

  it('returns no body and clears the cookie for idempotent logout', async () => {
    authService.logout.mockResolvedValueOnce(undefined);

    await expect(
      controller.logout(request(), response),
    ).resolves.toBeUndefined();
    expect(authService.logout).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ requestId: 'controller-request' }),
    );
    expect(clearCookie).toHaveBeenCalledTimes(1);
  });

  it('returns no body and clears the cookie after a password change', async () => {
    authService.changePassword.mockResolvedValueOnce(undefined);

    await expect(
      controller.changePassword(
        { id: USER.id, role: USER.role },
        {
          currentPassword: 'submitted current password',
          newPassword: 'a new sufficiently long password',
        },
        request(),
        response,
      ),
    ).resolves.toBeUndefined();
    expect(clearCookie).toHaveBeenCalledTimes(1);
  });

  it('delegates me with the authenticated user id', async () => {
    authService.me.mockResolvedValueOnce(USER);

    await expect(
      controller.me({ id: USER.id, role: USER.role }),
    ).resolves.toEqual(USER);
    expect(authService.me).toHaveBeenCalledWith(USER.id);
  });
});
