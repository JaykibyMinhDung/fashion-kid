import { HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import { ApiException } from '../errors/api-error';
import { canonicalizeEmail } from '../security/identity-normalization';
import { RefreshTokenService } from '../security/refresh-token.service';
import { SessionCookieService } from '../security/session-cookie.service';

type TrackerRequest = Record<string, unknown>;

function objectProperty(value: unknown, property: string): unknown {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)[property]
    : undefined;
}

function requestString(
  request: TrackerRequest,
  property: string,
): string | null {
  const value = request[property];
  return typeof value === 'string' ? value : null;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function buildAuthThrottleTracker(
  request: TrackerRequest,
  refreshTokenService: RefreshTokenService,
  refreshCookieName: string,
): string {
  const ipAddress = requestString(request, 'ip') ?? 'unknown-ip';
  const path =
    requestString(request, 'path') ?? requestString(request, 'url') ?? '';

  if (path === '/api/v1/auth/login') {
    const email = objectProperty(request.body, 'email');
    const canonicalEmail =
      typeof email === 'string' ? canonicalizeEmail(email) : '';
    return `${ipAddress}:email:${sha256(canonicalEmail)}`;
  }

  if (path === '/api/v1/auth/refresh') {
    const token = objectProperty(request.cookies, refreshCookieName);
    const parsed =
      typeof token === 'string' ? refreshTokenService.parse(token) : null;
    return `${ipAddress}:refresh:${parsed?.selector ?? 'malformed'}`;
  }

  return ipAddress;
}

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly sessionCookieService: SessionCookieService,
  ) {
    super(options, storage, reflector);
  }

  protected getTracker(request: TrackerRequest): Promise<string> {
    return Promise.resolve(
      buildAuthThrottleTracker(
        request,
        this.refreshTokenService,
        this.sessionCookieService.name,
      ),
    );
  }

  protected throwThrottlingException(): Promise<void> {
    return Promise.reject(
      new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau',
      ),
    );
  }
}
