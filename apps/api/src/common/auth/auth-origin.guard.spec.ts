import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { AuthOriginGuard } from './auth-origin.guard';

function contextWithOrigin(origin?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name.toLowerCase() === 'origin' ? origin : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuthOriginGuard', () => {
  const guard = new AuthOriginGuard(
    new ConfigService({ WEB_ORIGIN: 'http://localhost:3000' }),
  );

  it.each([undefined, 'http://localhost:3000'])(
    'allows the configured browser origin or an origin-less API client',
    (origin) => {
      expect(guard.canActivate(contextWithOrigin(origin))).toBe(true);
    },
  );

  it.each(['https://attacker.example', 'null', 'http://localhost:3000.evil'])(
    'rejects untrusted browser origin %s',
    (origin) => {
      expect.assertions(1);
      try {
        guard.canActivate(contextWithOrigin(origin));
      } catch (error: unknown) {
        expect(error).toMatchObject({
          code: 'FORBIDDEN',
          publicMessage: 'Nguồn yêu cầu không được phép',
        });
      }
    },
  );
});
