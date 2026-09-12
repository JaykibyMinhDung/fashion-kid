import { describe, expect, it } from "vitest";

import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import {
  createAdminVariant,
  getAdminProducts,
  updateAdminVariant,
} from "./admin-catalog-client";

describe("admin catalog client", () => {
  it("serializes admin filters and mutation payloads without changing decimal strings", async () => {
    const calls: string[] = [];
    const request: AuthContextValue["authorizedRequest"] = async <T,>(
      path: `/${string}`,
      init?: RequestInit,
    ) => {
      calls.push(`${path}:${init?.method ?? "GET"}`);
      if (init?.method === "POST") {
        expect(path).toBe("/api/v1/admin/catalog/products/product-1/variants");
        expect(init.body).toBe(JSON.stringify({
          sizeId: "size-1",
          colorId: "color-1",
          sku: "MAM-001",
          price: "9223372036854775807",
        }));
        return { id: "variant-1" } as T;
      }
      return { items: [], page: 2, limit: 20, total: 0, totalPages: 0 } as T;
    };

    await expect(
      getAdminProducts(request, {
        page: 2,
        q: " coral ",
        status: "DISABLED",
        sort: "name:asc",
      }),
    ).resolves.toMatchObject({ page: 2 });
    await createAdminVariant(request, "product-1", {
      sizeId: "size-1",
      colorId: "color-1",
      sku: "MAM-001",
      price: "9223372036854775807",
    });

    await updateAdminVariant(request, "variant-1", {
      price: "349000",
    });
    expect(calls).toContain("/api/v1/admin/catalog/variants/variant-1:PATCH");
  });
});
