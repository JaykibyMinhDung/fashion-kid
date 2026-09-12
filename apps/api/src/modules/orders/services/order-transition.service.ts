import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTxStatus,
  PaymentTxType,
} from '../../../generated/prisma/client';
import { roleHasPermissions } from '../../../authorization/role-permissions';
import { ApiException } from '../../../common/errors/api-error';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type { RoleCode } from '../../auth/auth.types';
import {
  InventoryRepository,
  type ReserveInventoryLine,
} from '../../inventory/repositories/inventory.repository';
import type { AllowedAction, OrderDetailResponseDto } from '../dto/order.dto';
import {
  OrderRepository,
  type OrderWithRelations,
} from '../repositories/order.repository';

export function mapOrderToDetailDto(
  order: OrderWithRelations,
  allowedActions: AllowedAction[],
  audience: 'CUSTOMER' | 'OPERATIONAL' = 'OPERATIONAL',
): OrderDetailResponseDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    ...(audience === 'OPERATIONAL'
      ? {
          userId: order.userId,
          customerEmail: order.user?.email ?? null,
          customerName: order.user?.fullName ?? null,
        }
      : {}),
    status: order.status,
    currency: order.currency,
    itemsSubtotal: order.itemsSubtotal.toString(),
    discountAmount: order.discountAmount.toString(),
    shippingFee: order.shippingFee.toString(),
    totalAmount: order.totalAmount.toString(),
    customerNote: order.customerNote,
    cancelReason: order.cancelReason,
    confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
    packingAt: order.packingAt ? order.packingAt.toISOString() : null,
    shippingAt: order.shippingAt ? order.shippingAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    items: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      colorName: item.colorName,
      sizeName: item.sizeName,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity,
      lineTotal: item.lineTotal.toString(),
    })),
    payment: order.payment
      ? {
          id: order.payment.id,
          method: order.payment.method,
          status: order.payment.status,
          amount: order.payment.amount.toString(),
          currency: order.payment.currency,
          paidAt: order.payment.paidAt
            ? order.payment.paidAt.toISOString()
            : null,
          cancelledAt: order.payment.cancelledAt
            ? order.payment.cancelledAt.toISOString()
            : null,
        }
      : null,
    shipping: {
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      shippingAddressLine: order.shippingAddressLine,
      shippingWardCode: order.shippingWardCode,
      shippingWardName: order.shippingWardName,
      shippingProvinceCode: order.shippingProvinceCode,
      shippingProvinceName: order.shippingProvinceName,
      shippingProvider: order.shippingProvider,
      shippingServiceCode: order.shippingServiceCode,
      shippingServiceName: order.shippingServiceName,
      shippingTrackingCode: order.shippingTrackingCode,
      shippingFee: order.shippingFee.toString(),
    },
    statusHistories: order.statusHistories.map((history) => ({
      id: history.id,
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      ...(audience === 'OPERATIONAL'
        ? {
            changedBy: history.changedBy,
            actorName: history.actor?.fullName ?? null,
          }
        : {}),
      note: history.note,
      createdAt: history.createdAt.toISOString(),
    })),
    allowedActions,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

