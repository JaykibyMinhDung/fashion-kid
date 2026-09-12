import { HealthService } from './health.service';
import type { PrismaService } from '../../database/prisma/prisma.service';

describe('HealthService', () => {
  it('keeps liveness independent from the database', () => {
    const service = new HealthService({} as PrismaService);

    expect(service.live()).toEqual({ status: 'ok', service: 'api' });
  });

  it('reports readiness only after a successful database query', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.ready()).resolves.toEqual({
      status: 'ok',
      service: 'api',
      database: 'up',
    });
  });

  it('maps database failure to a stable readiness error', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.ready()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      publicMessage: 'Dịch vụ chưa sẵn sàng',
    });
  });
});
