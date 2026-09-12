import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/(store)/page";
import { featuredProducts } from "@/features/catalog/data/mock-products";

describe("REG-STOREFRONT-001: approved homepage", () => {
  it("keeps the approved hero and collection entry point", () => {
    render(<HomePage />);

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

  it("keeps all approved category destinations", () => {
    render(<HomePage />);

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

  it("keeps every featured product reachable", () => {
    render(<HomePage />);

    for (const product of featuredProducts) {
      expect(
        screen.getByRole("link", { name: `Xem ${product.name}` }),
      ).toHaveAttribute("href", `/products/${product.slug}`);
    }
  });
});
