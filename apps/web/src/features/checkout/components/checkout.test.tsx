import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import type { Address } from "@/features/addresses/contracts";
import type { CartResponse } from "@/features/cart/api/cart-client";
import { CheckoutAddressSelector } from "./checkout-address-selector";
import { CheckoutOrderSummary } from "./checkout-order-summary";
import { CheckoutForm } from "./checkout-form";

const USER: PublicUser = {
  id: "user-1",
  email: "customer@mam-nho.local",
  fullName: "Test Customer",
  phone: "+84901234567",
  avatarUrl: null,
  role: "CUSTOMER",
};

const MOCK_ADDRESS: Address = {
  id: "addr-1",
  receiverName: "Nguyen Van A",
  phone: "+84901234567",
  addressLine: "123 Le Loi",
  wardCode: "00001",
  wardName: "Phuong Ben Nghe",
  provinceCode: "01",
  provinceName: "TP Ho Chi Minh",
  note: null,
  isDefault: true,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

const MOCK_CART: CartResponse = {
  items: [
    {
      cartItemId: "item-1",
      variantId: "var-1",
      sku: "TEST-SKU-1",
      quantity: 2,
      currentUnitPrice: "150000",
      lineSubtotal: "300000",
      availability: "AVAILABLE",
      maxAvailableForPreview: 10,
      isPurchasable: true,
      warning: null,
      product: {
        id: "prod-1",
        name: "Áo thun bé trai",
        slug: "ao-thun-be-trai",
      },
      size: { id: "sz-1", code: "M", name: "M" },
      color: { id: "cl-1", code: "RED", name: "Đỏ", hexCode: null },
      primaryImage: null,
    },
  ],
  subtotal: "300000",
  itemCount: 2,
  isCheckoutReady: true,
  warnings: [],
};

function authClient(
  handler: (path: string, init?: RequestInit) => Promise<unknown>,
): AuthClient {
  return {
    getCurrentUser: () => USER,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(USER),
    register: () => Promise.resolve(USER),
    refresh: () => Promise.resolve(USER),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>(path: `/${string}`, init?: RequestInit) =>
      handler(path, init) as Promise<T>,
  };
}

describe("CheckoutAddressSelector", () => {
  it("renders empty state when no addresses exist", () => {
    render(
      <CheckoutAddressSelector
        addresses={[]}
        selectedAddressId={null}
        onSelect={() => {}}
      />,
    );

    expect(
      screen.getByText("Bạn chưa có sổ địa chỉ nhận hàng"),
    ).toBeInTheDocument();
  });

  it("renders addresses and triggers onSelect when an address is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <CheckoutAddressSelector
        addresses={[MOCK_ADDRESS]}
        selectedAddressId={MOCK_ADDRESS.id}
        onSelect={handleSelect}
      />,
    );

    expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
    expect(screen.getByText("Mặc định")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Nguyen Van A"));
    expect(handleSelect).toHaveBeenCalledWith(MOCK_ADDRESS.id);
  });
});

describe("CheckoutOrderSummary", () => {
  it("renders items and pricing breakdown correctly", () => {
    render(
      <CheckoutOrderSummary
        items={MOCK_CART.items}
        subtotal={MOCK_CART.subtotal}
        shippingFee="30000"
        total="330000"
      />,
    );

    expect(screen.getByText("Áo thun bé trai")).toBeInTheDocument();
    expect(screen.getByText("Tạm tính")).toBeInTheDocument();
    expect(screen.getByText("Phí vận chuyển")).toBeInTheDocument();
    expect(screen.getByText("Tổng thanh toán")).toBeInTheDocument();
  });
});

describe("CheckoutForm", () => {
  it("fetches shipping quote and submits order successfully", async () => {
    const handleSuccess = vi.fn();

    const client = authClient(async (path, init) => {
      if (path === "/api/v1/shipping/quote") {
        return {
          fee: "30000",
          source: "FALLBACK",
          serviceName: "Giao hàng tiêu chuẩn",
          quoteFingerprint: "signed-quote",
          expiresAt: "2026-09-09T12:05:00.000Z",
        };
      }
      if (path === "/api/v1/checkout/orders") {
        const body = JSON.parse(init?.body as string);
        expect(body.addressId).toBe(MOCK_ADDRESS.id);
        expect(body.paymentMethod).toBe("COD");
        expect(body.quoteFingerprint).toBe("signed-quote");
        expect(body.customerNote).toBe("Giao vào buổi sáng");
        return {
          id: "ord-1",
          orderNumber: "ORD-20260907-000001",
          status: "PENDING",
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <AuthProvider client={client}>
        <CheckoutForm
          cart={MOCK_CART}
          addresses={[MOCK_ADDRESS]}
          onSuccess={handleSuccess}
        />
      </AuthProvider>,
    );

    // Shipping quote should be loaded
    await waitFor(() => {
      expect(screen.getByText("Xác nhận đặt hàng COD")).toBeInTheDocument();
    });

    // Enter customer note
    const noteInput = screen.getByPlaceholderText(
      /Ví dụ: Giao hàng vào giờ hành chính/i,
    );
    fireEvent.change(noteInput, { target: { value: "Giao vào buổi sáng" } });

    // Click submit button
    const submitButton = screen.getByRole("button", {
      name: "Xác nhận đặt hàng COD",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith("ORD-20260907-000001", "COD");
    });
  });
});
