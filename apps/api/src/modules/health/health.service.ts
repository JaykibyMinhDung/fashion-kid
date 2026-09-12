import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';
import { PrismaService } from '../../database/prisma/prisma.service';

export type LivenessResponse = {
  status: 'ok';
  service: 'api';
};

export type ReadinessResponse = LivenessResponse & {
  database: 'up';
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  live(): LivenessResponse {
    return { status: 'ok', service: 'api' };
  }

  async ready(): Promise<ReadinessResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_UNAVAILABLE',
        'Dịch vụ chưa sẵn sàng',
      );
    }
    return { ...this.live(), database: 'up' };
  }
}
