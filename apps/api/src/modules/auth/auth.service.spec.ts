/* eslint-disable @typescript-eslint/unbound-method -- assertions intentionally inspect Jest method doubles */
import { ConfigService } from '@nestjs/config';
import type { PrismaTransactionClient } from '../../database/prisma/prisma.types';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccessTokenService } from '../../common/security/access-token.service';
import { PasswordHasher } from '../../common/security/password-hasher';
import { PasswordPolicy } from '../../common/security/password-policy';
import { RefreshTokenService } from '../../common/security/refresh-token.service';
import { ApiException } from '../../common/errors/api-error';
import { AuthService } from './auth.service';
import { AuthUserRecord } from './auth.types';
import { AuthRepository } from './repositories/auth.repository';

const ACTIVE_USER: AuthUserRecord = {
  id: '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
  email: 'user@example.com',
  passwordHash: 'stored-password-hash',
  fullName: 'Test User',
  phone: '+84901234567',
  avatarUrl: null,
  status: 'ACTIVE',
  authVersion: 0,
  role: 'CUSTOMER',
  emailVerifiedAt: new Date('2026-01-01'),
};

const TEST_CONFIG = {
  ACCESS_TOKEN_TTL_SECONDS: 900,
  REFRESH_TOKEN_TTL_HOURS: 24,
  REMEMBER_REFRESH_TOKEN_TTL_DAYS: 30,
  REMEMBER_REFRESH_INACTIVITY_DAYS: 7,
};

function createRepositoryMock(): jest.Mocked<AuthRepository> {
  return {
    findUserByCanonicalEmail: jest.fn(),
    findUserById: jest.fn(),
    findUserByIdInTransaction: jest.fn(),
    createCustomerUser: jest.fn(),
    createRefreshSession: jest.fn(),
    lockRefreshSession: jest.fn(),
    rotateRefreshSession: jest.fn(),
    revokeRefreshSession: jest.fn(),
    revokeRefreshFamily: jest.fn(),
    revokeAllUserRefreshSessions: jest.fn(),
    updateLastLoginAt: jest.fn(),
    updatePasswordHash: jest.fn(),
    incrementAuthVersion: jest.fn(),
    createAuditLog: jest.fn(),
  };
}

