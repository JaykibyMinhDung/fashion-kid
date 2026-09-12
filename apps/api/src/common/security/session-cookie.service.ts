import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

const PRODUCTION_COOKIE_NAME = '__Host-kf_refresh';
const LOCAL_COOKIE_NAME = 'kf_refresh';

@Injectable()
export class SessionCookieService {
  readonly name: string;
  private readonly baseOptions: Readonly<CookieOptions>;

  constructor(configService: ConfigService) {
    const isProduction =
      configService.getOrThrow<string>('NODE_ENV') === 'production';
    const secure = configService.getOrThrow<boolean>('COOKIE_SECURE');

    this.name = isProduction ? PRODUCTION_COOKIE_NAME : LOCAL_COOKIE_NAME;
    this.baseOptions = {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
    };
  }

  createOptions(isPersistent: boolean, expiresAt?: Date): CookieOptions {
    if (!isPersistent) {
      return { ...this.baseOptions };
    }
    if (!expiresAt) {
      throw new Error('Persistent refresh cookies require an expiration');
    }

    const maxAge = expiresAt.getTime() - Date.now();
    if (maxAge <= 0) {
      throw new Error('Persistent refresh cookies require a future expiration');
    }

    return { ...this.baseOptions, expires: expiresAt, maxAge };
  }

  createClearOptions(): CookieOptions {
    return { ...this.baseOptions };
  }
}
