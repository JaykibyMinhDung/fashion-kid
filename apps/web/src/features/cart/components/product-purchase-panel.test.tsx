import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import type { CatalogVariant } from "@/features/catalog/api/catalog-client";
import { ProductPurchasePanel } from "./product-purchase-panel";

const addCartItem = vi.hoisted(() => vi.fn());
const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("../api/cart-client", () => ({ addCartItem }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const USER: PublicUser = {
  id: "customer-id",
  email: "customer@example.com",
  fullName: "Customer",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
};

const VARIANTS: CatalogVariant[] = [
  {
    id: "variant-1",
    sku: "CORAL-90",
    price: "125000",
    status: "ACTIVE",
    size: { id: "size-1", code: "90", name: "90", sortOrder: 1 },
    color: { id: "color-1", code: "CORAL", name: "Coral", hexCode: null },
  },
];

function renderPanel() {
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
      <ProductPurchasePanel variants={VARIANTS} />
    </AuthProvider>,
  );
}

describe("ProductPurchasePanel", () => {
  it("sends only the selected variant and quantity to Cart API", async () => {
    addCartItem.mockResolvedValueOnce({});
    renderPanel();

    const addButton = await screen.findByRole("button", {
      name: "Thêm vào giỏ hàng",
    });
    fireEvent.click(addButton);
    await waitFor(() =>
      expect(addCartItem).toHaveBeenCalledWith(expect.any(Function), {
        variantId: "variant-1",
        quantity: 1,
      }),
    );
    expect(
      await screen.findByText("Đã thêm 1 sản phẩm vào giỏ hàng."),
    ).toBeInTheDocument();
  });
});
