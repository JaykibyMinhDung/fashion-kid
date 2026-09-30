import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import {
  AuditLogListResponseDto,
  AuditLogResponseDto,
  ListAuditLogsQueryDto,
} from './dto/audit.dto';
import { AuditService } from './audit.service';

@ApiTags('admin-audit-logs')
@ApiBearerAuth()
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @RequirePermissions('AUDIT_READ')
  @ApiOperation({ summary: 'List audit logs (append-only, read-only)' })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  list(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('AUDIT_READ')
  @ApiOperation({ summary: 'Read a single audit log entry' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AuditLogResponseDto })
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AuditLogResponseDto> {
    return this.service.get(id);
  }
}
