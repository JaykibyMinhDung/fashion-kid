export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "SHIPPING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type AllowedAction =
  "CONFIRM" | "CANCEL" | "START_PACKING" | "SHIP" | "DELIVER" | "COMPLETE";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang đóng gói",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
};

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-900 border-blue-200",
  PACKING: "bg-purple-100 text-purple-900 border-purple-200",
  SHIPPING: "bg-indigo-100 text-indigo-900 border-indigo-200",
  DELIVERED: "bg-teal-100 text-teal-900 border-teal-200",
  COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-900 border-rose-200",
};

export type OrderItem = {
  id: string;
  variantId: string;
  productName: string;
  sku: string;
  colorName: string;
  sizeName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
};

export type OrderPayment = {
  id: string;
  method: string;
  status: string;
  amount: string;
  currency: string;
  paidAt?: string | null;
  cancelledAt?: string | null;
};

export type OrderShipping = {
  receiverName: string;
  receiverPhone: string;
  shippingAddressLine: string;
  shippingWardCode: string;
  shippingWardName: string;
  shippingProvinceCode: string;
  shippingProvinceName: string;
  shippingProvider?: string | null;
  shippingServiceCode?: string | null;
  shippingServiceName?: string | null;
  shippingTrackingCode?: string | null;
  shippingFee: string;
};

export type OrderStatusHistory = {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy?: string | null;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string;
  itemsSubtotal: string;
  shippingFee: string;
  itemCount: number;
  receiverName: string;
  receiverPhone: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
};

export type OrderListResponse = {
  items: OrderListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  userId?: string;
  customerEmail?: string | null;
  customerName?: string | null;
  status: OrderStatus;
  currency: string;
  itemsSubtotal: string;
  discountAmount: string;
  shippingFee: string;
  totalAmount: string;
  customerNote?: string | null;
  cancelReason?: string | null;
  confirmedAt?: string | null;
  packingAt?: string | null;
  shippingAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  items: OrderItem[];
  payment?: OrderPayment | null;
  shipping: OrderShipping;
  statusHistories: OrderStatusHistory[];
  allowedActions: AllowedAction[];
  createdAt: string;
  updatedAt: string;
};

export type CustomerOrderQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
};

export type OperationalOrderQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  orderNumber?: string;
  sort?: string;
};