@Injectable()
export class OrderTransitionService {
  private readonly logger = new Logger(OrderTransitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepository: OrderRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  getAllowedActions(
    order: Pick<OrderWithRelations, 'status' | 'userId'>,
    userRole: RoleCode,
    userId: string,
  ): AllowedAction[] {
    const actions = new Set<AllowedAction>();
    const status = order.status;

    if (status === OrderStatus.PENDING) {
      if (roleHasPermissions(userRole, ['ORDER_CONFIRM'])) {
        actions.add('CONFIRM');
      }
      if (roleHasPermissions(userRole, ['ORDER_CANCEL_ANY'])) {
        actions.add('CANCEL');
      } else if (
        userRole === 'CUSTOMER' &&
        order.userId === userId &&
        roleHasPermissions(userRole, ['ORDER_CANCEL_OWN'])
      ) {
        actions.add('CANCEL');
      }
    } else if (status === OrderStatus.CONFIRMED) {
      if (roleHasPermissions(userRole, ['ORDER_PACK'])) {
        actions.add('START_PACKING');
      }
      if (roleHasPermissions(userRole, ['ORDER_CANCEL_ANY'])) {
        actions.add('CANCEL');
      } else if (
        userRole === 'CUSTOMER' &&
        order.userId === userId &&
        roleHasPermissions(userRole, ['ORDER_CANCEL_OWN'])
      ) {
        actions.add('CANCEL');
      }
    } else if (status === OrderStatus.PACKING) {
      if (roleHasPermissions(userRole, ['ORDER_SHIP'])) {
        actions.add('SHIP');
      }
    } else if (status === OrderStatus.SHIPPING) {
      if (roleHasPermissions(userRole, ['ORDER_DELIVER'])) {
        actions.add('DELIVER');
      }
    } else if (status === OrderStatus.DELIVERED) {
      if (roleHasPermissions(userRole, ['ORDER_COMPLETE'])) {
        actions.add('COMPLETE');
      }
    }

    return Array.from(actions);
  }

  async confirm(
    orderId: string,
    actorId: string,
    actorRole: RoleCode,
  ): Promise<OrderDetailResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findByIdForUpdate(tx, orderId);
      if (!order) {
        this.logMissingOrder('CONFIRM', orderId, actorId);
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (order.status !== OrderStatus.PENDING) {
        this.logRejectedTransition('CONFIRM', order, actorId, 'BAD_STATUS');
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_ORDER_TRANSITION',
          `Không thể xác nhận đơn hàng đang ở trạng thái ${order.status}`,
        );
      }

      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: now,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          changedBy: actorId,
          note: 'Xác nhận đơn hàng thành công',
        },
      });

      const updated = await this.orderRepository.findById(order.id, tx);
      const allowedActions = this.getAllowedActions(
        updated!,
        actorRole,
        actorId,
      );
      return mapOrderToDetailDto(updated!, allowedActions);
    });
  }

  async cancelByCustomer(
    orderId: string,
    userId: string,
    reason: string,
  ): Promise<OrderDetailResponseDto> {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Lý do huỷ đơn hàng không được để trống');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findByIdForUpdate(tx, orderId);
      if (!order || order.userId !== userId) {
        this.logMissingOrder('CANCEL', orderId, userId);
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.CONFIRMED
      ) {
        this.logRejectedTransition('CANCEL', order, userId, 'BAD_STATUS');
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_ORDER_TRANSITION',
          `Không thể huỷ đơn hàng khi đơn đã ở trạng thái ${order.status}`,
        );
      }

      this.ensureCancellablePayment(order, userId);

      await this.executeInventoryRelease(tx, order, userId);
      await this.executePaymentCancellation(tx, order, trimmedReason);

      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: now,
          cancelReason: trimmedReason,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          changedBy: userId,
          note: trimmedReason,
        },
      });

      const updated = await this.orderRepository.findById(order.id, tx);
      const allowedActions = this.getAllowedActions(
        updated!,
        'CUSTOMER',
        userId,
      );
      return mapOrderToDetailDto(updated!, allowedActions, 'CUSTOMER');
    });
  }

  async cancelByStaff(
    orderId: string,
    actorId: string,
    actorRole: RoleCode,
    reason: string,
  ): Promise<OrderDetailResponseDto> {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Lý do huỷ đơn hàng không được để trống');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findByIdForUpdate(tx, orderId);
      if (!order) {
        this.logMissingOrder('CANCEL', orderId, actorId);
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.CONFIRMED
      ) {
        this.logRejectedTransition('CANCEL', order, actorId, 'BAD_STATUS');
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_ORDER_TRANSITION',
          `Không thể huỷ đơn hàng khi đơn đã ở trạng thái ${order.status}`,
        );
      }

      this.ensureCancellablePayment(order, actorId);

      await this.executeInventoryRelease(tx, order, actorId);
      await this.executePaymentCancellation(tx, order, trimmedReason);

      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: now,
          cancelReason: trimmedReason,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          changedBy: actorId,
          note: trimmedReason,
        },
      });

      const updated = await this.orderRepository.findById(order.id, tx);
      const allowedActions = this.getAllowedActions(
        updated!,
        actorRole,
        actorId,
      );
      return mapOrderToDetailDto(updated!, allowedActions);
    });
  }

  async startPacking(
    orderId: string,
    actorId: string,
    actorRole: RoleCode,
  ): Promise<OrderDetailResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findByIdForUpdate(tx, orderId);
      if (!order) {
        this.logMissingOrder('START_PACKING', orderId, actorId);
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (order.status !== OrderStatus.CONFIRMED) {
        this.logRejectedTransition(
          'START_PACKING',
          order,
          actorId,
          'BAD_STATUS',
        );
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_ORDER_TRANSITION',
          `Chỉ có thể đóng gói đơn hàng đang ở trạng thái CONFIRMED (hiện tại: ${order.status})`,
        );
      }

      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PACKING,
          packingAt: now,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.CONFIRMED,
          toStatus: OrderStatus.PACKING,
          changedBy: actorId,
          note: 'Bắt đầu đóng gói đơn hàng',
        },
      });

      const updated = await this.orderRepository.findById(order.id, tx);
      const allowedActions = this.getAllowedActions(
        updated!,
        actorRole,
        actorId,
      );
      return mapOrderToDetailDto(updated!, allowedActions);
    });
  }

  async ship(
    orderId: string,
    actorId: string,
    actorRole: RoleCode,
  ): Promise<OrderDetailResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findByIdForUpdate(tx, orderId);
      if (!order) {
        this.logMissingOrder('SHIP', orderId, actorId);
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (order.status !== OrderStatus.PACKING) {
        this.logRejectedTransition('SHIP', order, actorId, 'BAD_STATUS');
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_ORDER_TRANSITION',
          `Chỉ có thể xuất kho giao hàng cho đơn ở trạng thái PACKING (hiện tại: ${order.status})`,
        );
      }

      // Execute SALE inventory mutation
      const lines = await this.resolveOrderInventoryLines(tx, order);
      await this.inventoryRepository.saleMany(tx, {
        lines,
        referenceType: 'ORDER',
        referenceId: order.id,
        actorId,
        note: `Xuất kho giao hàng cho đơn ${order.orderNumber}`,
      });

      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.SHIPPING,
          shippingAt: now,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PACKING,
          toStatus: OrderStatus.SHIPPING,
          changedBy: actorId,
          note: 'Xuất kho và bàn giao cho đơn vị vận chuyển',
        },
      });

      const updated = await this.orderRepository.findById(order.id, tx);
      const allowedActions = this.getAllowedActions(
        updated!,
        actorRole,
        actorId,
      );
      return mapOrderToDetailDto(updated!, allowedActions);
    });
  }

  async deliver(
    orderId: string,
    actorId: string,
    actorRole: RoleCode,
  ): Promise<OrderDetailResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findByIdForUpdate(tx, orderId);
      if (!order) {
        this.logMissingOrder('DELIVER', orderId, actorId);
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (order.status !== OrderStatus.SHIPPING) {
        this.logRejectedTransition('DELIVER', order, actorId, 'BAD_STATUS');
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_ORDER_TRANSITION',
          `Chỉ có thể đánh dấu đã giao cho đơn ở trạng thái SHIPPING (hiện tại: ${order.status})`,
        );
      }

      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: now,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.SHIPPING,
          toStatus: OrderStatus.DELIVERED,
          changedBy: actorId,
          note: 'Giao hàng thành công tới người nhận',
        },
      });

      const updated = await this.orderRepository.findById(order.id, tx);
      const allowedActions = this.getAllowedActions(
        updated!,
        actorRole,
        actorId,
      );
      return mapOrderToDetailDto(updated!, allowedActions);
    });
  }

  async complete(
    orderId: string,
    actorId: string,
    actorRole: RoleCode,
  ): Promise<OrderDetailResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findByIdForUpdate(tx, orderId);
      if (!order) {
        this.logMissingOrder('COMPLETE', orderId, actorId);
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (order.status !== OrderStatus.DELIVERED) {
        this.logRejectedTransition('COMPLETE', order, actorId, 'BAD_STATUS');
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_ORDER_TRANSITION',
          `Chỉ có thể hoàn tất đơn hàng khi đã DELIVERED (hiện tại: ${order.status})`,
        );
      }

      if (
        !order.payment ||
        order.payment.method !== PaymentMethod.COD ||
        order.payment.status !== PaymentStatus.PENDING
      ) {
        this.logRejectedTransition(
          'COMPLETE',
          order,
          actorId,
          'INVALID_PAYMENT_STATE',
        );
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_ORDER_TRANSITION',
          'Không thể hoàn tất đơn hàng khi thanh toán COD không hợp lệ',
        );
      }

      const now = new Date();

      // Mark payment PAID with COD_COLLECTED transaction
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: now,
          updatedAt: now,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: order.payment.id,
          type: PaymentTxType.COD_COLLECTED,
          status: PaymentTxStatus.SUCCESS,
          amount: order.payment.amount,
          attemptRef: `${order.id}-COD-COLLECT`,
          responseMessage: 'Đã thu tiền COD khi giao hàng thành công',
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.COMPLETED,
          completedAt: now,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.DELIVERED,
          toStatus: OrderStatus.COMPLETED,
          changedBy: actorId,
          note: 'Hoàn tất đơn hàng và quyết toán COD',
        },
      });

      const updated = await this.orderRepository.findById(order.id, tx);
      const allowedActions = this.getAllowedActions(
        updated!,
        actorRole,
        actorId,
      );
      return mapOrderToDetailDto(updated!, allowedActions);
    });
  }

  private ensureCancellablePayment(
    order: OrderWithRelations,
    actorId: string,
  ): void {
    // Day 15 §19: đơn đã thanh toán (online PAID) không được huỷ khi chưa có domain refund.
    if (order.payment && order.payment.status === PaymentStatus.PAID) {
      this.logRejectedTransition('CANCEL', order, actorId, 'PAID_ORDER');
      throw new ApiException(
        HttpStatus.CONFLICT,
        'PAID_ORDER_CANNOT_CANCEL',
        'Không thể huỷ đơn hàng đã thanh toán; cần quy trình hoàn tiền (refund) riêng',
      );
    }
  }

  private async executeInventoryRelease(
    tx: PrismaTransactionClient,
    order: OrderWithRelations,
    actorId: string,
  ): Promise<void> {
    const lines = await this.resolveOrderInventoryLines(tx, order);
    await this.inventoryRepository.releaseMany(tx, {
      lines,
      referenceType: 'ORDER',
      referenceId: order.id,
      actorId,
      note: `Hoàn trả tồn kho cho đơn huỷ ${order.orderNumber}`,
    });
  }

  private logRejectedTransition(
    action: AllowedAction,
    order: Pick<OrderWithRelations, 'id' | 'status' | 'payment'>,
    actorId: string,
    reason: string,
  ): void {
    this.logger.warn({
      event: 'order_transition_rejected',
      action,
      orderId: order.id,
      actorId,
      orderStatus: order.status,
      paymentMethod: order.payment?.method ?? null,
      paymentStatus: order.payment?.status ?? null,
      reason,
    });
  }

  private logMissingOrder(
    action: AllowedAction,
    orderId: string,
    actorId: string,
  ): void {
    this.logger.warn({
      event: 'order_transition_target_unavailable',
      action,
      orderId,
      actorId,
    });
  }

  private async executePaymentCancellation(
    tx: PrismaTransactionClient,
    order: OrderWithRelations,
    reason: string,
  ): Promise<void> {
    if (order.payment && order.payment.status !== PaymentStatus.CANCELLED) {
      const now = new Date();
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.CANCELLED,
          cancelledAt: now,
          updatedAt: now,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: order.payment.id,
          type: PaymentTxType.PAYMENT_CANCELLED,
          status: PaymentTxStatus.CANCELLED,
          amount: order.payment.amount,
          attemptRef: `${order.id}-PAYMENT-CANCEL`,
          responseMessage: reason,
        },
      });
    }
  }

  private async resolveOrderInventoryLines(
    tx: PrismaTransactionClient,
    order: OrderWithRelations,
  ): Promise<ReserveInventoryLine[]> {
    const reserveLedgers = await tx.inventoryTransaction.findMany({
      where: {
        referenceType: 'ORDER',
        referenceId: order.id,
        type: 'RESERVE',
      },
      select: {
        warehouseId: true,
        variantId: true,
        quantity: true,
      },
    });

    if (reserveLedgers.length > 0) {
      return reserveLedgers.map((ledger) => ({
        warehouseId: ledger.warehouseId,
        variantId: ledger.variantId,
        quantity: ledger.quantity,
      }));
    }

    // Fallback if not found in transaction ledger: resolve active warehouse
    const warehouse =
      (await tx.warehouse.findFirst({
        where: { code: 'MAIN_WAREHOUSE', status: EntityStatus.ACTIVE },
        select: { id: true },
      })) ??
      (await tx.warehouse.findFirst({
        where: { status: EntityStatus.ACTIVE },
        select: { id: true },
      }));

    if (!warehouse) {
      throw new ConflictException('Không tìm thấy kho hàng hợp lệ để hoàn kho');
    }

    return order.items.map((item) => ({
      warehouseId: warehouse.id,
      variantId: item.variantId,
      quantity: item.quantity,
    }));
  }
}
