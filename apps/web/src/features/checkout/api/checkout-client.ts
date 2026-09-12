import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type {
  CheckoutOrderResponse,
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

export function createCheckoutOrder(
  request: AuthorizedRequest,
  input: CreateCheckoutOrderInput,
): Promise<CheckoutOrderResponse> {
  return request<CheckoutOrderResponse>("/api/v1/checkout/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
