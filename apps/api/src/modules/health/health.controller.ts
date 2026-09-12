import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  @ApiOkResponse({
    schema: { example: { status: 'ok', service: 'api' } },
  })
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Database readiness probe' })
  @ApiOkResponse({
    schema: { example: { status: 'ok', service: 'api', database: 'up' } },
  })
  ready() {
    return this.healthService.ready();
  }
}
