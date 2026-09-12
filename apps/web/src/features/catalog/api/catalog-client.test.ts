import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProducts } from "@/features/catalog/api/catalog-client";

describe("catalog client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        expect(String(input)).toBe(
          "http://localhost:8080/api/v1/products?q=coral&size=90&sort=price_asc",
        );
        return new Response(
          JSON.stringify({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );
  });

  it("serializes filters without coercing decimal-string prices", async () => {
    await expect(
      getProducts({ q: "coral", size: "90", sort: "price_asc" }),
    ).resolves.toMatchObject({ total: 0 });
  });
});
