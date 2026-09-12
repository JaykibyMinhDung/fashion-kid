import { hashPassword, verifyPassword } from './password-hasher';
import {
  COMMON_PASSWORD_COUNT,
  PasswordPolicy,
  PasswordPolicyError,
} from './password-policy';

describe('Password security', () => {
  describe('PasswordPolicy', () => {
    const policy = new PasswordPolicy();

    it('pins a common-password dictionary substantially above the minimum', () => {
      expect(COMMON_PASSWORD_COUNT).toBeGreaterThanOrEqual(3_000);
      expect(policy.validate('mailcreated5240')).toContain('COMMON_PASSWORD');
      expect(policy.validate('MAILCREATED5240')).toContain('COMMON_PASSWORD');
    });

    it.each([
      ['a'.repeat(14), 'TOO_SHORT'],
      ['a'.repeat(129), 'TOO_LONG'],
    ] as const)(
      'rejects boundary-invalid password lengths',
      (password, code) => {
        expect(policy.validate(password)).toContain(code);
        expect(() => policy.assertAcceptable(password)).toThrow(
          PasswordPolicyError,
        );
      },
    );

    it.each([
      'a'.repeat(15),
      'a'.repeat(64),
      'a'.repeat(128),
      'mật khẩu dài có Unicode 🧸',
      'all lowercase words are allowed',
    ])('allows any composition when length and denylist pass', (password) => {
      expect(policy.validate(password)).toEqual([]);
      expect(() => policy.assertAcceptable(password)).not.toThrow();
    });

    it('counts Unicode code points instead of UTF-16 code units', () => {
      const fourteenBears = '🧸'.repeat(14);
      const fifteenBears = '🧸'.repeat(15);

      expect(policy.validate(fourteenBears)).toContain('TOO_SHORT');
      expect(policy.validate(fifteenBears)).toEqual([]);
    });
  });

  describe('Argon2id password hashing', () => {
    it('uses the approved shared Argon2id parameters', async () => {
      const password = 'a sufficiently long password';
      const passwordHash = await hashPassword(password);

      expect(passwordHash).toMatch(/^\$argon2id\$v=19\$/);
      expect(passwordHash.split('$')[3]?.split(',')).toEqual(
        expect.arrayContaining(['m=19456', 't=2', 'p=1']),
      );
      await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
    });

    it('verifies the password exactly without trim or case conversion', async () => {
      const password = '  Exact Case Password 🧸  ';
      const passwordHash = await hashPassword(password);

      await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
      await expect(verifyPassword(passwordHash, password.trim())).resolves.toBe(
        false,
      );
      await expect(
        verifyPassword(passwordHash, password.toLowerCase()),
      ).resolves.toBe(false);
    });

    it('returns false instead of leaking malformed-hash errors', async () => {
      await expect(
        verifyPassword('not-an-argon2-hash', 'a sufficiently long password'),
      ).resolves.toBe(false);
    });
  });
});
