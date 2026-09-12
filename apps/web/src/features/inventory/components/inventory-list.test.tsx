import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import type { InventoryListResponse } from "../api/inventory-client";
import { InventoryList } from "./inventory-list";

const WAREHOUSE_USER: PublicUser = {
  id: "warehouse-id",
  email: "warehouse@example.com",
  fullName: "Warehouse User",
  phone: null,
  avatarUrl: null,
  role: "WAREHOUSE_STAFF",
};

const RESULT: InventoryListResponse = {
  items: [
    {
      inventoryId: "inventory-1",
      variantId: "variant-1",
      warehouse: {
        id: "warehouse-1",
        code: "MAIN_WAREHOUSE",
        name: "Kho chính",
        address: null,
        status: "ACTIVE",
      },
      variant: {
        id: "variant-1",
        sku: "CORAL-90",
        product: { id: "product-1", name: "Set Coral", slug: "set-coral" },
        size: { id: "size-1", code: "90", name: "90" },
        color: { id: "color-1", code: "CORAL", name: "Coral", hexCode: null },
      },
      onHand: 12,
      reserved: 2,
      available: 10,
      updatedAt: "2026-09-04T10:00:00.000Z",
    },
  ],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
};

function renderInventory(
  handler: (path: `/${string}`, init?: RequestInit) => Promise<unknown>,
) {
  const client: AuthClient = {
    getCurrentUser: () => WAREHOUSE_USER,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(WAREHOUSE_USER),
    register: () => Promise.resolve(WAREHOUSE_USER),
    refresh: () => Promise.resolve(WAREHOUSE_USER),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>(path: `/${string}`, init?: RequestInit) =>
      handler(path, init) as Promise<T>,
  };
  return render(
    <AuthProvider client={client}>
      <InventoryList basePath="/warehouse/inventory" />
    </AuthProvider>,
  );
}

describe("InventoryList", () => {
  it("loads real inventory rows and sends server search/filter requests", async () => {
    const paths: string[] = [];
    renderInventory((path) => {
      paths.push(path);
      return Promise.resolve(RESULT);
    });

    expect(await screen.findByText("CORAL-90")).toBeInTheDocument();
    expect(screen.getByText("Set Coral")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Điều chỉnh CORAL-90" }),
    ).toHaveAttribute("href", "/warehouse/inventory/variant-1/adjust");

    fireEvent.change(screen.getByPlaceholderText("SKU hoặc tên sản phẩm"), {
      target: { value: "coral" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
    await waitFor(() => expect(paths).toHaveLength(2));
    expect(paths[1]).toContain("q=coral");
  });
});
