import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type {
  Coupon,
  CouponListQuery,
  CouponListResponse,
  CouponStatus,
  CouponUsageListQuery,
  CouponUsageListResponse,
  CreateCouponInput,
  UpdateCouponInput,
} from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export function getCoupons(
  request: AuthorizedRequest,
  query: CouponListQuery,
): Promise<CouponListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
  });
  return request<CouponListResponse>(`/api/v1/admin/coupons?${params}`);
}

export function createCoupon(
  request: AuthorizedRequest,
  input: CreateCouponInput,
): Promise<Coupon> {
  return request<Coupon>("/api/v1/admin/coupons", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCoupon(
  request: AuthorizedRequest,
  id: string,
  input: UpdateCouponInput,
): Promise<Coupon> {
  return request<Coupon>(`/api/v1/admin/coupons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateCouponStatus(
  request: AuthorizedRequest,
  id: string,
  status: CouponStatus,
): Promise<Coupon> {
  return request<Coupon>(`/api/v1/admin/coupons/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getCouponUsages(
  request: AuthorizedRequest,
  id: string,
  query: CouponUsageListQuery,
): Promise<CouponUsageListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });
  return request<CouponUsageListResponse>(
    `/api/v1/admin/coupons/${id}/usages?${params}`,
  );
}
