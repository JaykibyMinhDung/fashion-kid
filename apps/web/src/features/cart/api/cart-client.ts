import type { AuthContextValue } from "@/features/auth/session/auth-provider";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export type CartAvailability =
  "AVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "NOT_SELLABLE";

export type CartWarningCode =
  "OUT_OF_STOCK" | "INSUFFICIENT_AVAILABLE_STOCK" | "VARIANT_NOT_SELLABLE";

export type CartItem = {
  cartItemId: string;
  variantId: string;
  sku: string;
  product: { id: string; name: string; slug: string };
  size: { id: string; code: string; name: string };
  color: { id: string; code: string; name: string; hexCode: string | null };
  primaryImage: { id: string; url: string; altText: string | null } | null;
  quantity: number;
  currentUnitPrice: string;
  lineSubtotal: string;
  availability: CartAvailability;
  maxAvailableForPreview: number | null;
  isPurchasable: boolean;
  warning: CartWarningCode | null;
};

export type CartWarning = {
  code: CartWarningCode;
  cartItemId: string;
  message: string;
};

export type CartResponse = {
  items: CartItem[];
  subtotal: string;
  itemCount: number;
  isCheckoutReady: boolean;
  warnings: CartWarning[];
};

export type AddCartItemInput = { variantId: string; quantity: number };
export type UpdateCartItemInput = { quantity: number };

export function getCart(request: AuthorizedRequest): Promise<CartResponse> {
  return request<CartResponse>("/api/v1/cart");
}

export function addCartItem(
  request: AuthorizedRequest,
  input: AddCartItemInput,
): Promise<CartResponse> {
  return request<CartResponse>("/api/v1/cart/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCartItem(
  request: AuthorizedRequest,
  cartItemId: string,
  input: UpdateCartItemInput,
): Promise<CartResponse> {
  return request<CartResponse>(
    `/api/v1/cart/items/${encodeURIComponent(cartItemId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function removeCartItem(
  request: AuthorizedRequest,
  cartItemId: string,
): Promise<CartResponse> {
  return request<CartResponse>(
    `/api/v1/cart/items/${encodeURIComponent(cartItemId)}`,
    { method: "DELETE" },
  );
}

export function clearCart(request: AuthorizedRequest): Promise<CartResponse> {
  return request<CartResponse>("/api/v1/cart", { method: "DELETE" });
}
