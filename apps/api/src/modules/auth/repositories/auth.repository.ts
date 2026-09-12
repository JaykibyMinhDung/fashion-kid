import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  AuthAuditAction,
  AuthRequestContext,
  AuthUserRecord,
  LockedRefreshSession,
} from '../auth.types';

export interface CreateCustomerUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
}

export interface CreateRefreshSessionInput {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  isPersistent: boolean;
}

export interface CreateAuthAuditInput {
  action: AuthAuditAction;
  actorId?: string;
  entityId?: string;
  context: AuthRequestContext;
  failureReason?: 'INVALID_CREDENTIALS' | 'INVALID_SESSION';
}

export interface RotateRefreshSessionInput {
  tokenId: string;
  tokenDigest: string;
  nextTokenId: string;
  nextTokenHash: string;
  now: Date;
  persistentInactivityMilliseconds: number;
}

export type RotateRefreshSessionResult =
  | { status: 'INVALID' | 'EXPIRED' | 'INACTIVE' | 'USER_DISABLED' }
  | { status: 'REPLAYED'; familyId: string; userId: string }
  | {
      status: 'ROTATED';
      familyId: string;
      expiresAt: Date;
      isPersistent: boolean;
      user: AuthUserRecord;
    };

export abstract class AuthRepository {
  abstract findUserByCanonicalEmail(
    canonicalEmail: string,
  ): Promise<AuthUserRecord | null>;

  abstract findUserById(userId: string): Promise<AuthUserRecord | null>;

  abstract findUserByIdInTransaction(
    transaction: PrismaTransactionClient,
    userId: string,
  ): Promise<AuthUserRecord | null>;

  abstract createCustomerUser(
    transaction: PrismaTransactionClient,
    input: CreateCustomerUserInput,
  ): Promise<AuthUserRecord>;

  abstract createRefreshSession(
    transaction: PrismaTransactionClient,
    input: CreateRefreshSessionInput,
  ): Promise<void>;

  abstract lockRefreshSession(
    transaction: PrismaTransactionClient,
    tokenId: string,
  ): Promise<LockedRefreshSession | null>;

  abstract rotateRefreshSession(
    transaction: PrismaTransactionClient,
    input: RotateRefreshSessionInput,
  ): Promise<RotateRefreshSessionResult>;

  abstract revokeRefreshSession(
    transaction: PrismaTransactionClient,
    tokenId: string,
    revokedAt: Date,
  ): Promise<void>;

  abstract revokeRefreshFamily(
    transaction: PrismaTransactionClient,
    familyId: string,
    revokedAt: Date,
  ): Promise<number>;

  abstract revokeAllUserRefreshSessions(
    transaction: PrismaTransactionClient,
    userId: string,
    revokedAt: Date,
  ): Promise<number>;

  abstract updateLastLoginAt(
    transaction: PrismaTransactionClient,
    userId: string,
    lastLoginAt: Date,
  ): Promise<void>;

  abstract updatePasswordHash(
    transaction: PrismaTransactionClient,
    userId: string,
    passwordHash: string,
  ): Promise<void>;

  abstract incrementAuthVersion(
    transaction: PrismaTransactionClient,
    userId: string,
  ): Promise<void>;

  abstract createAuditLog(
    transaction: PrismaTransactionClient,
    input: CreateAuthAuditInput,
  ): Promise<void>;
}
