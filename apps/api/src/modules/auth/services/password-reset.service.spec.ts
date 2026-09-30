/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ApiException } from '../../../common/errors/api-error';
import { PasswordHasher } from '../../../common/security/password-hasher';
import { PasswordPolicy } from '../../../common/security/password-policy';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { OutboxService } from '../../notification/services/outbox.service';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    passwordResetToken: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: { updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let outboxService: { enqueue: jest.Mock };
  let passwordHasher: { hash: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('new-argon2-hash'),
      verify: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: outboxService },
        { provide: PasswordHasher, useValue: passwordHasher },
        {
          provide: PasswordPolicy,
          useValue: { assertAcceptable: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: any) => {
              if (key === 'PASSWORD_RESET_OTP_TTL_MIN') return 10;
              if (key === 'PASSWORD_RESET_LINK_TTL_MIN') return 30;
              if (key === 'APP_PUBLIC_URL') return 'http://localhost:3000';
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PasswordResetService);
  });

  describe('requestReset', () => {
    it('returns generic message even when user is not found (anti-account-enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.requestReset('unknown@example.com', {
        ipAddress: '127.0.0.1',
      });

      expect(result.message).toContain('Nếu email tồn tại');
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('enqueues outbox message when user exists and is ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'customer@example.com',
        fullName: 'Nguyễn Văn A',
        status: 'ACTIVE',
      });
      prisma.passwordResetToken.create.mockResolvedValueOnce({ id: 'token-1' });

      const result = await service.requestReset('customer@example.com', {
        ipAddress: '127.0.0.1',
      });

      expect(result.message).toContain('Nếu email tồn tại');
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toEmail: 'customer@example.com',
          template: 'password-reset',
          dedupeKey: 'PASSWORD_RESET:token-1',
        }),
      );
    });
  });

  describe('verifyOtp', () => {
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.verifyOtp('x@example.com', '123456', {}),
      ).rejects.toThrow(ApiException);
    });

    it('throws when attempts >= 5', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        status: 'ACTIVE',
      });
      prisma.passwordResetToken.findFirst.mockResolvedValueOnce({
        id: 'token-1',
        createdAt: new Date(),
        attempts: 5,
        otpHash: 'somehash',
      });

      await expect(
        service.verifyOtp('x@example.com', '123456', {}),
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'PASSWORD_RESET_TOO_MANY_ATTEMPTS',
          status: HttpStatus.TOO_MANY_REQUESTS,
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('throws when token is invalid or expired', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPassword123!@#', {}),
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'PASSWORD_RESET_TOKEN_INVALID',
        }),
      );
    });

    it('updates password and increments authVersion to revoke all sessions', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValueOnce({
        id: 'tok-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60000),
        user: { status: 'ACTIVE' },
      });

      await service.resetPassword('valid-link-token', 'NewSecurePass12345!', {
        ipAddress: '127.0.0.1',
      });

      expect(passwordHasher.hash).toHaveBeenCalledWith('NewSecurePass12345!');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            passwordHash: 'new-argon2-hash',
            authVersion: { increment: 1 },
          }),
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', revokedAt: null },
        }),
      );
    });
  });
});
