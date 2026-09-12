import type { RoleCode } from "./contracts";

export const ROLE_LANDING_PATHS = {
  CUSTOMER: "/account/profile",
  SALES_STAFF: "/sales/dashboard",
  WAREHOUSE_STAFF: "/warehouse/dashboard",
  ADMIN: "/admin/dashboard",
} as const satisfies Record<RoleCode, `/${string}`>;

export function landingPathForRole(role: RoleCode): `/${string}` {
  return ROLE_LANDING_PATHS[role];
}

export function safeInternalReturnUrl(value: string | null): `/${string}` | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, "https://kids-fashion.invalid");
    if (parsed.origin !== "https://kids-fashion.invalid") {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}` as `/${string}`;
  } catch {
    return null;
  }
}

export function loginPathForReturnUrl(value: string | null): `/${string}` {
  const safe = safeInternalReturnUrl(value);
  return safe
    ? `/auth/login?returnUrl=${encodeURIComponent(safe)}`
    : "/auth/login";
}
