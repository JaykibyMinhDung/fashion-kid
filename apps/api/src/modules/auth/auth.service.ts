import {
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ApiException } from '../../common/errors/api-error';
import { AccessTokenService } from '../../common/security/access-token.service';
import {
  canonicalizeEmail,
  canonicalizePhone,
  normalizeFullName,
} from '../../common/security/identity-normalization';
import { PasswordHasher } from '../../common/security/password-hasher';
import {
  PasswordPolicy,
  PasswordPolicyError,
} from '../../common/security/password-policy';
import { RefreshTokenService } from '../../common/security/refresh-token.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  invalidCredentialsError,
  invalidSessionError,
  passwordPolicyError,
  registrationFailedError,
} from './auth.errors';
import {
  AuthRequestContext,
  AuthSessionPayload,
  AuthUserRecord,
  IssuedRefreshSession,
  PublicUser,
  toPublicUser,
} from './auth.types';
import { AuthRepository } from './repositories/auth.repository';
import { EmailVerificationService } from './services/email-verification.service';

const DUMMY_PASSWORD = 'dummy password used only for timing balance';

export interface RegisterCommand {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  remember: boolean;
  context: AuthRequestContext;
}

export interface LoginCommand {
  email: string;
  password: string;
  remember: boolean;
  context: AuthRequestContext;
}

export interface AuthOperationResult {
  session: AuthSessionPayload;
  refreshSession: IssuedRefreshSession;
}

