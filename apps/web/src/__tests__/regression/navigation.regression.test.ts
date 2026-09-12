import { describe, expect, it } from "vitest";

import {
  adminNavigation,
  salesNavigation,
  warehouseNavigation,
} from "@/config/navigation";

describe("REG-ROLES-002: approved Day 6 navigation scope", () => {
  const allPortalNavigation = [
    ...adminNavigation,
    ...salesNavigation,
    ...warehouseNavigation,
  ];

  it("exposes only the approved Admin routes", () => {
    expect(adminNavigation.map(({ href }) => href)).toEqual([
      "/admin/dashboard",
      "/admin/orders",
      "/admin/users",
      "/admin/products",
      "/admin/categories",
      "/admin/inventory",
    ]);
  });

  it("exposes approved Sales routes (dashboard and orders queue)", () => {
    expect(salesNavigation.map(({ href }) => href)).toEqual([
      "/sales/dashboard",
      "/sales/orders",
    ]);
  });

  it("exposes approved Warehouse routes (dashboard, orders queue, and inventory)", () => {
    expect(warehouseNavigation.map(({ href }) => href)).toEqual([
      "/warehouse/dashboard",
      "/warehouse/orders",
      "/warehouse/inventory",
    ]);
  });

  it("does not expose a demo login shortcut as portal navigation", () => {
    expect(allPortalNavigation).not.toContainEqual(
      expect.objectContaining({ href: "/auth/login" }),
    );
  });
});
