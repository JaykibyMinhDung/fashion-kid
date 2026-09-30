import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../authorization/require-permissions.decorator';
import { EmailOutboxStatus } from '../../../generated/prisma/client';
import { OutboxRepository } from '../repositories/outbox.repository';

export class OutboxRecordDto {
  id!: string;
  dedupeKey!: string;
  toEmail!: string;
  template!: string;
  payload!: Record<string, unknown>;
  status!: EmailOutboxStatus;
  attempts!: number;
  maxAttempts!: number;
  nextAttemptAt!: Date;
  lastError!: string | null;
  sentAt!: Date | null;
  createdAt!: Date;
}

export class OutboxListResponseDto {
  data!: OutboxRecordDto[];
  total!: number;
  page!: number;
  limit!: number;
}

@ApiTags('admin/email-outbox')
@ApiBearerAuth()
@Controller('admin/email-outbox')
export class AdminOutboxController {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  @Get()
  @RequirePermissions('AUDIT_READ')
  @ApiOkResponse({ type: OutboxListResponseDto })
  async list(
    @Query('status') status?: EmailOutboxStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<OutboxListResponseDto> {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(100, Math.max(1, limit || 20));

    const result = await this.outboxRepository.findMany({
      status:
        status && Object.values(EmailOutboxStatus).includes(status)
          ? status
          : undefined,
      page: safePage,
      limit: safeLimit,
    });

    return {
      data: result.data,
      total: result.total,
      page: safePage,
      limit: safeLimit,
    };
  }
}
