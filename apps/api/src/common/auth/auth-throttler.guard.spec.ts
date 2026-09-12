import { RefreshTokenService } from '../security/refresh-token.service';
import { buildAuthThrottleTracker } from './auth-throttler.guard';

describe('Auth throttler tracker', () => {
  const refreshTokenService = new RefreshTokenService();

  it('uses IP and a canonical-email digest for login without exposing email', () => {
    const tracker = buildAuthThrottleTracker(
      {
        ip: '127.0.0.1',
        path: '/api/v1/auth/login',
        body: { email: '  USER@Example.COM ' },
      },
      refreshTokenService,
      'kf_refresh',
    );
    const sameIdentity = buildAuthThrottleTracker(
      {
        ip: '127.0.0.1',
        path: '/api/v1/auth/login',
        body: { email: 'user@example.com' },
      },
      refreshTokenService,
      'kf_refresh',
    );

    expect(tracker).toBe(sameIdentity);
    expect(tracker).toMatch(/^127\.0\.0\.1:email:[0-9a-f]{64}$/);
    expect(tracker).not.toContain('user@example.com');
  });

  it('uses only the parsed selector for refresh and never the secret', () => {
    const generated = refreshTokenService.generate();
    const tracker = buildAuthThrottleTracker(
      {
        ip: '127.0.0.1',
        path: '/api/v1/auth/refresh',
        cookies: { kf_refresh: generated.token },
      },
      refreshTokenService,
      'kf_refresh',
    );

    expect(tracker).toBe(`127.0.0.1:refresh:${generated.selector}`);
    expect(tracker).not.toContain(generated.token.split('.')[1] ?? 'secret');
  });

  it('buckets malformed refresh input without retaining raw data', () => {
    const tracker = buildAuthThrottleTracker(
      {
        ip: '127.0.0.1',
        path: '/api/v1/auth/refresh',
        cookies: { kf_refresh: 'raw-malformed-secret' },
      },
      refreshTokenService,
      'kf_refresh',
    );

    expect(tracker).toBe('127.0.0.1:refresh:malformed');
    expect(tracker).not.toContain('raw-malformed-secret');
  });

  it('uses IP only for registration and unrelated routes', () => {
    expect(
      buildAuthThrottleTracker(
        { ip: '127.0.0.1', path: '/api/v1/auth/register' },
        refreshTokenService,
        'kf_refresh',
      ),
    ).toBe('127.0.0.1');
  });
});
