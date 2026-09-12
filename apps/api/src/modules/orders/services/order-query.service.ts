import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '../../../generated/prisma/client';
import type { RoleCode } from '../../auth/auth.types';
import type {
  CustomerOrderQueryDto,
  OrderDetailResponseDto,
  OrderListItemResponseDto,
  OrderListResponseDto,
  OperationalOrderQueryDto,
} from '../dto/order.dto';
import {
  OrderRepository,
  type OrderListItemRecord,
} from '../repositories/order.repository';
import {
  OrderTransitionService,
  mapOrderToDetailDto,
} from './order-transition.service';

@Injectable()
export class OrderQueryService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderTransitionService: OrderTransitionService,
  ) {}

  async getCustomerOrders(
    userId: string,
    query: CustomerOrderQueryDto,
  ): Promise<OrderListResponseDto> {
    const result = await this.orderRepository.findCustomerOrders(userId, query);
    return this.buildListResponse(
      result.items,
      result.total,
      query.page,
      query.limit,
    );
  }

  async getCustomerOrderDetail(
    userId: string,
    orderId: string,
  ): Promise<OrderDetailResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    const allowedActions = this.orderTransitionService.getAllowedActions(
      order,
      'CUSTOMER',
      userId,
    );
    return mapOrderToDetailDto(order, allowedActions, 'CUSTOMER');
  }

  async getOperationalOrders(
    query: OperationalOrderQueryDto,
  ): Promise<OrderListResponseDto> {
    const result = await this.orderRepository.findOperationalOrders(query);
    return this.buildListResponse(
      result.items,
      result.total,
      query.page,
      query.limit,
    );
  }

  async getOperationalOrderDetail(
    orderId: string,
    userRole: RoleCode,
    userId: string,
  ): Promise<OrderDetailResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    const allowedActions = this.orderTransitionService.getAllowedActions(
      order,
      userRole,
      userId,
    );
    return mapOrderToDetailDto(order, allowedActions);
  }

  private buildListResponse(
    items: OrderListItemRecord[],
    total: number,
    page: number,
    limit: number,
  ): OrderListResponseDto {
    const totalPages = Math.ceil(total / limit) || 1;
    const mappedItems: OrderListItemResponseDto[] = items.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      itemsSubtotal: order.itemsSubtotal.toString(),
      shippingFee: order.shippingFee.toString(),
      itemCount: order.items.reduce(
        (sum: number, item) => sum + item.quantity,
        0,
      ),
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.payment?.status ?? PaymentStatus.PENDING,
      createdAt: order.createdAt.toISOString(),
    }));

    return {
      items: mappedItems,
      page,
      limit,
      total,
      totalPages,
    };
  }
}
