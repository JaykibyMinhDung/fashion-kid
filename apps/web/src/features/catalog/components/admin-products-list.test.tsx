import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import { AdminProductsList } from "./admin-products-list";
import type { AdminProductList } from "../api/admin-catalog-client";

const ADMIN: PublicUser = {
  id: "admin-id",
  email: "admin@example.com",
  fullName: "Admin",
  phone: null,
  avatarUrl: null,
  role: "ADMIN",
};

const PRODUCT = {
  id: "product-1",
  categoryId: "category-1",
  categoryName: "Bé trai",
  brandId: "brand-1",
  brandName: "Mầm Nhỏ",
  name: "Set Coral",
  slug: "set-coral",
  description: null,
  gender: "UNISEX" as const,
  ageGroup: "2-5 tuổi",
  status: "DISABLED" as const,
  imageCount: 1,
  variantCount: 2,
  activeVariantCount: 0,
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
};

function response(status: "ACTIVE" | "DISABLED" = "DISABLED"): AdminProductList {
  return {
    items: [{ ...PRODUCT, status }],
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  };
}

function renderList(handler: AuthClient["authorizedRequest"]) {
  const client: AuthClient = {
    getCurrentUser: () => ADMIN,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(ADMIN),
    register: () => Promise.resolve(ADMIN),
    refresh: () => Promise.resolve(ADMIN),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: handler,
  };
  return render(<AuthProvider client={client}><AdminProductsList /></AuthProvider>);
}

describe("AdminProductsList", () => {
  it("loads server products and master filters, then activates a product", async () => {
    let status: "ACTIVE" | "DISABLED" = "DISABLED";
    const paths: string[] = [];
    const handler = async <T,>(path: `/${string}`, init?: RequestInit): Promise<T> => {
      paths.push(path);
      if (init?.method === "PATCH") {
        status = "ACTIVE";
        return { id: PRODUCT.id, status } as T;
      }
      if (path.endsWith("/categories")) return [{ id: "category-1", name: "Bé trai", slug: "be-trai", parentId: null, description: null, status: "ACTIVE" }] as T;
      if (path.endsWith("/brands")) return [{ id: "brand-1", name: "Mầm Nhỏ", slug: "mam-nho", description: null, logoUrl: null, status: "ACTIVE" }] as T;
      if (path.endsWith("/sizes")) return [] as T;
      if (path.endsWith("/colors")) return [] as T;
      return response(status) as T;
    };
    renderList(handler);

    expect(await screen.findByText("Set Coral")).toBeInTheDocument();
    expect(screen.getByText("DISABLED")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kích hoạt" }));
    await waitFor(() => expect(screen.getByText("Đã kích hoạt sản phẩm.")).toBeInTheDocument());
    expect(paths.some((path) => path.endsWith("/products/product-1/status"))).toBe(true);
  });
});
