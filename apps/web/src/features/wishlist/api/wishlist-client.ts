import type { WishlistCheckResponse, WishlistResponse } from "../contracts";

type AuthorizedRequest = <T>(
  path: `/${string}`,
  options?: RequestInit,
) => Promise<T>;

export async function getWishlist(
  request: AuthorizedRequest,
): Promise<WishlistResponse> {
  return request<WishlistResponse>("/api/v1/wishlist/");
}

export async function addToWishlist(
  request: AuthorizedRequest,
  productId: string,
): Promise<void> {
  await request<void>("/api/v1/wishlist/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
}

export async function removeFromWishlist(
  request: AuthorizedRequest,
  productId: string,
): Promise<void> {
  await request<void>(`/api/v1/wishlist/${productId}`, {
    method: "DELETE",
  });
}

export async function checkWishlist(
  request: AuthorizedRequest,
  productId: string,
): Promise<WishlistCheckResponse> {
  return request<WishlistCheckResponse>(
    `/api/v1/wishlist/check/${productId}`,
  );
}
