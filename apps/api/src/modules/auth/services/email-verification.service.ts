import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { ApiException } from '../../../common/errors/api-error';
import { canonicalizeEmail } from '../../../common/security/identity-normalization';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import { OutboxService } from '../../notification/services/outbox.service';
import type { AuthRequestContext } from '../auth.types';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly ttlMs: number;
  private readonly appPublicUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    configService: ConfigService,
  ) {
    this.ttlMs =
      configService.get<number>('EMAIL_VERIFICATION_TTL_HOURS', 24) * 3_600_000;
    this.appPublicUrl = configService.get<string>(
      'APP_PUBLIC_URL',
      'http://localhost:3000',
    );
  }

  async sendVerificationEmail(
    tx: PrismaTransactionClient,
    user: { id: string; email: string; fullName: string },
  ): Promise<void> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);

    // Invalidate existing tokens for user
    await tx.emailVerificationToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: now },
    });

    const record = await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.outboxService.enqueue(tx, {
      dedupeKey: `EMAIL_VERIFICATION:${record.id}`,
      toEmail: user.email,
      template: 'email-verification',
      payload: {
        customerName: user.fullName,
        verificationUrl: `${this.appPublicUrl}/auth/verify-email?token=${rawToken}`,
      },
    });

    this.logger.log(`Verification email enqueued for user=${user.id}`);
  }

  async verifyEmail(
    token: string,
    context: AuthRequestContext,
  ): Promise<{ success: boolean; message: string }> {
    const tokenHash = sha256(token);
    const now = new Date();

    const record = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
      },
      include: { user: true },
    });

    if (!record || record.expiresAt < now) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'EMAIL_VERIFICATION_TOKEN_INVALID',
        'Liên kết xác thực email không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại.',
      );
    }

    if (record.user.emailVerifiedAt) {
      return {
        success: true,
        message:
          'Địa chỉ email này đã được xác thực trước đó. Bạn có thể đăng nhập ngay.',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: {
          emailVerifiedAt: now,
          updatedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'AUTH_EMAIL_VERIFIED',
          entityType: 'User',
          entityId: record.userId,
          actorId: record.userId,
          ipAddress: context.ipAddress ?? null,
          requestId: context.requestId ?? null,
        },
      });
    });

    return {
      success: true,
      message: 'Xác thực email thành công! Bây giờ bạn đã có thể đăng nhập.',
    };
  }

  async resendVerification(
    email: string,
    context: AuthRequestContext,
  ): Promise<{ message: string }> {
    const canonical = canonicalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: canonical },
    });

    if (!user || user.status !== 'ACTIVE' || user.emailVerifiedAt !== null) {
      // Anti-account-enumeration: generic response
      sha256(`dummy-${canonical}`);
      return {
        message:
          'Nếu email tồn tại trong hệ thống và chưa được kích hoạt, email xác thực mới đã được gửi.',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await this.sendVerificationEmail(tx, user);
      await tx.auditLog.create({
        data: {
          action: 'AUTH_EMAIL_VERIFICATION_RESENT',
          entityType: 'User',
          entityId: user.id,
          actorId: user.id,
          ipAddress: context.ipAddress ?? null,
          requestId: context.requestId ?? null,
        },
      });
    });

    return {
      message:
        'Nếu email tồn tại trong hệ thống và chưa được kích hoạt, email xác thực mới đã được gửi.',
    };
  }
}
