import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminDashboardPage from "@/app/(operations)/admin/dashboard/page";
import AdminLayout from "@/app/(operations)/admin/layout";
import SalesDashboardPage from "@/app/(operations)/sales/dashboard/page";
import SalesLayout from "@/app/(operations)/sales/layout";
import WarehouseDashboardPage from "@/app/(operations)/warehouse/dashboard/page";
import WarehouseLayout from "@/app/(operations)/warehouse/layout";
import AddressesPage from "@/app/(customer)/account/addresses/page";
import ProfilePage from "@/app/(customer)/account/profile/page";
import CustomerLayout from "@/app/(customer)/layout";
import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser, RoleCode } from "@/features/auth/contracts";
import { AuthProvider } from "@/features/auth/session/auth-provider";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

const BASE_USER: PublicUser = {
  id: "user-id",
  email: "user@example.com",
  fullName: "Test User",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
};

function authenticatedClient(role: RoleCode): AuthClient {
  let user: PublicUser = { ...BASE_USER, role };
  const profile = {
    ...user,
    status: "ACTIVE" as const,
    lastLoginAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
  };

  return {
    getCurrentUser: () => user,
    synchronizeCurrentUser: (updated) => {
      user = updated;
    },
    login: () => Promise.resolve(user),
    register: () => Promise.resolve(user),
    refresh: () => Promise.resolve(user),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>(path: `/${string}`) =>
      Promise.resolve(
        (path === "/api/v1/me/addresses" ? [] : profile) as T,
      ),
  };
}

function renderPortal(role: RoleCode, pathname: string, children: ReactNode) {
  navigation.pathname = pathname;
  return render(
    <AuthProvider client={authenticatedClient(role)}>{children}</AuthProvider>,
  );
}

describe("REG-ROLES-001: authenticated portal boundaries", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
  });

  it("renders the Customer profile inside its protected account layout", async () => {
    renderPortal(
      "CUSTOMER",
      "/account/profile",
      <CustomerLayout>
        <ProfilePage />
      </CustomerLayout>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Hồ sơ cá nhân" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Điều hướng tài khoản" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Tài khoản của Test User" }),
    ).toHaveAttribute("href", "/account/profile");
    expect(
      screen.getByRole("button", { name: "Đăng xuất" }),
    ).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("renders the Customer address book inside its protected account layout", async () => {
    renderPortal(
      "CUSTOMER",
      "/account/addresses",
      <CustomerLayout>
        <AddressesPage />
      </CustomerLayout>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Địa chỉ nhận hàng",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        name: "Chưa có địa chỉ nhận hàng",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Điều hướng tài khoản" }),
    ).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("keeps Admin focused on Catalog, Product Variant and Inventory", async () => {
    renderPortal(
      "ADMIN",
      "/admin/dashboard",
      <AdminLayout>
        <AdminDashboardPage />
      </AdminLayout>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Tổng quan vận hành",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Catalog, Product Variant và Inventory/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Quản lý sản phẩm" }),
    ).toHaveAttribute("href", "/admin/products");
    expect(
      screen.getByRole("button", { name: "Đăng xuất" }),
    ).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("does not expose the Sales order queue before its contract is ready", async () => {
    renderPortal(
      "SALES_STAFF",
      "/sales/dashboard",
      <SalesLayout>
        <SalesDashboardPage />
      </SalesLayout>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Vận hành bán hàng",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Order Queue chưa mở" }),
    ).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("keeps Warehouse limited to Inventory while fulfillment is pending", async () => {
    renderPortal(
      "WAREHOUSE_STAFF",
      "/warehouse/dashboard",
      <WarehouseLayout>
        <WarehouseDashboardPage />
      </WarehouseLayout>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Tổng quan kho",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Packing Queue chưa mở" }),
    ).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
