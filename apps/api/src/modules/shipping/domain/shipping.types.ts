export type ShippingDestination = {
  addressLine: string;
  wardCode: string;
  wardName: string;
  provinceCode: string;
  provinceName: string;
};

export type ShippingPackage = {
  totalWeightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type ShippingProviderStatus =
  | 'CREATED'
  | 'READY_TO_PICK'
  | 'PICKING'
  | 'IN_TRANSIT'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNING'
  | 'RETURNED'
  | 'EXCEPTION';

export type CreateShipmentItem = {
  name: string;
  code: string;
  quantity: number;
  price: number;
  weightGrams?: number;
};

export type CreateShipmentInput = {
  orderId: string;
  orderNumber: string;
  receiverName: string;
  receiverPhone: string;
  destination: ShippingDestination;
  package: ShippingPackage;
  items: CreateShipmentItem[];
  codAmount: number;
  customerNote?: string | null;
  serviceTypeId?: number;
};

export type CreateShipmentResult = {
  provider: string;
  trackingCode: string;
  providerStatus: ShippingProviderStatus;
  expectedDeliveryTime?: Date;
  fee?: bigint;
};

export type ShipmentTrackingResult = {
  provider: string;
  trackingCode: string;
  providerStatus: ShippingProviderStatus;
  simplifiedStatus: string;
  lastSyncedAt: Date;
  expectedDeliveryTime?: Date;
};
