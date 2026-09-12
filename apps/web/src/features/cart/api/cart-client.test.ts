import { describe, expect, it } from "vitest";

import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "./cart-client";

describe("cart client", () => {
  it("maps every cart command to the frozen API contract", async () => {
    const calls: Array<{ path: string; method: string; body?: string }> = [];
    const request: AuthContextValue["authorizedRequest"] = async <T>(
      path: `/${string}`,
      init?: RequestInit,
    ) => {
      calls.push({
        path,
        method: init?.method ?? "GET",
        body: init?.body as string | undefined,
      });
      return {
        items: [],
        subtotal: "0",
        itemCount: 0,
        isCheckoutReady: false,
        warnings: [],
      } as T;
    };

    await getCart(request);
    await addCartItem(request, { variantId: "variant-1", quantity: 2 });
    await updateCartItem(request, "item-1", { quantity: 3 });
    await removeCartItem(request, "item-1");
    await clearCart(request);

    expect(calls).toEqual([
      { path: "/api/v1/cart", method: "GET" },
      {
        path: "/api/v1/cart/items",
        method: "POST",
        body: JSON.stringify({ variantId: "variant-1", quantity: 2 }),
      },
      {
        path: "/api/v1/cart/items/item-1",
        method: "PATCH",
        body: JSON.stringify({ quantity: 3 }),
      },
      { path: "/api/v1/cart/items/item-1", method: "DELETE" },
      { path: "/api/v1/cart", method: "DELETE" },
    ]);
  });
});
