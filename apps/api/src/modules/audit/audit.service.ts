import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
  ListAuditLogsQueryDto,
  AuditLogListResponseDto,
} from './dto/audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: ListAuditLogsQueryDto): Promise<AuditLogListResponseDto> {
    const {
      page = 1,
      limit = 20,
      action,
      entityType,
      actorId,
      entityId,
      requestId,
      from,
      to,
    } = query;
    const where: Prisma.AuditLogWhereInput = {
      ...(action && { action }),
      ...(entityType && { entityType }),
      ...(actorId && { actorId }),
      ...(entityId && { entityId }),
      ...(requestId && { requestId }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorId: true,
          action: true,
          entityType: true,
          entityId: true,
          requestId: true,
          ipAddress: true,
          createdAt: true,
          actor: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
