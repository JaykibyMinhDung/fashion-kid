import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  CustomerOrderQueryDto,
  OperationalOrderQueryDto,
} from '../dto/order.dto';
import {
  ORDER_DETAIL_INCLUDE,
  ORDER_LIST_SELECT,
  OrderRepository,
  type OrderListResult,
  type OrderWithRelations,
} from './order.repository';

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    tx?: PrismaTransactionClient,
  ): Promise<OrderWithRelations | null> {
    const client = tx ?? this.prisma;
    return client.order.findUnique({
      where: { id },
      include: ORDER_DETAIL_INCLUDE,
    });
  }

  async findByIdForUpdate(
    tx: PrismaTransactionClient,
    id: string,
  ): Promise<OrderWithRelations | null> {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id}::uuid FOR UPDATE`;
    return tx.order.findUnique({
      where: { id },
      include: ORDER_DETAIL_INCLUDE,
    });
  }

  async findCustomerOrders(
    userId: string,
    query: CustomerOrderQueryDto,
  ): Promise<OrderListResult> {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total };
  }

  async findOperationalOrders(
    query: OperationalOrderQueryDto,
  ): Promise<OrderListResult> {
    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.orderNumber) {
      where.orderNumber = {
        contains: query.orderNumber.trim(),
        mode: 'insensitive',
      };
    }

    const sortOrder: Prisma.SortOrder =
      query.sort === 'createdAt:asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_LIST_SELECT,
        orderBy: { createdAt: sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total };
  }
}
