/* eslint-disable @typescript-eslint/unbound-method -- assertions intentionally inspect Jest method doubles */
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AccessTokenService } from '../security/access-token.service';
import { AuthRepository } from '../../modules/auth/repositories/auth.repository';
import type { AuthUserRecord } from '../../modules/auth/auth.types';
import { AccessAuthGuard } from './access-auth.guard';

const USER: AuthUserRecord = {
  id: '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
  email: 'user@example.com',
  passwordHash: 'not-public',
  fullName: 'Test User',
  phone: null,
  avatarUrl: null,
  status: 'ACTIVE',
  authVersion: 0,
  role: 'ADMIN',
};

function createRequest(authorization?: string): Request & { user?: unknown } {
  return {
    header: (name: string) =>
      name.toLowerCase() === 'authorization' ? authorization : undefined,
  } as unknown as Request & { user?: unknown };
}

function createContext(request: Request): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AccessAuthGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let tokenService: jest.Mocked<AccessTokenService>;
  let repository: jest.Mocked<AuthRepository>;
  let guard: AccessAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;
    tokenService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<AccessTokenService>;
    repository = {
      findUserById: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    guard = new AccessAuthGuard(reflector, tokenService, repository);
  });

  it('bypasses token work only for explicitly public routes', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);

    await expect(
      guard.canActivate(createContext(createRequest())),
    ).resolves.toBe(true);
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('rejects missing or malformed authorization without repository access', async () => {
    await expect(
      guard.canActivate(createContext(createRequest('Basic credentials'))),
    ).rejects.toMatchObject({ code: 'INVALID_SESSION' });
    expect(repository.findUserById).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens and disabled current users', async () => {
    tokenService.verify.mockResolvedValueOnce(null);
    await expect(
      guard.canActivate(createContext(createRequest('Bearer invalid-token'))),
    ).rejects.toMatchObject({ code: 'INVALID_SESSION' });

    tokenService.verify.mockResolvedValueOnce({
      sub: USER.id,
      role: 'CUSTOMER',
      ver: 0,
      typ: 'access',
      jti: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      iss: 'issuer',
      aud: 'audience',
      iat: 1,
      exp: 2,
    });
    repository.findUserById.mockResolvedValueOnce({
      ...USER,
      status: 'DISABLED',
    });
    await expect(
      guard.canActivate(createContext(createRequest('Bearer valid-token'))),
    ).rejects.toMatchObject({ code: 'INVALID_SESSION' });
  });

  it('attaches the current database role instead of trusting the JWT role', async () => {
    tokenService.verify.mockResolvedValueOnce({
      sub: USER.id,
      role: 'CUSTOMER',
      ver: 0,
      typ: 'access',
      jti: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      iss: 'issuer',
      aud: 'audience',
      iat: 1,
      exp: 2,
    });
    repository.findUserById.mockResolvedValueOnce(USER);
    const request = createRequest('Bearer valid-token');

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: USER.id, role: 'ADMIN' });
  });
});
