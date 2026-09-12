import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

const ACCESS_TOKEN_ALGORITHM = 'HS256' as const;
const ACCESS_TOKEN_TYPE = 'access' as const;
const ROLE_CODES = new Set([
  'CUSTOMER',
  'SALES_STAFF',
  'WAREHOUSE_STAFF',
  'ADMIN',
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface AccessTokenClaims {
  sub: string;
  role: string;
  ver: number;
  jti: string;
  typ: typeof ACCESS_TOKEN_TYPE;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

function isAccessTokenClaims(
  payload: Record<string, unknown>,
): payload is Record<string, unknown> & AccessTokenClaims {
  return (
    typeof payload.sub === 'string' &&
    UUID_PATTERN.test(payload.sub) &&
    typeof payload.role === 'string' &&
    ROLE_CODES.has(payload.role) &&
    typeof payload.ver === 'number' &&
    Number.isSafeInteger(payload.ver) &&
    payload.ver >= 0 &&
    typeof payload.jti === 'string' &&
    UUID_PATTERN.test(payload.jti) &&
    payload.typ === ACCESS_TOKEN_TYPE &&
    typeof payload.iss === 'string' &&
    typeof payload.aud === 'string' &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number' &&
    payload.exp > payload.iat
  );
}

@Injectable()
export class AccessTokenService {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.secret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.issuer = configService.getOrThrow<string>('JWT_ISSUER');
    this.audience = configService.getOrThrow<string>('JWT_AUDIENCE');
    this.ttlSeconds = configService.getOrThrow<number>(
      'ACCESS_TOKEN_TTL_SECONDS',
    );
  }

  get expiresInSeconds(): number {
    return this.ttlSeconds;
  }

  async sign(userId: string, role: string, authVersion = 0): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, role, ver: authVersion, typ: ACCESS_TOKEN_TYPE },
      {
        secret: this.secret,
        algorithm: ACCESS_TOKEN_ALGORITHM,
        issuer: this.issuer,
        audience: this.audience,
        expiresIn: this.ttlSeconds,
        jwtid: randomUUID(),
      },
    );
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(token, {
        secret: this.secret,
        algorithms: [ACCESS_TOKEN_ALGORITHM],
        issuer: this.issuer,
        audience: this.audience,
      });

      return isAccessTokenClaims(payload) ? payload : null;
    } catch {
      return null;
    }
  }
}
