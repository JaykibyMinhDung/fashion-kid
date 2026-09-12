import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedRequestUser } from '../common/auth/authenticated-user';
import { PermissionsGuard } from './permissions.guard';

function createContext(user?: AuthenticatedRequestUser): ExecutionContext {
  const request = { user } as Request & { user?: AuthenticatedRequestUser };
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function captureError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new Error('Expected operation to throw');
}

describe('PermissionsGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new PermissionsGuard(reflector);
  });

  it('allows an explicitly public route', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('denies a protected route when access identity is missing', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);

    expect(
      captureError(() => guard.canActivate(createContext())),
    ).toMatchObject({ code: 'INVALID_SESSION' });
  });

  it('allows an authenticated route without permission metadata', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);

    expect(
      guard.canActivate(createContext({ id: 'user-id', role: 'CUSTOMER' })),
    ).toBe(true);
  });

  it('requires every declared capability', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['ORDER_READ_ALL', 'ORDER_CONFIRM']);
    expect(
      guard.canActivate(createContext({ id: 'user-id', role: 'SALES_STAFF' })),
    ).toBe(true);

    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['ORDER_READ_ALL', 'ORDER_SHIP']);
    expect(
      captureError(() =>
        guard.canActivate(
          createContext({ id: 'user-id', role: 'SALES_STAFF' }),
        ),
      ),
    ).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('defaults an empty capability list to deny', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([]);

    expect(
      captureError(() =>
        guard.canActivate(createContext({ id: 'user-id', role: 'ADMIN' })),
      ),
    ).toMatchObject({ code: 'FORBIDDEN' });
  });
});
