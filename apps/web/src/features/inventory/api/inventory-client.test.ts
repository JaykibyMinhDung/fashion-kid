import { describe, expect, it } from "vitest";

import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import {
  adjustInventory,
  getInventoryHistory,
  importInventory,
} from "./inventory-client";

describe("inventory client", () => {
  it("keeps stock commands explicit and serializes target adjustment payloads", async () => {
    const calls: Array<{ path: string; method: string; body?: string }> = [];
    const request: AuthContextValue["authorizedRequest"] = async <T>(
      path: `/${string}`,
      init?: RequestInit,
    ) => {
      calls.push({
        path,
        method: init?.method ?? "GET",
        body: init?.body as string | undefined,
      });
      return { inventory: {}, transaction: {} } as T;
    };

    await importInventory(request, {
      variantId: "variant-1",
      quantity: 12,
      note: "Lô mới",
    });
    await adjustInventory(request, "variant-1", {
      targetOnHand: 10,
      reason: "Kiểm kê",
    });
    await getInventoryHistory(request, {
      type: "ADJUSTMENT",
      variantId: "variant-1",
    });

    expect(calls).toEqual([
      {
        path: "/api/v1/admin/inventory/import",
        method: "POST",
        body: JSON.stringify({
          variantId: "variant-1",
          quantity: 12,
          note: "Lô mới",
        }),
      },
      {
        path: "/api/v1/admin/inventory/variant-1/adjust",
        method: "POST",
        body: JSON.stringify({ targetOnHand: 10, reason: "Kiểm kê" }),
      },
      {
        path: "/api/v1/admin/inventory/history?type=ADJUSTMENT&variantId=variant-1",
        method: "GET",
      },
    ]);
  });
});
