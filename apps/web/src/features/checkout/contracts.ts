export type ShippingQuote = {
  fee: string;
  source: "PROVIDER" | "FALLBACK";
  provider?: string;
  serviceCode?: string;
  serviceName?: string;
  estimatedDays?: number;
  quoteFingerprint: string;
  expiresAt: string;
};

export type CheckoutOrderItem = {
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

export type CheckoutOrderPayment = {
  id: string;
  method: string;
  status: string;
  amount: string;
  currency: string;
};

export type CheckoutOrderShipping = {
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
  shippingQuoteSource: "PROVIDER" | "FALLBACK";
  shippingFee: string;
};

export type CheckoutOrderResponse = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  itemsSubtotal: string;
  discountAmount: string;
  shippingFee: string;
  totalAmount: string;
  customerNote: string | null;
  items: CheckoutOrderItem[];
  payment: CheckoutOrderPayment;
  shipping: CheckoutOrderShipping;
  createdAt: string;
  updatedAt: string;
};

export type CreateCheckoutOrderInput = {
  addressId: string;
  paymentMethod: "COD" | "ONLINE";
  quoteFingerprint: string;
  customerNote?: string | null;
  couponCode?: string | null;
};

export type CouponType = "FIXED_AMOUNT" | "PERCENTAGE";

export type CouponValidationResponse = {
  code: string;
  type: CouponType | null;
  discountAmount: string;
  itemsSubtotal: string;
  eligible: boolean;
  reasonCode: string | null;
  expiresAt: string | null;
};

export type AppliedCoupon = {
  code: string;
  type: CouponType | null;
  discountAmount: string;
};
