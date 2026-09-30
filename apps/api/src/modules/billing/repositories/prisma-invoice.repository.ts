import { Injectable } from '@nestjs/common';
import {
  Prisma,
  InvoiceStatus,
  type Invoice,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import {
  InvoiceListQuery,
  InvoiceRepository,
  InvoiceWithOrder,
  PaginatedInvoices,
} from './invoice.repository';

const ORDER_INCLUDES = {
  items: true,
  payment: true,
  user: true,
};

@Injectable()
export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaTransactionClient) {
    return tx ?? this.prisma;
  }

  async findByOrderId(
    orderId: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithOrder | null> {
    return this.getClient(tx).invoice.findUnique({
      where: { orderId },
      include: {
        order: {
          include: ORDER_INCLUDES,
        },
      },
    });
  }

  async findById(
    id: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithOrder | null> {
    return this.getClient(tx).invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: ORDER_INCLUDES,
        },
      },
    });
  }

  async findByInvoiceNumber(
    invoiceNumber: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithOrder | null> {
    return this.getClient(tx).invoice.findUnique({
      where: { invoiceNumber },
      include: {
        order: {
          include: ORDER_INCLUDES,
        },
      },
    });
  }

  async create(
    data: {
      orderId: string;
      invoiceNumber: string;
      status?: InvoiceStatus;
      issuedAt: Date;
      currency?: string;
      netAmount: bigint;
      taxRateBps: number;
      taxAmount: bigint;
      grossAmount: bigint;
      sellerSnapshot: Record<string, unknown>;
      buyerSnapshot: Record<string, unknown>;
    },
    tx?: PrismaTransactionClient,
  ): Promise<Invoice> {
    return this.getClient(tx).invoice.create({
      data: {
        orderId: data.orderId,
        invoiceNumber: data.invoiceNumber,
        status: data.status ?? InvoiceStatus.ISSUED,
        issuedAt: data.issuedAt,
        currency: data.currency ?? 'VND',
        netAmount: data.netAmount,
        taxRateBps: data.taxRateBps,
        taxAmount: data.taxAmount,
        grossAmount: data.grossAmount,
        sellerSnapshot: data.sellerSnapshot as Prisma.InputJsonValue,
        buyerSnapshot: data.buyerSnapshot as Prisma.InputJsonValue,
      },
    });
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    voidedAt?: Date | null,
    tx?: PrismaTransactionClient,
  ): Promise<Invoice> {
    return this.getClient(tx).invoice.update({
      where: { id },
      data: {
        status,
        voidedAt: voidedAt ?? null,
      },
    });
  }

  async findManyAdmin(query: InvoiceListQuery): Promise<PaginatedInvoices> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.from || query.to) {
      where.issuedAt = {};
      if (query.from) {
        where.issuedAt.gte = query.from;
      }
      if (query.to) {
        where.issuedAt.lt = query.to;
      }
    }

    if (query.search?.trim()) {
      const searchTrimmed = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: searchTrimmed, mode: 'insensitive' } },
        {
          order: {
            orderNumber: { contains: searchTrimmed, mode: 'insensitive' },
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          order: {
            include: ORDER_INCLUDES,
          },
        },
      }) as Promise<InvoiceWithOrder[]>,
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
