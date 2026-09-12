import { describe, expect, it } from "vitest";

import { featuredProducts, getProductBySlug } from "@/features/catalog/data/mock-products";

describe("catalog data", () => {
  it("finds a product by its public slug", () => {
    expect(getProductBySlug("set-so-mi-sage")).toMatchObject({
      id: "prd-002",
      name: "Set sơ mi Sage",
    });
  });

  it("returns undefined for an unknown slug", () => {
    expect(getProductBySlug("khong-ton-tai")).toBeUndefined();
  });

  it("keeps identifiers and public slugs unique", () => {
    const ids = featuredProducts.map(({ id }) => id);
    const slugs = featuredProducts.map(({ slug }) => slug);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("provides the minimum data required by a product card", () => {
    for (const product of featuredProducts) {
      expect(product.name).not.toHaveLength(0);
      expect(product.image).toMatch(/^\/images\//);
      expect(BigInt(product.price)).toBeGreaterThan(BigInt(0));
      expect(product.available).toBeGreaterThanOrEqual(0);
      expect(product.colors.length).toBeGreaterThan(0);
      expect(product.sizes.length).toBeGreaterThan(0);
    }
  });
});
