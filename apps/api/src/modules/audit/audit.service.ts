import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../database/prisma/prisma.types';
import {
  AuditLogListResponseDto,
  AuditLogResponseDto,
  ListAuditLogsQueryDto,
} from './dto/audit.dto';
import {
  AuditRecordCommand,
  AuditRepository,
} from './repositories/audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  /**
   * Ghi một bản ghi nhật ký trong CÙNG transaction với mutation nhạy cảm.
   * Nếu ghi audit thất bại thì transaction rollback theo chính sách Day 11.
   */
  record(
    transaction: PrismaTransactionClient,
    command: AuditRecordCommand,
  ): Promise<void> {
    return this.repository.record(transaction, command);
  }

  list(query: ListAuditLogsQueryDto): Promise<AuditLogListResponseDto> {
    return this.repository.list({
      page: query.page,
      limit: query.limit,
      actorId: query.actorId,
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  async get(id: string): Promise<AuditLogResponseDto> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Không tìm thấy bản ghi nhật ký');
    }
    return row;
  }
}
