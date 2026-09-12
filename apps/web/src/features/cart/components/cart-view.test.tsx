import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import type { CartResponse } from "../api/cart-client";
import { CartView } from "./cart-view";

const cartApi = vi.hoisted(() => ({
  getCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
}));

vi.mock("../api/cart-client", () => cartApi);

const USER: PublicUser = {
  id: "customer-id",
  email: "customer@example.com",
  fullName: "Customer",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
};

const ITEM = {
  cartItemId: "item-1",
  variantId: "variant-1",
  sku: "CORAL-90",
  product: { id: "product-1", name: "Set Coral", slug: "set-coral" },
  size: { id: "size-1", code: "90", name: "90" },
  color: { id: "color-1", code: "CORAL", name: "Coral", hexCode: null },
  primaryImage: null,
  quantity: 2,
  currentUnitPrice: "125000",
  lineSubtotal: "250000",
  availability: "INSUFFICIENT_STOCK" as const,
  maxAvailableForPreview: 1,
  isPurchasable: false,
  warning: "INSUFFICIENT_AVAILABLE_STOCK" as const,
};

const CART: CartResponse = {
  items: [ITEM],
  subtotal: "250000",
  itemCount: 2,
  isCheckoutReady: false,
  warnings: [
    {
      code: "INSUFFICIENT_AVAILABLE_STOCK",
      cartItemId: "item-1",
      message: "Số lượng trong giỏ vượt quá tồn kho hiện tại",
    },
  ],
};

function renderCart() {
  const client: AuthClient = {
    getCurrentUser: () => USER,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(USER),
    register: () => Promise.resolve(USER),
    refresh: () => Promise.resolve(USER),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>() => Promise.resolve({} as T),
  };
  return render(
    <AuthProvider client={client}>
      <CartView />
    </AuthProvider>,
  );
}

describe("CartView", () => {
  it("renders current price, stock warning and disables checkout readiness", async () => {
    cartApi.getCart.mockResolvedValueOnce(CART);
    renderCart();

    expect(await screen.findByText("Set Coral")).toBeInTheDocument();
    expect(screen.getByText("Chỉ còn 1 sản phẩm")).toBeInTheDocument();
    expect(screen.getAllByText(/250\.000/u)).not.toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Tiếp tục thanh toán" }),
    ).toBeDisabled();
  });

  it("sends bounded quantity mutations and updates from the returned snapshot", async () => {
    cartApi.getCart.mockResolvedValueOnce(CART);
    const updated = {
      ...CART,
      items: [{ ...ITEM, quantity: 1, lineSubtotal: "125000" }],
      itemCount: 1,
      subtotal: "125000",
    };
    cartApi.updateCartItem.mockResolvedValueOnce(updated);
    renderCart();

    await screen.findByText("Set Coral");
    fireEvent.click(screen.getByRole("button", { name: "Giảm Set Coral" }));
    await waitFor(() =>
      expect(cartApi.updateCartItem).toHaveBeenCalledWith(
        expect.any(Function),
        "item-1",
        { quantity: 1 },
      ),
    );
    expect((await screen.findAllByText(/125\.000/u)).length).toBeGreaterThan(0);
  });

  it("confirms before clearing all CartItems", async () => {
    cartApi.getCart.mockResolvedValueOnce(CART);
    cartApi.clearCart.mockResolvedValueOnce({
      ...CART,
      items: [],
      itemCount: 0,
      subtotal: "0",
      warnings: [],
      isCheckoutReady: false,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderCart();

    await screen.findByText("Set Coral");
    fireEvent.click(screen.getByRole("button", { name: "Xóa giỏ hàng" }));
    await waitFor(() => expect(cartApi.clearCart).toHaveBeenCalled());
    expect(await screen.findByText("Giỏ hàng đang trống")).toBeInTheDocument();
  });
});
