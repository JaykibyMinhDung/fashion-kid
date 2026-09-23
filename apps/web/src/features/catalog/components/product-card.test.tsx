import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductCard } from "@/features/catalog/components/product-card";
import type { Product } from "@/types/catalog";

describe("ProductCard", () => {
  const product: Product = {
    id: "prd-001",
    slug: "set-ao-khoac-coral",
    name: "Set áo khoác Coral",
    category: "Bộ mặc ngoài",
    price: "349000",
    compareAtPrice: "399000",
    image: "/images/product-coral-cardigan.png",
    imageAlt: "Áo khoác len màu coral phối cùng romper màu kem",
    badge: "Mới",
    colors: ["Coral", "Kem"],
    sizes: ["80", "90", "100", "110"],
    available: 18,
  };

  it("shows the product identity, price and detail link", () => {
    render(<ProductCard product={product} />);

    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText(/349\.000.*₫/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Xem ${product.name}` })).toHaveAttribute(
      "href",
      `/products/${product.slug}`,
    );
  });

  it("exposes an accessible favorite action", () => {
    render(<ProductCard product={product} />);

    expect(
      screen.getByRole("button", {
        name: `Thêm ${product.name} vào yêu thích`,
      }),
    ).toHaveAttribute("type", "button");
  });
});
