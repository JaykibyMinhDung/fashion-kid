import { describe, expect, it } from "vitest";
import {
  landingPathForRole,
  loginPathForReturnUrl,
  ROLE_LANDING_PATHS,
  safeInternalReturnUrl,
} from "./role-routing";

describe("role routing", () => {
  it("maps every role to exactly one approved landing route", () => {
    expect(ROLE_LANDING_PATHS).toEqual({
      CUSTOMER: "/account/profile",
      SALES_STAFF: "/sales/dashboard",
      WAREHOUSE_STAFF: "/warehouse/dashboard",
      ADMIN: "/admin/dashboard",
    });
    expect(landingPathForRole("ADMIN")).toBe("/admin/dashboard");
  });

  it.each([
    "https://attacker.example/path",
    "//attacker.example/path",
    "/\\attacker.example/path",
    "javascript:alert(1)",
    "relative/path",
    "/safe\nunsafe",
  ])("rejects an open-redirect input: %s", (value) => {
    expect(safeInternalReturnUrl(value)).toBeNull();
    expect(loginPathForReturnUrl(value)).toBe("/auth/login");
  });

  it("preserves an internal path, query and fragment safely", () => {
    const internal = "/account/profile?tab=orders#latest";

    expect(safeInternalReturnUrl(internal)).toBe(internal);
    expect(loginPathForReturnUrl(internal)).toBe(
      "/auth/login?returnUrl=%2Faccount%2Fprofile%3Ftab%3Dorders%23latest",
    );
  });
});
