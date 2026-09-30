import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type {
  CheckoutOrderResponse,
  CouponValidationResponse,
  CreateCheckoutOrderInput,
  ShippingQuote,
} from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export function calculateShippingQuote(
  request: AuthorizedRequest,
  addressId: string,
): Promise<ShippingQuote> {
  return request<ShippingQuote>("/api/v1/shipping/quote", {
    method: "POST",
    body: JSON.stringify({ addressId }),
  });
}

export function validateCoupon(
  request: AuthorizedRequest,
  code: string,
): Promise<CouponValidationResponse> {
  return request<CouponValidationResponse>("/api/v1/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function createCheckoutOrder(
  request: AuthorizedRequest,
  input: CreateCheckoutOrderInput,
): Promise<CheckoutOrderResponse> {
  return request<CheckoutOrderResponse>("/api/v1/checkout/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
