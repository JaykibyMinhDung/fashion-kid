const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;

function requireString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function parseInteger(
  config: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): number {
  const rawValue = requireString(config, key);
  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${key} must be an integer`);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${key} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function parseBoolean(config: Record<string, unknown>, key: string): boolean {
  const value = requireString(config, key);
  if (value !== 'true' && value !== 'false') {
    throw new Error(`${key} must be either true or false`);
  }
  return value === 'true';
}

function parseNonNegativeDecimalString(
  config: Record<string, unknown>,
  key: string,
  defaultValue: string,
): string {
  const rawValue = config[key] ?? defaultValue;
  if (typeof rawValue !== 'string' || !/^(0|[1-9]\d*)$/.test(rawValue)) {
    throw new Error(`${key} must be a non-negative decimal string`);
  }
  return rawValue;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnvironment = requireString(config, 'NODE_ENV');
  if (
    !NODE_ENV_VALUES.includes(
      nodeEnvironment as (typeof NODE_ENV_VALUES)[number],
    )
  ) {
    throw new Error(`NODE_ENV must be one of ${NODE_ENV_VALUES.join(', ')}`);
  }

  const databaseUrl = requireString(config, 'DATABASE_URL');
  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol');
  }

  const webOrigin = requireString(config, 'WEB_ORIGIN');
  let parsedWebOrigin: URL;
  try {
    parsedWebOrigin = new URL(webOrigin);
  } catch {
    throw new Error('WEB_ORIGIN must be a valid URL');
  }
  if (!['http:', 'https:'].includes(parsedWebOrigin.protocol)) {
    throw new Error('WEB_ORIGIN must use HTTP or HTTPS');
  }
  if (parsedWebOrigin.origin !== webOrigin) {
    throw new Error('WEB_ORIGIN must contain only an origin');
  }
  if (
    nodeEnvironment === 'production' &&
    parsedWebOrigin.protocol !== 'https:'
  ) {
    throw new Error('WEB_ORIGIN must use HTTPS in production');
  }

  const jwtAccessSecret = requireString(config, 'JWT_ACCESS_SECRET');
  if (Buffer.byteLength(jwtAccessSecret, 'utf8') < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 bytes');
  }
  requireString(config, 'JWT_ISSUER');
  requireString(config, 'JWT_AUDIENCE');

  const port = parseInteger(config, 'PORT', 1, 65_535);
  const accessTokenTtlSeconds = parseInteger(
    config,
    'ACCESS_TOKEN_TTL_SECONDS',
    60,
    3_600,
  );
  const refreshTokenTtlHours = parseInteger(
    config,
    'REFRESH_TOKEN_TTL_HOURS',
    1,
    168,
  );
  const rememberRefreshTokenTtlDays = parseInteger(
    config,
    'REMEMBER_REFRESH_TOKEN_TTL_DAYS',
    1,
    90,
  );
  const rememberRefreshInactivityDays = parseInteger(
    config,
    'REMEMBER_REFRESH_INACTIVITY_DAYS',
    1,
    30,
  );
  const maxCartItemQty = parseInteger(config, 'MAX_CART_ITEM_QTY', 1, 1_000);
  const shippingQuoteTtlSeconds =
    config.SHIPPING_QUOTE_TTL_SECONDS === undefined
      ? 300
      : parseInteger(config, 'SHIPPING_QUOTE_TTL_SECONDS', 60, 1_800);
  const shippingFallbackFee = parseNonNegativeDecimalString(
    config,
    'SHIPPING_FALLBACK_FEE',
    '30000',
  );
  const vatDefaultRateBps =
    config.VAT_DEFAULT_RATE_BPS === undefined
      ? 800
      : parseInteger(config, 'VAT_DEFAULT_RATE_BPS', 0, 10_000);

  const mailDriver = (config.MAIL_DRIVER as string) || 'smtp';
  if (!['smtp', 'console'].includes(mailDriver)) {
    throw new Error('MAIL_DRIVER must be either smtp or console');
  }

  const mailHost = (config.MAIL_HOST as string) || 'localhost';
  const mailPort =
    config.MAIL_PORT === undefined
      ? 1025
      : parseInteger(config, 'MAIL_PORT', 1, 65_535);
  const mailSecure =
    config.MAIL_SECURE === undefined
      ? false
      : parseBoolean(config, 'MAIL_SECURE');
  const mailFrom =
    (config.MAIL_FROM as string) || 'Mầm Nhỏ <no-reply@mamnho.local>';
  const appPublicUrl =
    (config.APP_PUBLIC_URL as string) || 'http://localhost:3000';
  const mailWorkerIntervalSec =
    config.MAIL_WORKER_INTERVAL_SEC === undefined
      ? 15
      : parseInteger(config, 'MAIL_WORKER_INTERVAL_SEC', 1, 3_600);
  const mailWorkerBatch =
    config.MAIL_WORKER_BATCH === undefined
      ? 20
      : parseInteger(config, 'MAIL_WORKER_BATCH', 1, 500);
  const passwordResetOtpTtlMin =
    config.PASSWORD_RESET_OTP_TTL_MIN === undefined
      ? 10
      : parseInteger(config, 'PASSWORD_RESET_OTP_TTL_MIN', 1, 1_440);
  const passwordResetLinkTtlMin =
    config.PASSWORD_RESET_LINK_TTL_MIN === undefined
      ? 30
      : parseInteger(config, 'PASSWORD_RESET_LINK_TTL_MIN', 1, 1_440);
  const emailVerificationTtlHours =
    config.EMAIL_VERIFICATION_TTL_HOURS === undefined
      ? 24
      : parseInteger(config, 'EMAIL_VERIFICATION_TTL_HOURS', 1, 168);

  if (rememberRefreshInactivityDays > rememberRefreshTokenTtlDays) {
    throw new Error(
      'REMEMBER_REFRESH_INACTIVITY_DAYS cannot exceed REMEMBER_REFRESH_TOKEN_TTL_DAYS',
    );
  }

  const cookieSecure = parseBoolean(config, 'COOKIE_SECURE');
  if (nodeEnvironment === 'production' && !cookieSecure) {
    throw new Error('COOKIE_SECURE must be true in production');
  }

  if (config.VNPAY_ENABLED === 'true') {
    requireString(config, 'VNPAY_TMN_CODE');
    requireString(config, 'VNPAY_HASH_SECRET');
    requireString(config, 'VNPAY_PAYMENT_URL');
    requireString(config, 'VNPAY_RETURN_URL');
  }

  return {
    ...config,
    PORT: port,
    ACCESS_TOKEN_TTL_SECONDS: accessTokenTtlSeconds,
    REFRESH_TOKEN_TTL_HOURS: refreshTokenTtlHours,
    REMEMBER_REFRESH_TOKEN_TTL_DAYS: rememberRefreshTokenTtlDays,
    REMEMBER_REFRESH_INACTIVITY_DAYS: rememberRefreshInactivityDays,
    MAX_CART_ITEM_QTY: maxCartItemQty,
    SHIPPING_QUOTE_TTL_SECONDS: shippingQuoteTtlSeconds,
    SHIPPING_FALLBACK_FEE: shippingFallbackFee,
    VAT_DEFAULT_RATE_BPS: vatDefaultRateBps,
    MAIL_DRIVER: mailDriver,
    MAIL_HOST: mailHost,
    MAIL_PORT: mailPort,
    MAIL_SECURE: mailSecure,
    MAIL_FROM: mailFrom,
    APP_PUBLIC_URL: appPublicUrl,
    MAIL_WORKER_INTERVAL_SEC: mailWorkerIntervalSec,
    MAIL_WORKER_BATCH: mailWorkerBatch,
    PASSWORD_RESET_OTP_TTL_MIN: passwordResetOtpTtlMin,
    PASSWORD_RESET_LINK_TTL_MIN: passwordResetLinkTtlMin,
    EMAIL_VERIFICATION_TTL_HOURS: emailVerificationTtlHours,
    COOKIE_SECURE: cookieSecure,
  };
}
