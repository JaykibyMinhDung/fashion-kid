import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  AuditLogListResponseDto,
  AuditLogResponseDto,
} from '../dto/audit.dto';
import {
  AuditLogListQuery,
  AuditRecordCommand,
  AuditRepository,
} from './audit.repository';

const ACTOR_SELECT = {
  select: { id: true, fullName: true, email: true },
} as const;

type AuditLogRow = Prisma.AuditLogGetPayload<{
  include: { actor: typeof ACTOR_SELECT };
}>;

function toJsonInput(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value == null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

function toJsonResponse(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  return (value as Record<string, unknown> | null) ?? null;
}

@Injectable()
export class PrismaAuditRepository extends AuditRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async record(
    transaction: PrismaTransactionClient,
    command: AuditRecordCommand,
  ): Promise<void> {
    await transaction.auditLog.create({
      data: {
        actorId: command.actorId ?? null,
        action: command.action,
        entityType: command.entityType,
        entityId: command.entityId ?? null,
        oldValues: toJsonInput(command.oldValues),
        newValues: toJsonInput(command.newValues),
        metadata: toJsonInput(command.metadata),
        ipAddress: command.ipAddress ?? null,
        requestId: command.requestId ?? null,
      },
    });
  }

  async list(query: AuditLogListQuery): Promise<AuditLogListResponseDto> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lt: query.to } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { actor: ACTOR_SELECT },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map((row) => this.toResponse(row)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findById(id: string): Promise<AuditLogResponseDto | null> {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { actor: ACTOR_SELECT },
    });
    return row ? this.toResponse(row) : null;
  }

  private toResponse(row: AuditLogRow): AuditLogResponseDto {
    return {
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actor: row.actor
        ? {
            id: row.actor.id,
            fullName: row.actor.fullName,
            email: row.actor.email,
          }
        : null,
      oldValues: toJsonResponse(row.oldValues),
      newValues: toJsonResponse(row.newValues),
      metadata: toJsonResponse(row.metadata),
      ipAddress: row.ipAddress,
      requestId: row.requestId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
