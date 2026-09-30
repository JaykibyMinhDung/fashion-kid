import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  AuditLogListResponseDto,
  AuditLogResponseDto,
} from '../dto/audit.dto';

export type AuditRecordCommand = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  requestId?: string | null;
};

export type AuditLogListQuery = {
  page: number;
  limit: number;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
};

export abstract class AuditRepository {
  abstract record(
    transaction: PrismaTransactionClient,
    command: AuditRecordCommand,
  ): Promise<void>;

  abstract list(query: AuditLogListQuery): Promise<AuditLogListResponseDto>;

  abstract findById(id: string): Promise<AuditLogResponseDto | null>;
}
