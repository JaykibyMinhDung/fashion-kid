import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductCard } from "@/features/catalog/components/product-card";
import { featuredProducts } from "@/features/catalog/data/mock-products";

describe("ProductCard", () => {
  const product = featuredProducts[0];

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
