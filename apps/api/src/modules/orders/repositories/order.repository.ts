import type { Prisma } from '../../../generated/prisma/client';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  CustomerOrderQueryDto,
  OperationalOrderQueryDto,
} from '../dto/order.dto';

export const ORDER_DETAIL_INCLUDE = {
  items: true,
  payment: true,
  statusHistories: {
    include: { actor: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  user: { select: { fullName: true, email: true } },
} as const satisfies Prisma.OrderInclude;

export const ORDER_LIST_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  totalAmount: true,
  itemsSubtotal: true,
  shippingFee: true,
  receiverName: true,
  receiverPhone: true,
  paymentMethod: true,
  createdAt: true,
  items: { select: { quantity: true } },
  payment: { select: { status: true } },
} as const satisfies Prisma.OrderSelect;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_DETAIL_INCLUDE;
}>;

export type OrderListItemRecord = Prisma.OrderGetPayload<{
  select: typeof ORDER_LIST_SELECT;
}>;

export type OrderListResult = {
  items: OrderListItemRecord[];
  total: number;
};

export abstract class OrderRepository {
  abstract findById(
    id: string,
    tx?: PrismaTransactionClient,
  ): Promise<OrderWithRelations | null>;

  abstract findByIdForUpdate(
    tx: PrismaTransactionClient,
    id: string,
  ): Promise<OrderWithRelations | null>;

  abstract findCustomerOrders(
    userId: string,
    query: CustomerOrderQueryDto,
  ): Promise<OrderListResult>;

  abstract findOperationalOrders(
    query: OperationalOrderQueryDto,
  ): Promise<OrderListResult>;
}
