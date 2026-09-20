import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiException } from '../../../common/errors/api-error';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../generated/prisma/client';
import { OrderTransitionService } from '../../orders/services/order-transition.service';
import { ShippingProviderStatus } from '../domain/shipping.types';
import { GhnAddressMapper } from '../providers/ghn/ghn-address.mapper';
import { GhnClient } from '../providers/ghn/ghn-client';
import { GhnStatusMapper } from '../providers/ghn/ghn-status.mapper';
import {
  GhnCreateOrderRequest,
  GhnWebhookPayload,
} from '../providers/ghn/ghn.types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toNullableUuid(id?: string | null): string | null {
  return id && UUID_REGEX.test(id) ? id : null;
}

export type ShippingBlockDto = {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  shippingProvider: string | null;
  shippingServiceCode: string | null;
  shippingServiceName: string | null;
  shippingTrackingCode: string | null;
  shippingProviderStatus: ShippingProviderStatus | null;
  simplifiedStatus: string;
  shippingLastSyncedAt: Date | null;
  receiverName: string;
  receiverPhone: string;
  shippingAddressLine: string;
  shippingWardName: string;
  shippingProvinceName: string;
  isCreated: boolean;
  canCreate: boolean;
};

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ghnClient: GhnClient,
    private readonly addressMapper: GhnAddressMapper,
    private readonly orderTransitionService: OrderTransitionService,
  ) {}

  async getShippingBlock(
    orderId: string,
    userId?: string,
    roleCode?: string,
  ): Promise<ShippingBlockDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        orderNumber: true,
        status: true,
        shippingProvider: true,
        shippingServiceCode: true,
        shippingServiceName: true,
        shippingTrackingCode: true,
        shippingProviderStatus: true,
        shippingLastSyncedAt: true,
        receiverName: true,
        receiverPhone: true,
        shippingAddressLine: true,
        shippingWardName: true,
        shippingProvinceName: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // Ownership check: when userId is provided, enforce access control
    if (userId) {
      const isStaff =
        roleCode === 'ADMIN' ||
        roleCode === 'SALES_STAFF' ||
        roleCode === 'WAREHOUSE_STAFF';
      if (!isStaff && order.userId !== userId) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          'FORBIDDEN',
          'Bạn không có quyền xem thông tin vận chuyển của đơn hàng này',
        );
      }
    }

    const providerStatus = order.shippingProviderStatus
      ? (order.shippingProviderStatus as ShippingProviderStatus)
      : null;

    const isCreated = Boolean(order.shippingTrackingCode);
    const canCreate =
      !isCreated &&
      (order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.PACKING);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      shippingProvider: order.shippingProvider,
      shippingServiceCode: order.shippingServiceCode,
      shippingServiceName: order.shippingServiceName,
      shippingTrackingCode: order.shippingTrackingCode,
      shippingProviderStatus: providerStatus,
      simplifiedStatus: providerStatus
        ? GhnStatusMapper.toSimplifiedStatus(providerStatus)
        : 'Chưa tạo vận đơn',
      shippingLastSyncedAt: order.shippingLastSyncedAt,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      shippingAddressLine: order.shippingAddressLine,
      shippingWardName: order.shippingWardName,
      shippingProvinceName: order.shippingProvinceName,
      isCreated,
      canCreate,
    };
  }

  async createShipment(
    orderId: string,
    actorId: string,
  ): Promise<ShippingBlockDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // Idempotency check: if tracking code already exists, return existing block
    if (order.shippingTrackingCode) {
      this.logger.log(
        `Order ${order.orderNumber} already has tracking code ${order.shippingTrackingCode}. Returning existing.`,
      );
      return this.getShippingBlock(orderId);
    }

    // Order status check: must be CONFIRMED or PACKING
    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PACKING
    ) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'SHIPMENT_NOT_READY',
        `Chỉ có thể tạo vận đơn khi đơn hàng ở trạng thái CONFIRMED hoặc PACKING (hiện tại: ${order.status})`,
      );
    }

    // Resolve address
    const resolvedAddress = await this.addressMapper.resolveAddress({
      provinceCode: order.shippingProvinceCode,
      provinceName: order.shippingProvinceName,
      wardCode: order.shippingWardCode,
      wardName: order.shippingWardName,
      addressLine: order.shippingAddressLine,
    });

    // Compute package weight and dimensions
    let totalWeight = 0;
    let maxLength = 20;
    let maxWidth = 15;
    let maxHeight = 10;

    for (const item of order.items) {
      const weight = (item.variant?.weightGrams ?? 200) * item.quantity;
      totalWeight += weight;
      if (item.variant?.lengthCm && item.variant.lengthCm > maxLength) {
        maxLength = item.variant.lengthCm;
      }
      if (item.variant?.widthCm && item.variant.widthCm > maxWidth) {
        maxWidth = item.variant.widthCm;
      }
      if (item.variant?.heightCm && item.variant.heightCm > maxHeight) {
        maxHeight = item.variant.heightCm;
      }
    }
    totalWeight = Math.max(totalWeight, 100);

    // COD calculation
    const isCod = order.paymentMethod === PaymentMethod.COD;
    const codAmount =
      isCod && order.payment?.status === PaymentStatus.PENDING
        ? Number(order.totalAmount)
        : 0;

    const createReq: GhnCreateOrderRequest = {
      payment_type_id: 1, // Shop trả cước vận chuyển
      note: order.customerNote ?? 'Đơn hàng Mầm Nhỏ Kids',
      required_note: 'CHOXEMHANGKHONGTHU',
      client_order_code: order.orderNumber,
      to_name: order.receiverName,
      to_phone: order.receiverPhone,
      to_address: order.shippingAddressLine,
      to_ward_code: resolvedAddress.wardCode,
      to_district_id: resolvedAddress.districtId,
      cod_amount: codAmount,
      weight: Math.round(totalWeight),
      length: Math.round(maxLength),
      width: Math.round(maxWidth),
      height: Math.round(maxHeight),
      service_type_id: 2,
      items: order.items.map((it) => ({
        name: it.productName,
        code: it.sku,
        quantity: it.quantity,
        price: Number(it.unitPrice),
        weight: it.variant?.weightGrams ?? 200,
      })),
    };

    // External call outside transaction with Timeout Reconcile
    let trackingCode: string;
    let providerStatus: ShippingProviderStatus = 'READY_TO_PICK';

    try {
      const ghnRes = await this.ghnClient.createOrder(createReq);
      trackingCode = ghnRes.order_code;
    } catch (err: unknown) {
      this.logger.warn(
        `GHN createOrder failed or timed out for order ${order.orderNumber}: ${(err as Error).message}. Attempting reconcile...`,
      );

      // Reconcile: check detail-by-client-code
      try {
        const detail = await this.ghnClient.getOrderDetailByClientCode(
          order.orderNumber,
        );
        if (detail && detail.order_code) {
          this.logger.log(
            `Reconciliation found existing GHN shipment for ${order.orderNumber}: ${detail.order_code}`,
          );
          trackingCode = detail.order_code;
          providerStatus = GhnStatusMapper.toDomainStatus(detail.status);
        } else {
          throw err;
        }
      } catch (reconcileErr) {
        if (reconcileErr === err) {
          throw err;
        }
        throw err;
      }
    }

    // Persist in short database transaction
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          shippingProvider: 'GHN',
          shippingTrackingCode: trackingCode,
          shippingProviderStatus: providerStatus,
          shippingLastSyncedAt: now,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          changedBy: toNullableUuid(actorId),
          note: `Đã tạo vận đơn GHN: ${trackingCode}`,
        },
      });
    });

    return this.getShippingBlock(orderId);
  }

  async syncStatus(
    orderId: string,
    actorId: string,
  ): Promise<ShippingBlockDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        shippingTrackingCode: true,
        shippingProvider: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    if (!order.shippingTrackingCode || order.shippingProvider !== 'GHN') {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'GHN_SHIPMENT_NOT_FOUND',
        'Đơn hàng chưa có mã vận đơn GHN để đồng bộ',
      );
    }

    const detail = await this.ghnClient.getOrderDetail(
      order.shippingTrackingCode,
    );
    const domainStatus = GhnStatusMapper.toDomainStatus(detail.status);
    const now = new Date();

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        shippingProviderStatus: domainStatus,
        shippingLastSyncedAt: now,
        updatedAt: now,
      },
    });

    // Delivered automation (AC-GHN-W-04): If delivered and currently SHIPPING, trigger deliver transition
    // Use 'SYSTEM' actor — delivery detection is automated, consistent with webhook handler
    if (domainStatus === 'DELIVERED' && order.status === OrderStatus.SHIPPING) {
      try {
        await this.orderTransitionService.deliver(order.id, 'SYSTEM', 'ADMIN');
      } catch (err) {
        this.logger.error(
          `Failed to transition order ${order.orderNumber} to DELIVERED during sync: ${(err as Error).message}`,
        );
      }
    }

    return this.getShippingBlock(orderId);
  }

  async handleWebhook(
    payload: GhnWebhookPayload,
  ): Promise<{ received: boolean; status?: string; ignored?: boolean }> {
    if (!payload || !payload.OrderCode) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'GHN_INVALID_RESPONSE',
        'Webhook payload thiếu OrderCode',
      );
    }

    const trackingCode = payload.OrderCode.trim();
    const clientOrderCode = payload.ClientOrderCode?.trim();

    // Find order by tracking code or client order code
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { shippingTrackingCode: trackingCode },
          ...(clientOrderCode ? [{ orderNumber: clientOrderCode }] : []),
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        shippingTrackingCode: true,
        shippingProviderStatus: true,
      },
    });

    // AC-GHN-W-03: Unknown order webhook no data corruption
    if (!order) {
      this.logger.warn(
        `GHN Webhook received for unknown order: OrderCode=${trackingCode}, ClientCode=${clientOrderCode}. Ignored safely.`,
      );
      return { received: true, ignored: true };
    }

    const domainStatus = GhnStatusMapper.toDomainStatus(payload.Status);
    const now = new Date();

    // Update tracking status
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        shippingProviderStatus: domainStatus,
        shippingLastSyncedAt: now,
        updatedAt: now,
      },
    });

    // AC-GHN-W-04 & AC-GHN-W-05: DELIVERED triggers order delivery ONLY if currently SHIPPING
    // System actor is used, inventory is NOT decremented
    if (domainStatus === 'DELIVERED' && order.status === OrderStatus.SHIPPING) {
      this.logger.log(
        `GHN Webhook: Order ${order.orderNumber} delivered. Transitioning order status to DELIVERED via System actor.`,
      );
      try {
        await this.orderTransitionService.deliver(order.id, 'SYSTEM', 'ADMIN');
      } catch (err) {
        this.logger.error(
          `Failed to transition order ${order.orderNumber} to DELIVERED from webhook: ${(err as Error).message}`,
        );
      }
    }

    return { received: true, status: domainStatus };
  }
}
