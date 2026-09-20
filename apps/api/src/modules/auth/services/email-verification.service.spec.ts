/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ApiException } from '../../../common/errors/api-error';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { OutboxService } from '../../notification/services/outbox.service';
import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    emailVerificationToken: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let outboxService: { enqueue: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      emailVerificationToken: {
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'tok-1' }),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: outboxService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: any) => {
              if (key === 'EMAIL_VERIFICATION_TTL_HOURS') return 24;
              if (key === 'APP_PUBLIC_URL') return 'http://localhost:3000';
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(EmailVerificationService);
  });

  describe('sendVerificationEmail', () => {
    it('enqueues outbox verification email', async () => {
      const tx = prisma as any;
      await service.sendVerificationEmail(tx, {
        id: 'u-1',
        email: 'test@example.com',
        fullName: 'Test User',
      });

      expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          toEmail: 'test@example.com',
          template: 'email-verification',
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('throws when token is invalid or expired', async () => {
      prisma.emailVerificationToken.findFirst.mockResolvedValueOnce(null);

      await expect(service.verifyEmail('invalid-token', {})).rejects.toThrow(
        ApiException,
      );
    });

    it('sets emailVerifiedAt when token is valid', async () => {
      prisma.emailVerificationToken.findFirst.mockResolvedValueOnce({
        id: 'tok-1',
        userId: 'u-1',
        expiresAt: new Date(Date.now() + 60000),
        user: { emailVerifiedAt: null },
      });

      const result = await service.verifyEmail('valid-token', {});

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: expect.objectContaining({
            emailVerifiedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('resendVerification', () => {
    it('returns generic message even when user does not exist (anti-enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.resendVerification('unknown@x.com', {});
      expect(result.message).toContain('Nếu email tồn tại');
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });
  });
});
