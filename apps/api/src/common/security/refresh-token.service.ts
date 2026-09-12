import { Injectable } from '@nestjs/common';
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

const SELECTOR_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SHA_256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const MAX_TOKEN_LENGTH = 80;

export interface GeneratedRefreshToken {
  token: string;
  selector: string;
  digest: string;
}

export interface ParsedRefreshToken {
  selector: string;
  digest: string;
}

@Injectable()
export class RefreshTokenService {
  generate(): GeneratedRefreshToken {
    const selector = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    const token = `${selector}.${secret}`;

    return {
      token,
      selector,
      digest: this.digest(secret),
    };
  }

  parse(token: string): ParsedRefreshToken | null {
    if (token.length > MAX_TOKEN_LENGTH) {
      return null;
    }

    const separatorIndex = token.indexOf('.');
    if (
      separatorIndex !== 36 ||
      token.indexOf('.', separatorIndex + 1) !== -1
    ) {
      return null;
    }

    const selector = token.slice(0, separatorIndex);
    const secret = token.slice(separatorIndex + 1);
    if (!SELECTOR_PATTERN.test(selector) || !SECRET_PATTERN.test(secret)) {
      return null;
    }

    return { selector, digest: this.digest(secret) };
  }

  matchesDigest(candidateDigest: string, storedDigest: string): boolean {
    if (
      !SHA_256_HEX_PATTERN.test(candidateDigest) ||
      !SHA_256_HEX_PATTERN.test(storedDigest)
    ) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(candidateDigest, 'hex'),
      Buffer.from(storedDigest, 'hex'),
    );
  }

  private digest(secret: string): string {
    return createHash('sha256').update(secret, 'utf8').digest('hex');
  }
}
