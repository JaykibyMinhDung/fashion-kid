import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenService } from './access-token.service';

const TEST_CONFIG = {
  JWT_ACCESS_SECRET: 'unit-test-secret-with-at-least-32-random-bytes',
  JWT_ISSUER: 'kids-fashion-api-test',
  JWT_AUDIENCE: 'kids-fashion-web-test',
  ACCESS_TOKEN_TTL_SECONDS: 900,
};

describe('AccessTokenService', () => {
  const jwtService = new JwtService();
  const service = new AccessTokenService(
    jwtService,
    new ConfigService(TEST_CONFIG),
  );

  it('signs and verifies the approved minimal access-token claims', async () => {
    const token = await service.sign(
      '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
      'CUSTOMER',
    );
    const verified = await service.verify(token);

    expect(verified).not.toBeNull();
    if (!verified) {
      throw new Error('Expected a verified access token');
    }

    expect(verified).toEqual(
      expect.objectContaining({
        sub: '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
        role: 'CUSTOMER',
        ver: 0,
        typ: 'access',
        iss: TEST_CONFIG.JWT_ISSUER,
        aud: TEST_CONFIG.JWT_AUDIENCE,
      }),
    );
    expect(typeof verified.iat).toBe('number');
    expect(typeof verified.exp).toBe('number');
    expect(verified.jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(verified.exp - verified.iat).toBe(900);
    expect(Object.keys(verified).sort()).toEqual([
      'aud',
      'exp',
      'iat',
      'iss',
      'jti',
      'role',
      'sub',
      'typ',
      'ver',
    ]);
  });

  it('rejects a tampered token', async () => {
    const token = await service.sign(
      '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
      'ADMIN',
    );
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    await expect(service.verify(tampered)).resolves.toBeNull();
  });

  it('rejects a token with the wrong typ', async () => {
    const token = await jwtService.signAsync(
      {
        sub: '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
        role: 'CUSTOMER',
        typ: 'refresh',
      },
      {
        secret: TEST_CONFIG.JWT_ACCESS_SECRET,
        algorithm: 'HS256',
        issuer: TEST_CONFIG.JWT_ISSUER,
        audience: TEST_CONFIG.JWT_AUDIENCE,
        expiresIn: 900,
        jwtid: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      },
    );

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('rejects a token with the wrong audience', async () => {
    const token = await jwtService.signAsync(
      {
        sub: '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
        role: 'CUSTOMER',
        typ: 'access',
      },
      {
        secret: TEST_CONFIG.JWT_ACCESS_SECRET,
        algorithm: 'HS256',
        issuer: TEST_CONFIG.JWT_ISSUER,
        audience: 'another-client',
        expiresIn: 900,
        jwtid: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      },
    );

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await jwtService.signAsync(
      {
        sub: '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
        role: 'CUSTOMER',
        typ: 'access',
      },
      {
        secret: TEST_CONFIG.JWT_ACCESS_SECRET,
        algorithm: 'HS256',
        issuer: TEST_CONFIG.JWT_ISSUER,
        audience: TEST_CONFIG.JWT_AUDIENCE,
        expiresIn: -1,
        jwtid: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      },
    );

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('rejects tokens signed with an algorithm outside the allowlist', async () => {
    const token = await jwtService.signAsync(
      {
        sub: '3e6e952e-1052-4e3c-a93c-9e0114c0b59e',
        role: 'CUSTOMER',
        typ: 'access',
      },
      {
        secret: TEST_CONFIG.JWT_ACCESS_SECRET,
        algorithm: 'HS384',
        issuer: TEST_CONFIG.JWT_ISSUER,
        audience: TEST_CONFIG.JWT_AUDIENCE,
        expiresIn: 900,
        jwtid: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
      },
    );

    await expect(service.verify(token)).resolves.toBeNull();
  });
});
