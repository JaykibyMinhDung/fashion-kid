import type {
  Invoice,
  InvoiceStatus,
  Order,
  OrderItem,
  Payment,
  User,
} from '../../../generated/prisma/client';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';

export type InvoiceWithOrder = Invoice & {
  order: Order & {
    items: OrderItem[];
    payment?: Payment | null;
    user?: User | null;
  };
};

export interface InvoiceListQuery {
  page: number;
  limit: number;
  status?: InvoiceStatus;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface PaginatedInvoices {
  items: InvoiceWithOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class InvoiceRepository {
  abstract findByOrderId(
    orderId: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithOrder | null>;

  abstract findById(
    id: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithOrder | null>;

  abstract findByInvoiceNumber(
    invoiceNumber: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithOrder | null>;

  abstract create(
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
  ): Promise<Invoice>;

  abstract updateStatus(
    id: string,
    status: InvoiceStatus,
    voidedAt?: Date | null,
    tx?: PrismaTransactionClient,
  ): Promise<Invoice>;

  abstract findManyAdmin(query: InvoiceListQuery): Promise<PaginatedInvoices>;
}
