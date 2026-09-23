export type CouponType = "FIXED_AMOUNT" | "PERCENTAGE";
export type CouponStatus = "ACTIVE" | "DISABLED";

export const COUPON_TYPES = ["FIXED_AMOUNT", "PERCENTAGE"] as const;

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  maxDiscountAmount: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: string;
  endsAt: string;
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
};

export type CouponListResponse = {
  items: Coupon[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CouponListQuery = {
  page: number;
  limit: number;
  q?: string;
  status?: CouponStatus;
  type?: CouponType;
};

export type CreateCouponInput = {
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: string;
  minOrderAmount?: string;
  maxDiscountAmount?: string;
  usageLimit?: number;
  perUserLimit?: number;
  startsAt: string;
  endsAt: string;
  status?: CouponStatus;
};

export type UpdateCouponInput = {
  name?: string;
  description?: string | null;
  minOrderAmount?: string;
  maxDiscountAmount?: string | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: string;
  endsAt?: string;
};

export type CouponUsageUser = {
  id: string;
  fullName: string;
  email: string;
};

export type CouponUsage = {
  id: string;
  couponId: string;
  orderId: string;
  couponCodeSnapshot: string;
  discountAmount: string;
  user: CouponUsageUser | null;
  createdAt: string;
};

export type CouponUsageListResponse = {
  items: CouponUsage[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CouponUsageListQuery = {
  page: number;
  limit: number;
  userId?: string;
  from?: string;
  to?: string;
};
