import { ShippingProviderStatus } from '../../domain/shipping.types';

export class GhnStatusMapper {
  private static readonly STATUS_MAP: Record<string, ShippingProviderStatus> = {
    // Created / ready
    ready_to_pick: 'READY_TO_PICK',
    create: 'CREATED',
    created: 'CREATED',

    // Picking / storing
    picking: 'PICKING',
    storing: 'PICKING',

    // In transit / sorting
    transporting: 'IN_TRANSIT',
    sorting: 'IN_TRANSIT',

    // Delivering
    delivering: 'DELIVERING',
    money_collect_delivering: 'DELIVERING',

    // Delivered
    delivered: 'DELIVERED',

    // Cancelled
    cancel: 'CANCELLED',
    cancelled: 'CANCELLED',

    // Returning
    waiting_to_return: 'RETURNING',
    return: 'RETURNING',
    return_transporting: 'RETURNING',
    return_sorting: 'RETURNING',
    returning: 'RETURNING',

    // Returned
    returned: 'RETURNED',

    // Exceptions
    damage: 'EXCEPTION',
    lost: 'EXCEPTION',
    exception: 'EXCEPTION',
  };

  /**
   * Maps GHN raw status string to ShippingProviderStatus allow-list.
   * Unknown strings safely fallback to 'EXCEPTION' without crashing or throwing.
   */
  static toDomainStatus(
    ghnStatus: string | null | undefined,
  ): ShippingProviderStatus {
    if (!ghnStatus) {
      return 'EXCEPTION';
    }
    const normalized = ghnStatus.trim().toLowerCase();
    return this.STATUS_MAP[normalized] ?? 'EXCEPTION';
  }

  /**
   * Provides customer-friendly status description.
   */
  static toSimplifiedStatus(status: ShippingProviderStatus): string {
    switch (status) {
      case 'CREATED':
      case 'READY_TO_PICK':
        return 'Chờ lấy hàng';
      case 'PICKING':
        return 'Đang lấy hàng';
      case 'IN_TRANSIT':
        return 'Đang vận chuyển';
      case 'DELIVERING':
        return 'Đang giao hàng';
      case 'DELIVERED':
        return 'Đã giao hàng';
      case 'CANCELLED':
        return 'Đã hủy vận đơn';
      case 'RETURNING':
        return 'Đang chuyển hoàn';
      case 'RETURNED':
        return 'Đã chuyển hoàn';
      case 'EXCEPTION':
      default:
        return 'Đang cập nhật';
    }
  }
}
