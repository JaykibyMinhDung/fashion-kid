import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  const service = new RefreshTokenService();

  it('generates a UUID selector and a 256-bit base64url secret', () => {
    const generated = service.generate();
    const [selector, secret, unexpected] = generated.token.split('.');

    expect(unexpected).toBeUndefined();
    expect(selector).toBe(generated.selector);
    expect(selector).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(secret ?? '', 'base64url')).toHaveLength(32);
    expect(generated.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates independent high-entropy tokens', () => {
    const tokens = new Set(
      Array.from({ length: 64 }, () => service.generate().token),
    );

    expect(tokens.size).toBe(64);
  });

  it('parses a generated token and derives the same digest', () => {
    const generated = service.generate();

    expect(service.parse(generated.token)).toEqual({
      selector: generated.selector,
      digest: generated.digest,
    });
  });

  it('rejects malformed input before it can become a database selector', () => {
    const generated = service.generate();
    const malformedTokens = [
      '',
      ' ',
      'not-a-token',
      `${generated.selector}.short`,
      `${generated.selector}.${'a'.repeat(44)}`,
      `${generated.selector}.${'!'.repeat(43)}`,
      `not-a-uuid.${'a'.repeat(43)}`,
      `${generated.token}.extra`,
      'x'.repeat(256),
    ];

    for (const token of malformedTokens) {
      expect(service.parse(token)).toBeNull();
    }
  });

  it('detects a tampered secret using the stored digest', () => {
    const generated = service.generate();
    const parsed = service.parse(generated.token);
    const secret = generated.token.split('.')[1] ?? '';
    const tamperedSecret = `${secret.slice(0, -1)}${secret.endsWith('A') ? 'B' : 'A'}`;
    const tampered = service.parse(`${generated.selector}.${tamperedSecret}`);

    expect(parsed).not.toBeNull();
    expect(tampered).not.toBeNull();
    expect(service.matchesDigest(parsed?.digest ?? '', generated.digest)).toBe(
      true,
    );
    expect(
      service.matchesDigest(tampered?.digest ?? '', generated.digest),
    ).toBe(false);
  });

  it('returns false for invalid stored digests without throwing', () => {
    const generated = service.generate();

    expect(service.matchesDigest(generated.digest, '')).toBe(false);
    expect(service.matchesDigest(generated.digest, 'not-a-digest')).toBe(false);
    expect(service.matchesDigest(generated.digest, 'a'.repeat(62))).toBe(false);
  });
});
