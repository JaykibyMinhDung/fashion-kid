import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { ApiException } from '../../../common/errors/api-error';
import { canonicalizeEmail } from '../../../common/security/identity-normalization';
import { PasswordHasher } from '../../../common/security/password-hasher';
import {
  PasswordPolicy,
  PasswordPolicyError,
} from '../../../common/security/password-policy';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { OutboxService } from '../../notification/services/outbox.service';
import type { AuthRequestContext } from '../auth.types';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly otpTtlMs: number;
  private readonly linkTtlMs: number;
  private readonly appPublicUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordPolicy: PasswordPolicy,
    configService: ConfigService,
  ) {
    this.otpTtlMs =
      configService.get<number>('PASSWORD_RESET_OTP_TTL_MIN', 10) * 60_000;
    this.linkTtlMs =
      configService.get<number>('PASSWORD_RESET_LINK_TTL_MIN', 30) * 60_000;
    this.appPublicUrl = configService.get<string>(
      'APP_PUBLIC_URL',
      'http://localhost:3000',
    );
  }

  async requestReset(
    email: string,
    context: AuthRequestContext,
  ): Promise<{ message: string }> {
    const canonical = canonicalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: canonical },
    });

    // Anti-account-enumeration: perform dummy work if user does not exist or disabled
    if (!user || user.status !== 'ACTIVE') {
      sha256(`dummy-equalize-timing-${canonical}`);
      return {
        message:
          'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
      };
    }

    const rawOtp = randomInt(100000, 1000000).toString();
    const rawLinkToken = randomBytes(32).toString('base64url');
    const otpHash = sha256(rawOtp);
    const linkTokenHash = sha256(rawLinkToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.linkTtlMs);

    await this.prisma.$transaction(async (tx) => {
      // Invalidate existing active tokens
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });

      const tokenRecord = await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          otpHash,
          linkTokenHash,
          expiresAt,
          attempts: 0,
        },
      });

      await this.outboxService.enqueue(tx, {
        dedupeKey: `PASSWORD_RESET:${tokenRecord.id}`,
        toEmail: user.email,
        template: 'password-reset',
        payload: {
          customerName: user.fullName,
          otp: rawOtp,
          resetUrl: `${this.appPublicUrl}/auth/reset-password?token=${rawLinkToken}`,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'AUTH_PASSWORD_RESET_REQUESTED',
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
        'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
    };
  }

  async verifyOtp(
    email: string,
    otp: string,
    context: AuthRequestContext,
  ): Promise<{ resetToken: string }> {
    const canonical = canonicalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: canonical },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PASSWORD_RESET_OTP_INVALID',
        'Mã OTP không chính xác hoặc đã hết hiệu lực',
      );
    }

    const token = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PASSWORD_RESET_TOKEN_INVALID',
        'Yêu cầu đặt lại mật khẩu không tồn tại hoặc đã hết hiệu lực',
      );
    }

    const now = new Date();
    // Check OTP specific lifetime (10 minutes from creation)
    if (now.getTime() > token.createdAt.getTime() + this.otpTtlMs) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PASSWORD_RESET_TOKEN_EXPIRED',
        'Mã OTP đã hết hiệu lực (10 phút). Vui lòng yêu cầu mã mới.',
      );
    }

    if (token.attempts >= 5) {
      await this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { consumedAt: now },
      });
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'PASSWORD_RESET_TOO_MANY_ATTEMPTS',
        'Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng gửi lại yêu cầu đặt lại mật khẩu.',
      );
    }

    const inputHash = sha256(otp);
    const matches = safeCompare(inputHash, token.otpHash);

    if (!matches) {
      await this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PASSWORD_RESET_OTP_INVALID',
        'Mã OTP không chính xác',
      );
    }

    // OTP verified successfully: issue a new reset session token
    const newResetSession = randomBytes(32).toString('base64url');
    const newHash = sha256(newResetSession);

    await this.prisma.passwordResetToken.update({
      where: { id: token.id },
      data: {
        linkTokenHash: newHash,
        attempts: 0,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'AUTH_PASSWORD_RESET_OTP_VERIFIED',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        ipAddress: context.ipAddress ?? null,
        requestId: context.requestId ?? null,
        metadata: context.userAgent
          ? { userAgent: context.userAgent }
          : undefined,
      },
    });

    return { resetToken: newResetSession };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    context: AuthRequestContext,
  ): Promise<void> {
    try {
      this.passwordPolicy.assertAcceptable(newPassword);
    } catch (error) {
      if (error instanceof PasswordPolicyError) {
        throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'VALIDATION_ERROR',
          'Mật khẩu không đáp ứng chính sách bảo mật',
        );
      }
      throw error;
    }

    const tokenHash = sha256(token);
    const now = new Date();

    const tokenRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        linkTokenHash: tokenHash,
        consumedAt: null,
      },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < now) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PASSWORD_RESET_TOKEN_INVALID',
        'Liên kết hoặc mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      );
    }

    if (tokenRecord.user.status !== 'ACTIVE') {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'USER_DISABLED',
        'Tài khoản đang bị vô hiệu hoá',
      );
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      // Invalidate token
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { consumedAt: now },
      });

      // Update password and increment authVersion to revoke all active sessions
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
          updatedAt: now,
        },
      });

      // Revoke all refresh tokens
      await tx.refreshToken.updateMany({
        where: {
          userId: tokenRecord.userId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await tx.auditLog.create({
        data: {
          action: 'AUTH_PASSWORD_RESET_SUCCESS',
          entityType: 'User',
          entityId: tokenRecord.userId,
          actorId: tokenRecord.userId,
          ipAddress: context.ipAddress ?? null,
          requestId: context.requestId ?? null,
        },
      });
    });

    this.logger.log(
      `Password reset successfully for user=${tokenRecord.userId}`,
    );
  }
}
