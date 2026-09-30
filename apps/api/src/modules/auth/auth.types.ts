export const ROLE_CODES = [
  'CUSTOMER',
  'SALES_STAFF',
  'WAREHOUSE_STAFF',
  'ADMIN',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];
export type AuthUserStatus = 'ACTIVE' | 'DISABLED';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: RoleCode;
  emailVerifiedAt?: Date | null;
}

export interface AuthUserRecord extends PublicUser {
  passwordHash: string;
  status: AuthUserStatus;
  authVersion: number;
}

export interface AuthSessionPayload {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: PublicUser;
}

export interface IssuedRefreshSession {
  token: string;
  expiresAt: Date;
  isPersistent: boolean;
}

export interface LockedRefreshSession {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  isPersistent: boolean;
  createdAt: Date;
  user: AuthUserRecord;
}

export const AUTH_AUDIT_ACTIONS = [
  'AUTH_REGISTER_SUCCESS',
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILED',
  'AUTH_REFRESH_SUCCESS',
  'AUTH_REFRESH_REUSE_DETECTED',
  'AUTH_LOGOUT',
  'AUTH_PASSWORD_CHANGED',
  'AUTH_PASSWORD_RESET_REQUESTED',
  'AUTH_PASSWORD_RESET_SUCCESS',
  'AUTH_EMAIL_VERIFIED',
  'AUTH_EMAIL_VERIFICATION_RESENT',
] as const;

export type AuthAuditAction = (typeof AUTH_AUDIT_ACTIONS)[number];

export interface AuthRequestContext {
  ipAddress?: string;
  requestId?: string;
  userAgent?: string;
}

export function isRoleCode(value: string): value is RoleCode {
  return ROLE_CODES.some((role) => role === value);
}

export function toPublicUser(user: AuthUserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
  };
}
