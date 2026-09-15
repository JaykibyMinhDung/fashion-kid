import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { AuditService } from './audit.service';
import {
  AuditLogListResponseDto,
  ListAuditLogsQueryDto,
} from './dto/audit.dto';
@ApiTags('admin-audit')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@RequirePermissions('AUDIT_READ')
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get()
  @ApiOperation({ summary: 'List audit logs' })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  list(@Query() query: ListAuditLogsQueryDto) {
    return this.service.list(query);
  }
}
