import { validateEnvironment } from './environment.validation';

const validConfig = {
  NODE_ENV: 'development',
  PORT: '8080',
  DATABASE_URL:
    'postgresql://kids_fashion:kids_fashion_dev@localhost:54329/kids_fashion?schema=public',
  WEB_ORIGIN: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'local-development-secret-with-more-than-32-bytes',
  JWT_ISSUER: 'kids-fashion-api',
  JWT_AUDIENCE: 'kids-fashion-web',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_HOURS: '24',
  REMEMBER_REFRESH_TOKEN_TTL_DAYS: '30',
  REMEMBER_REFRESH_INACTIVITY_DAYS: '7',
  MAX_CART_ITEM_QTY: '99',
  COOKIE_SECURE: 'false',
  SHIPPING_FALLBACK_FEE: '30000',
  SHIPPING_QUOTE_TTL_SECONDS: '300',
};

describe('validateEnvironment', () => {
  it('normalizes and converts valid Auth configuration', () => {
    expect(validateEnvironment({ ...validConfig })).toEqual({
      ...validConfig,
      PORT: 8080,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_HOURS: 24,
      REMEMBER_REFRESH_TOKEN_TTL_DAYS: 30,
      REMEMBER_REFRESH_INACTIVITY_DAYS: 7,
      MAX_CART_ITEM_QTY: 99,
      SHIPPING_QUOTE_TTL_SECONDS: 300,
      SHIPPING_FALLBACK_FEE: '30000',
      VAT_DEFAULT_RATE_BPS: 800,
      MAIL_DRIVER: 'smtp',
      MAIL_HOST: 'localhost',
      MAIL_PORT: 1025,
      MAIL_SECURE: false,
      MAIL_FROM: 'Mầm Nhỏ <no-reply@mamnho.local>',
      APP_PUBLIC_URL: 'http://localhost:3000',
      MAIL_WORKER_INTERVAL_SEC: 15,
      MAIL_WORKER_BATCH: 20,
      PASSWORD_RESET_OTP_TTL_MIN: 10,
      PASSWORD_RESET_LINK_TTL_MIN: 30,
      EMAIL_VERIFICATION_TTL_HOURS: 24,
      COOKIE_SECURE: false,
    });
  });

  it.each([
    'WEB_ORIGIN',
    'JWT_ACCESS_SECRET',
    'JWT_ISSUER',
    'JWT_AUDIENCE',
    'ACCESS_TOKEN_TTL_SECONDS',
    'REFRESH_TOKEN_TTL_HOURS',
    'REMEMBER_REFRESH_TOKEN_TTL_DAYS',
    'REMEMBER_REFRESH_INACTIVITY_DAYS',
    'MAX_CART_ITEM_QTY',
    'COOKIE_SECURE',
  ])('rejects missing %s', (key) => {
    const config: Record<string, unknown> = { ...validConfig };
    delete config[key];

    expect(() => validateEnvironment(config)).toThrow(`${key} is required`);
  });

  it('rejects a weak JWT secret', () => {
    expect(() =>
      validateEnvironment({ ...validConfig, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow('JWT_ACCESS_SECRET must be at least 32 bytes');
  });

  it.each([
    ['PORT', '0'],
    ['ACCESS_TOKEN_TTL_SECONDS', '59'],
    ['REFRESH_TOKEN_TTL_HOURS', '0'],
    ['REMEMBER_REFRESH_TOKEN_TTL_DAYS', '91'],
    ['REMEMBER_REFRESH_INACTIVITY_DAYS', '31'],
    ['MAX_CART_ITEM_QTY', '0'],
    ['SHIPPING_QUOTE_TTL_SECONDS', '59'],
  ])('rejects invalid numeric %s', (key, value) => {
    expect(() => validateEnvironment({ ...validConfig, [key]: value })).toThrow(
      key,
    );
  });

  it.each(['-1', '1.5', '+100', ' 30000 '])(
    'rejects invalid SHIPPING_FALLBACK_FEE %s',
    (value) => {
      expect(() =>
        validateEnvironment({
          ...validConfig,
          SHIPPING_FALLBACK_FEE: value,
        }),
      ).toThrow('SHIPPING_FALLBACK_FEE must be a non-negative decimal string');
    },
  );

  it('rejects a remember inactivity window above its absolute lifetime', () => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        REMEMBER_REFRESH_TOKEN_TTL_DAYS: '5',
        REMEMBER_REFRESH_INACTIVITY_DAYS: '7',
      }),
    ).toThrow(
      'REMEMBER_REFRESH_INACTIVITY_DAYS cannot exceed REMEMBER_REFRESH_TOKEN_TTL_DAYS',
    );
  });

  it.each(['true ', '1', 'yes'])(
    'rejects invalid COOKIE_SECURE %s',
    (value) => {
      expect(() =>
        validateEnvironment({ ...validConfig, COOKIE_SECURE: value }),
      ).toThrow('COOKIE_SECURE must be either true or false');
    },
  );

  it('rejects WEB_ORIGIN values containing paths', () => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        WEB_ORIGIN: 'http://localhost:3000/login',
      }),
    ).toThrow('WEB_ORIGIN must contain only an origin');
  });

  it('requires HTTPS origin and Secure cookies in production', () => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'http://shop.example.com',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow('WEB_ORIGIN must use HTTPS in production');

    expect(() =>
      validateEnvironment({
        ...validConfig,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://shop.example.com',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow('COOKIE_SECURE must be true in production');
  });
});