describe('AuthService register and login', () => {
  const transaction = {} as PrismaTransactionClient;
  let repository: jest.Mocked<AuthRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let accessTokenService: jest.Mocked<AccessTokenService>;
  let refreshTokenService: RefreshTokenService;
  let service: AuthService;

  beforeEach(async () => {
    repository = createRepositoryMock();
    repository.createCustomerUser.mockResolvedValue(ACTIVE_USER);
    repository.createRefreshSession.mockResolvedValue(undefined);
    repository.createAuditLog.mockResolvedValue(undefined);
    repository.findUserByIdInTransaction.mockResolvedValue(ACTIVE_USER);
    repository.updateLastLoginAt.mockResolvedValue(undefined);
    repository.revokeRefreshFamily.mockResolvedValue(0);
    repository.updatePasswordHash.mockResolvedValue(undefined);
    repository.incrementAuthVersion.mockResolvedValue(undefined);
    repository.revokeAllUserRefreshSessions.mockResolvedValue(0);

    passwordHasher = {
      hash: jest.fn((password: string) =>
        Promise.resolve(
          password.includes('dummy')
            ? 'dummy-password-hash'
            : 'stored-password-hash',
        ),
      ),
      verify: jest.fn(),
    };
    accessTokenService = {
      sign: jest.fn().mockResolvedValue('signed-access-token'),
      verify: jest.fn(),
      expiresInSeconds: 900,
    } as unknown as jest.Mocked<AccessTokenService>;
    refreshTokenService = new RefreshTokenService();
    const prisma = {
      $transaction: jest.fn(
        async (
          operation: (
            currentTransaction: PrismaTransactionClient,
          ) => Promise<unknown>,
        ) => operation(transaction),
      ),
    } as unknown as PrismaService;

    service = new AuthService(
      prisma,
      repository,
      passwordHasher,
      new PasswordPolicy(),
      refreshTokenService,
      accessTokenService,
      new ConfigService(TEST_CONFIG),
    );
    await service.onModuleInit();
  });

  it('registers canonical CUSTOMER data, session and audit in one transaction', async () => {
    const result = await service.register({
      fullName: '  Test User  ',
      email: '  USER@Example.COM ',
      phone: ' +84 901-234-567 ',
      password: 'a sufficiently long unique passphrase',
      remember: false,
      context: { requestId: 'register-request' },
    });

    expect(repository.createCustomerUser).toHaveBeenCalledWith(transaction, {
      email: 'user@example.com',
      passwordHash: 'stored-password-hash',
      fullName: 'Test User',
      phone: '+84901234567',
    });
    expect(repository.createRefreshSession).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        userId: ACTIVE_USER.id,
        isPersistent: false,
      }),
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ action: 'AUTH_REGISTER_SUCCESS' }),
    );
    expect(result.session).toEqual({
      accessToken: 'signed-access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: ACTIVE_USER.id,
        email: ACTIVE_USER.email,
        fullName: ACTIVE_USER.fullName,
        phone: ACTIVE_USER.phone,
        avatarUrl: null,
        role: 'CUSTOMER',
        emailVerifiedAt: ACTIVE_USER.emailVerifiedAt,
      },
    });
    expect(result.session.user).not.toHaveProperty('passwordHash');
    expect(
      JSON.stringify(repository.createCustomerUser.mock.calls),
    ).not.toContain('a sufficiently long unique passphrase');
  });

  it('maps a failed registration transaction to the generic conflict', async () => {
    repository.createCustomerUser.mockRejectedValueOnce(
      new Error('database unique detail must not escape'),
    );

    const promise = service.register({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'another sufficiently long passphrase',
      remember: false,
      context: {},
    });

    await expect(promise).rejects.toMatchObject({
      code: 'REGISTRATION_FAILED',
      publicMessage: 'Không thể tạo tài khoản',
    });
    expect(repository.createRefreshSession).not.toHaveBeenCalled();
    expect(repository.createAuditLog).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown email', null, true],
    ['wrong password', ACTIVE_USER, false],
    ['disabled user', { ...ACTIVE_USER, status: 'DISABLED' as const }, true],
  ])(
    'returns one generic error for %s',
    async (_name, user, passwordMatches) => {
      repository.findUserByCanonicalEmail.mockResolvedValueOnce(user);
      passwordHasher.verify.mockResolvedValueOnce(passwordMatches);

      const promise = service.login({
        email: ' USER@example.com ',
        password: 'submitted password remains exact',
        remember: false,
        context: { requestId: 'failed-login' },
      });

      await expect(promise).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        publicMessage: 'Email hoặc mật khẩu không hợp lệ',
      });
      expect(repository.createAuditLog).toHaveBeenCalledWith(
        transaction,
        expect.objectContaining({
          action: 'AUTH_LOGIN_FAILED',
          failureReason: 'INVALID_CREDENTIALS',
        }),
      );
    },
  );

  it('uses the precomputed dummy hash for an unknown email', async () => {
    repository.findUserByCanonicalEmail.mockResolvedValueOnce(null);
    passwordHasher.verify.mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'submitted password remains exact',
        remember: false,
        context: {},
      }),
    ).rejects.toBeInstanceOf(ApiException);

    expect(passwordHasher.hash).toHaveBeenCalledTimes(1);
    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'dummy-password-hash',
      'submitted password remains exact',
    );
  });

  it('logs in an ACTIVE user and commits update, session and audit together', async () => {
    repository.findUserByCanonicalEmail.mockResolvedValueOnce(ACTIVE_USER);
    passwordHasher.verify.mockResolvedValueOnce(true);

    const result = await service.login({
      email: 'USER@example.com',
      password: 'submitted password remains exact',
      remember: true,
      context: { requestId: 'successful-login' },
    });

    expect(repository.findUserByCanonicalEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(repository.updateLastLoginAt).toHaveBeenCalledWith(
      transaction,
      ACTIVE_USER.id,
      expect.any(Date),
    );
    expect(repository.createRefreshSession).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ isPersistent: true }),
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ action: 'AUTH_LOGIN_SUCCESS' }),
    );
    expect(result.session.user).not.toHaveProperty('passwordHash');
    expect(result.refreshSession.isPersistent).toBe(true);
  });

  it('rotates a valid refresh session and returns only the new opaque token', async () => {
    const original = refreshTokenService.generate();
    const expiresAt = new Date(Date.now() + 86_400_000);
    repository.rotateRefreshSession.mockResolvedValueOnce({
      status: 'ROTATED',
      familyId: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      expiresAt,
      isPersistent: false,
      user: ACTIVE_USER,
    });

    const result = await service.refresh(original.token, {
      requestId: 'refresh-success',
    });

    expect(repository.rotateRefreshSession).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        tokenId: original.selector,
        tokenDigest: original.digest,
        persistentInactivityMilliseconds: 7 * 86_400_000,
      }),
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ action: 'AUTH_REFRESH_SUCCESS' }),
    );
    expect(result.refreshSession.token).not.toBe(original.token);
    expect(result.refreshSession).toEqual(
      expect.objectContaining({ expiresAt, isPersistent: false }),
    );
  });

  it.each([
    { status: 'INVALID' as const },
    { status: 'EXPIRED' as const },
    { status: 'INACTIVE' as const },
    { status: 'USER_DISABLED' as const },
  ])(
    'maps unsuccessful rotation $status to INVALID_SESSION',
    async (result) => {
      const original = refreshTokenService.generate();
      repository.rotateRefreshSession.mockResolvedValueOnce(result);

      await expect(service.refresh(original.token, {})).rejects.toMatchObject({
        code: 'INVALID_SESSION',
      });
    },
  );

  it('commits replay audit before returning the generic invalid-session error', async () => {
    const original = refreshTokenService.generate();
    repository.rotateRefreshSession.mockResolvedValueOnce({
      status: 'REPLAYED',
      familyId: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      userId: ACTIVE_USER.id,
    });

    await expect(
      service.refresh(original.token, { requestId: 'refresh-replay' }),
    ).rejects.toMatchObject({ code: 'INVALID_SESSION' });
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'AUTH_REFRESH_REUSE_DETECTED',
        failureReason: 'INVALID_SESSION',
      }),
    );
  });

  it('rejects malformed refresh input before repository access', async () => {
    await expect(service.refresh('malformed-token', {})).rejects.toMatchObject({
      code: 'INVALID_SESSION',
    });
    expect(repository.rotateRefreshSession).not.toHaveBeenCalled();
  });

  it('keeps logout idempotent when the cookie is absent', async () => {
    await expect(service.logout(undefined, {})).resolves.toBeUndefined();
    expect(repository.lockRefreshSession).not.toHaveBeenCalled();
    expect(repository.revokeRefreshFamily).not.toHaveBeenCalled();
  });

  it('revokes the matching refresh family and audits logout atomically', async () => {
    const current = refreshTokenService.generate();
    repository.lockRefreshSession.mockResolvedValueOnce({
      id: current.selector,
      userId: ACTIVE_USER.id,
      familyId: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      tokenHash: current.digest,
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      isPersistent: false,
      createdAt: new Date(),
      user: ACTIVE_USER,
    });

    await service.logout(current.token, { requestId: 'logout-request' });

    expect(repository.revokeRefreshFamily).toHaveBeenCalledWith(
      transaction,
      '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      expect.any(Date),
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ action: 'AUTH_LOGOUT' }),
    );
  });

  it('returns only public fields from me for an ACTIVE user', async () => {
    repository.findUserById.mockResolvedValueOnce(ACTIVE_USER);

    const user = await service.me(ACTIVE_USER.id);

    expect(user).toEqual({
      id: ACTIVE_USER.id,
      email: ACTIVE_USER.email,
      fullName: ACTIVE_USER.fullName,
      phone: ACTIVE_USER.phone,
      avatarUrl: ACTIVE_USER.avatarUrl,
      role: ACTIVE_USER.role,
      emailVerifiedAt: ACTIVE_USER.emailVerifiedAt,
    });
    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('status');
  });

  it('rejects me when the current database user is disabled', async () => {
    repository.findUserById.mockResolvedValueOnce({
      ...ACTIVE_USER,
      status: 'DISABLED',
    });

    await expect(service.me(ACTIVE_USER.id)).rejects.toMatchObject({
      code: 'INVALID_SESSION',
    });
  });

  it('rejects a wrong current password without mutation', async () => {
    repository.findUserById.mockResolvedValueOnce(ACTIVE_USER);
    passwordHasher.verify.mockResolvedValueOnce(false);

    await expect(
      service.changePassword(
        ACTIVE_USER.id,
        'wrong current password',
        'a new sufficiently long passphrase',
        {},
      ),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(repository.updatePasswordHash).not.toHaveBeenCalled();
    expect(repository.revokeAllUserRefreshSessions).not.toHaveBeenCalled();
  });

  it('rejects a weak or unchanged new password', async () => {
    await expect(
      service.changePassword(
        ACTIVE_USER.id,
        'current password',
        'too short',
        {},
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    const unchanged = 'same sufficiently long password';
    await expect(
      service.changePassword(ACTIVE_USER.id, unchanged, unchanged, {}),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(repository.findUserById).not.toHaveBeenCalled();
  });

  it('updates the hash, revokes every session and audits in one transaction', async () => {
    repository.findUserById.mockResolvedValueOnce(ACTIVE_USER);
    passwordHasher.verify.mockResolvedValueOnce(true);
    passwordHasher.hash.mockResolvedValueOnce('new-password-hash');

    await service.changePassword(
      ACTIVE_USER.id,
      'submitted current password',
      'a new sufficiently long passphrase',
      { requestId: 'change-password' },
    );

    expect(repository.updatePasswordHash).toHaveBeenCalledWith(
      transaction,
      ACTIVE_USER.id,
      'new-password-hash',
    );
    expect(repository.revokeAllUserRefreshSessions).toHaveBeenCalledWith(
      transaction,
      ACTIVE_USER.id,
      expect.any(Date),
    );
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ action: 'AUTH_PASSWORD_CHANGED' }),
    );
  });

  it('does not report success when the transactional audit fails', async () => {
    repository.findUserById.mockResolvedValueOnce(ACTIVE_USER);
    passwordHasher.verify.mockResolvedValueOnce(true);
    passwordHasher.hash.mockResolvedValueOnce('new-password-hash');
    repository.createAuditLog.mockRejectedValueOnce(
      new Error('audit write failed'),
    );

    await expect(
      service.changePassword(
        ACTIVE_USER.id,
        'submitted current password',
        'a new sufficiently long passphrase',
        {},
      ),
    ).rejects.toThrow('audit write failed');
  });
});
