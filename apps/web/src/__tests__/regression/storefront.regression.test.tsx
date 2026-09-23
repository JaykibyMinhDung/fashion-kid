import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/(store)/page";
import {
  getProducts,
  type CatalogProductList,
} from "@/features/catalog/api/catalog-client";

vi.mock("@/features/catalog/api/catalog-client", () => ({
  getProducts: vi.fn(),
}));

const featuredProducts = [
  { id: "prd-001", slug: "set-ao-khoac-coral", name: "Set áo khoác Coral" },
  { id: "prd-002", slug: "set-so-mi-sage", name: "Set sơ mi Sage" },
  { id: "prd-003", slug: "romper-muslin-apricot", name: "Romper Muslin Apricot" },
];

const mockCatalogList: CatalogProductList = {
  items: featuredProducts.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    gender: null,
    ageGroup: null,
    category: { id: "cat-1", name: "Bộ mặc ngoài", slug: "bo-mac-ngoai", parentId: null },
    brand: null,
    primaryImage: null,
    minPrice: "349000",
    maxPrice: "399000",
  })),
  page: 1,
  limit: 3,
  total: 3,
  totalPages: 1,
};

beforeEach(() => {
  vi.mocked(getProducts).mockResolvedValue(mockCatalogList);
});

describe("REG-STOREFRONT-001: approved homepage", () => {
  it("keeps the approved hero and collection entry point", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /dịu dàng cùng bé qua từng ngày lớn khôn/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /khám phá bộ sưu tập/i }),
    ).toHaveAttribute("href", "/products");
  });

  it("keeps all approved category destinations", async () => {
    render(await HomePage());

    expect(screen.getByRole("link", { name: /bé gái/i })).toHaveAttribute(
      "href",
      "/products?category=be-gai",
    );
    expect(screen.getByRole("link", { name: /bé trai/i })).toHaveAttribute(
      "href",
      "/products?category=be-trai",
    );
    expect(
      screen.getByRole("link", { name: /sơ sinh.*xem sản phẩm/i }),
    ).toHaveAttribute(
      "href",
      "/products?category=so-sinh",
    );
  });

  it("keeps every featured product reachable", async () => {
    render(await HomePage());

    for (const product of featuredProducts) {
      expect(
        screen.getByRole("link", { name: `Xem ${product.name}` }),
      ).toHaveAttribute("href", `/products/${product.slug}`);
    }
  });
});
