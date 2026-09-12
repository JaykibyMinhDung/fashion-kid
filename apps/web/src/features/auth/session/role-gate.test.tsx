import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "../api/auth-client";
import type { PublicUser, RoleCode } from "../contracts";
import { landingPathForRole } from "../role-routing";
import { AuthProvider } from "./auth-provider";
import { RoleGate } from "./role-gate";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: "/admin/dashboard",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => navigation.pathname,
}));

const USER: PublicUser = {
  id: "user-id",
  email: "user@example.com",
  fullName: "Test User",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
};

function clientWithRefresh(refresh: AuthClient["refresh"]): AuthClient {
  return {
    getCurrentUser: () => null,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(USER),
    register: () => Promise.resolve(USER),
    refresh,
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>() => Promise.resolve(undefined as T),
  };
}

function renderGate(refresh: AuthClient["refresh"], allowedRoles: RoleCode[]) {
  return render(
    <AuthProvider client={clientWithRefresh(refresh)}>
      <RoleGate allowedRoles={allowedRoles}>
        <div>Protected portal</div>
      </RoleGate>
    </AuthProvider>,
  );
}

describe("RoleGate", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    navigation.pathname = "/admin/dashboard";
  });

  it("does not flash portal content while bootstrap is loading", () => {
    renderGate(() => new Promise<PublicUser>(() => undefined), ["ADMIN"]);

    expect(screen.queryByText("Protected portal")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang kiểm tra quyền truy cập…",
    );
  });

  it("redirects anonymous users with an encoded internal return URL", async () => {
    renderGate(() => Promise.reject(new Error("anonymous")), ["ADMIN"]);

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith(
        "/auth/login?returnUrl=%2Fadmin%2Fdashboard",
      ),
    );
    expect(screen.queryByText("Protected portal")).not.toBeInTheDocument();
  });

  it.each<RoleCode>([
    "CUSTOMER",
    "SALES_STAFF",
    "WAREHOUSE_STAFF",
    "ADMIN",
  ])("renders portal content when %s is allowed", async (role) => {
    renderGate(() => Promise.resolve({ ...USER, role }), [role]);

    expect(await screen.findByText("Protected portal")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it.each<RoleCode>([
    "CUSTOMER",
    "SALES_STAFF",
    "WAREHOUSE_STAFF",
    "ADMIN",
  ])("redirects mismatched %s to its real landing route", async (role) => {
    const allowedRole = role === "ADMIN" ? "CUSTOMER" : "ADMIN";
    renderGate(() => Promise.resolve({ ...USER, role }), [allowedRole]);

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith(landingPathForRole(role)),
    );
    expect(screen.queryByText("Protected portal")).not.toBeInTheDocument();
  });
});
