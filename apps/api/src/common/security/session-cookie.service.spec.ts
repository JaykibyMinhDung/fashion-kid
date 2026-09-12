import { ConfigService } from '@nestjs/config';
import { SessionCookieService } from './session-cookie.service';

describe('SessionCookieService', () => {
  it('uses a host-only secure cookie in production', () => {
    const service = new SessionCookieService(
      new ConfigService({ NODE_ENV: 'production', COOKIE_SECURE: true }),
    );
    const expiresAt = new Date(Date.now() + 86_400_000);
    const options = service.createOptions(true, expiresAt);

    expect(service.name).toBe('__Host-kf_refresh');
    expect(options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        expires: expiresAt,
      }),
    );
    expect(options).not.toHaveProperty('domain');
    expect(options.maxAge).toBeGreaterThan(86_399_000);
    expect(options.maxAge).toBeLessThanOrEqual(86_400_000);
  });

  it('uses the local cookie name and no persistence for a browser session', () => {
    const service = new SessionCookieService(
      new ConfigService({ NODE_ENV: 'development', COOKIE_SECURE: false }),
    );
    const options = service.createOptions(false);

    expect(service.name).toBe('kf_refresh');
    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    });
    expect(options).not.toHaveProperty('maxAge');
    expect(options).not.toHaveProperty('expires');
  });

  it('clears with the same scope but without expiration inherited from a session', () => {
    const service = new SessionCookieService(
      new ConfigService({ NODE_ENV: 'test', COOKIE_SECURE: false }),
    );

    expect(service.createClearOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    });
  });

  it('requires an absolute expiration for a persistent cookie', () => {
    const service = new SessionCookieService(
      new ConfigService({ NODE_ENV: 'development', COOKIE_SECURE: false }),
    );

    expect(() => service.createOptions(true)).toThrow(
      'Persistent refresh cookies require an expiration',
    );
  });
});