interface PreparedRefreshSession extends IssuedRefreshSession {
  selector: string;
  tokenHash: string;
  familyId: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlHours: number;
  private readonly rememberRefreshTokenTtlDays: number;
  private readonly rememberRefreshInactivityMilliseconds: number;
  private dummyPasswordHash: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordPolicy: PasswordPolicy,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly accessTokenService: AccessTokenService,
    configService: ConfigService,
    @Optional()
    private readonly emailVerificationService?: EmailVerificationService,
  ) {
    this.accessTokenTtlSeconds = configService.getOrThrow<number>(
      'ACCESS_TOKEN_TTL_SECONDS',
    );
    this.refreshTokenTtlHours = configService.getOrThrow<number>(
      'REFRESH_TOKEN_TTL_HOURS',
    );
    this.rememberRefreshTokenTtlDays = configService.getOrThrow<number>(
      'REMEMBER_REFRESH_TOKEN_TTL_DAYS',
    );
    this.rememberRefreshInactivityMilliseconds =
      configService.getOrThrow<number>('REMEMBER_REFRESH_INACTIVITY_DAYS') *
      86_400_000;
  }

  async onModuleInit(): Promise<void> {
    this.dummyPasswordHash = await this.passwordHasher.hash(DUMMY_PASSWORD);
  }

  async register(command: RegisterCommand): Promise<AuthOperationResult> {
    try {
      this.passwordPolicy.assertAcceptable(command.password);
    } catch (error) {
      if (error instanceof PasswordPolicyError) {
        throw passwordPolicyError();
      }
      throw error;
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const canonicalEmail = canonicalizeEmail(command.email);
    const issued = this.createRefreshSession(command.remember);

    let user: AuthUserRecord;
    try {
      user = await this.prisma.$transaction(async (transaction) => {
        const createdUser = await this.repository.createCustomerUser(
          transaction,
          {
            email: canonicalEmail,
            passwordHash,
            fullName: normalizeFullName(command.fullName),
            phone: canonicalizePhone(command.phone),
          },
        );
        await this.repository.createRefreshSession(transaction, {
          id: issued.selector,
          userId: createdUser.id,
          familyId: issued.familyId,
          tokenHash: issued.tokenHash,
          expiresAt: issued.expiresAt,
          isPersistent: issued.isPersistent,
        });
        await this.repository.createAuditLog(transaction, {
          action: 'AUTH_REGISTER_SUCCESS',
          actorId: createdUser.id,
          entityId: createdUser.id,
          context: command.context,
        });
        if (this.emailVerificationService) {
          await this.emailVerificationService.sendVerificationEmail(
            transaction,
            {
              id: createdUser.id,
              email: createdUser.email,
              fullName: createdUser.fullName,
            },
          );
        }
        return createdUser;
      });
    } catch {
      throw registrationFailedError();
    }

    return this.buildResult(user, issued);
  }

  async login(command: LoginCommand): Promise<AuthOperationResult> {
    const canonicalEmail = canonicalizeEmail(command.email);
    const user = await this.repository.findUserByCanonicalEmail(canonicalEmail);
    const passwordHash = user
      ? user.passwordHash
      : this.requireDummyPasswordHash();
    const passwordMatches = await this.passwordHasher.verify(
      passwordHash,
      command.password,
    );

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      await this.recordLoginFailure(command.context, user?.id);
      throw invalidCredentialsError();
    }

    if (user.emailVerifiedAt === null) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'EMAIL_NOT_VERIFIED',
        'Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư hoặc yêu cầu gửi lại email kích hoạt.',
      );
    }

    const issued = this.createRefreshSession(command.remember);
    const currentUser = await this.prisma.$transaction(async (transaction) => {
      const transactionalUser = await this.repository.findUserByIdInTransaction(
        transaction,
        user.id,
      );
      if (!transactionalUser || transactionalUser.status !== 'ACTIVE') {
        return null;
      }
      if (transactionalUser.passwordHash !== user.passwordHash) {
        return null;
      }

      const now = new Date();
      await this.repository.updateLastLoginAt(transaction, user.id, now);
      await this.repository.createRefreshSession(transaction, {
        id: issued.selector,
        userId: user.id,
        familyId: issued.familyId,
        tokenHash: issued.tokenHash,
        expiresAt: issued.expiresAt,
        isPersistent: issued.isPersistent,
      });
      await this.repository.createAuditLog(transaction, {
        action: 'AUTH_LOGIN_SUCCESS',
        actorId: user.id,
        entityId: user.id,
        context: command.context,
      });
      return transactionalUser;
    });

    if (!currentUser) {
      await this.recordLoginFailure(command.context, user.id);
      throw invalidCredentialsError();
    }

    return this.buildResult(currentUser, issued);
  }

  async refresh(
    refreshToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<AuthOperationResult> {
    const parsed = refreshToken
      ? this.refreshTokenService.parse(refreshToken)
      : null;
    if (!parsed) {
      throw invalidSessionError();
    }

    const next = this.refreshTokenService.generate();
    const now = new Date();
    const rotation = await this.prisma.$transaction(async (transaction) => {
      const result = await this.repository.rotateRefreshSession(transaction, {
        tokenId: parsed.selector,
        tokenDigest: parsed.digest,
        nextTokenId: next.selector,
        nextTokenHash: next.digest,
        now,
        persistentInactivityMilliseconds:
          this.rememberRefreshInactivityMilliseconds,
      });

      if (result.status === 'ROTATED') {
        await this.repository.createAuditLog(transaction, {
          action: 'AUTH_REFRESH_SUCCESS',
          actorId: result.user.id,
          entityId: result.user.id,
          context,
        });
      } else if (result.status === 'REPLAYED') {
        await this.repository.createAuditLog(transaction, {
          action: 'AUTH_REFRESH_REUSE_DETECTED',
          actorId: result.userId,
          entityId: result.userId,
          context,
          failureReason: 'INVALID_SESSION',
        });
      }

      return result;
    });

    if (rotation.status !== 'ROTATED') {
      throw invalidSessionError();
    }

    return this.buildResult(rotation.user, {
      token: next.token,
      selector: next.selector,
      tokenHash: next.digest,
      familyId: rotation.familyId,
      expiresAt: rotation.expiresAt,
      isPersistent: rotation.isPersistent,
    });
  }

  async logout(
    refreshToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<void> {
    const parsed = refreshToken
      ? this.refreshTokenService.parse(refreshToken)
      : null;
    if (!parsed) {
      return;
    }

    await this.prisma.$transaction(async (transaction) => {
      const session = await this.repository.lockRefreshSession(
        transaction,
        parsed.selector,
      );
      if (
        !session ||
        !this.refreshTokenService.matchesDigest(
          parsed.digest,
          session.tokenHash,
        )
      ) {
        return;
      }

      const now = new Date();
      await this.repository.revokeRefreshFamily(
        transaction,
        session.familyId,
        now,
      );
      await this.repository.incrementAuthVersion(transaction, session.userId);
      await this.repository.createAuditLog(transaction, {
        action: 'AUTH_LOGOUT',
        actorId: session.userId,
        entityId: session.userId,
        context,
      });
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.repository.findUserById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw invalidSessionError();
    }

    return toPublicUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    context: AuthRequestContext,
  ): Promise<void> {
    try {
      this.passwordPolicy.assertAcceptable(newPassword);
    } catch (error) {
      if (error instanceof PasswordPolicyError) {
        throw passwordPolicyError();
      }
      throw error;
    }
    if (currentPassword === newPassword) {
      throw passwordPolicyError();
    }

    const user = await this.repository.findUserById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw invalidSessionError();
    }
    const currentMatches = await this.passwordHasher.verify(
      user.passwordHash,
      currentPassword,
    );
    if (!currentMatches) {
      throw invalidCredentialsError();
    }

    const newPasswordHash = await this.passwordHasher.hash(newPassword);
    const changed = await this.prisma.$transaction(async (transaction) => {
      const lockedUser = await this.repository.findUserByIdInTransaction(
        transaction,
        userId,
      );
      if (
        !lockedUser ||
        lockedUser.status !== 'ACTIVE' ||
        lockedUser.passwordHash !== user.passwordHash
      ) {
        return false;
      }

      const now = new Date();
      await this.repository.updatePasswordHash(
        transaction,
        userId,
        newPasswordHash,
      );
      await this.repository.revokeAllUserRefreshSessions(
        transaction,
        userId,
        now,
      );
      await this.repository.incrementAuthVersion(transaction, userId);
      await this.repository.createAuditLog(transaction, {
        action: 'AUTH_PASSWORD_CHANGED',
        actorId: userId,
        entityId: userId,
        context,
      });
      return true;
    });

    if (!changed) {
      throw invalidSessionError();
    }
  }

  private createRefreshSession(remember: boolean): PreparedRefreshSession {
    const generated = this.refreshTokenService.generate();
    const lifetimeMilliseconds = remember
      ? this.rememberRefreshTokenTtlDays * 86_400_000
      : this.refreshTokenTtlHours * 3_600_000;

    return {
      token: generated.token,
      selector: generated.selector,
      tokenHash: generated.digest,
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() + lifetimeMilliseconds),
      isPersistent: remember,
    };
  }

  private async buildResult(
    user: AuthUserRecord,
    issued: PreparedRefreshSession,
  ): Promise<AuthOperationResult> {
    const accessToken = await this.accessTokenService.sign(
      user.id,
      user.role,
      user.authVersion,
    );

    return {
      session: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.accessTokenTtlSeconds,
        user: toPublicUser(user),
      },
      refreshSession: {
        token: issued.token,
        expiresAt: issued.expiresAt,
        isPersistent: issued.isPersistent,
      },
    };
  }

  private requireDummyPasswordHash(): string {
    if (!this.dummyPasswordHash) {
      throw new Error('AuthService has not completed module initialization');
    }
    return this.dummyPasswordHash;
  }

  private async recordLoginFailure(
    context: AuthRequestContext,
    userId?: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction((transaction) =>
        this.repository.createAuditLog(transaction, {
          action: 'AUTH_LOGIN_FAILED',
          actorId: userId,
          entityId: userId,
          context,
          failureReason: 'INVALID_CREDENTIALS',
        }),
      );
    } catch (error) {
      const errorType = error instanceof Error ? error.name : typeof error;
      this.logger.warn(`Authentication failure audit failed: ${errorType}`);
    }
  }
}
