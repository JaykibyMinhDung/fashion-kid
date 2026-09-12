import { Injectable } from '@nestjs/common';
import { dictionary } from '@zxcvbn-ts/language-common';

export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;

const COMMON_PASSWORDS = new Set(
  dictionary['passwords-common'].map((password) => password.toLowerCase()),
);

export const COMMON_PASSWORD_COUNT = COMMON_PASSWORDS.size;

export type PasswordPolicyViolation =
  'TOO_SHORT' | 'TOO_LONG' | 'COMMON_PASSWORD';

export class PasswordPolicyError extends Error {
  constructor(readonly violations: PasswordPolicyViolation[]) {
    super('Password does not meet the configured policy');
    this.name = 'PasswordPolicyError';
  }
}

@Injectable()
export class PasswordPolicy {
  validate(password: string): PasswordPolicyViolation[] {
    const violations: PasswordPolicyViolation[] = [];
    const length = [...password].length;

    if (length < MIN_PASSWORD_LENGTH) {
      violations.push('TOO_SHORT');
    }
    if (length > MAX_PASSWORD_LENGTH) {
      violations.push('TOO_LONG');
    }
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      violations.push('COMMON_PASSWORD');
    }

    return violations;
  }

  assertAcceptable(password: string): void {
    const violations = this.validate(password);
    if (violations.length > 0) {
      throw new PasswordPolicyError(violations);
    }
  }
}
