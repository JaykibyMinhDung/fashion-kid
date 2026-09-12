import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import type { AdminUser, AdminUserListResponse } from "../contracts";
import { AdminUserList } from "./admin-user-list";

const ADMIN: PublicUser = {
  id: "admin-id",
  email: "admin@example.com",
  fullName: "Admin User",
  phone: null,
  avatarUrl: null,
  role: "ADMIN",
};

const TARGET: AdminUser = {
  id: "target-id",
  email: "target@example.com",
  fullName: "Target User",
  phone: "+84901234567",
  avatarUrl: null,
  role: "CUSTOMER",
  status: "ACTIVE",
  lastLoginAt: null,
  createdAt: "2026-09-01T10:00:00.000Z",
};

function response(items: AdminUser[]): AdminUserListResponse {
  return { items, page: 1, limit: 20, total: items.length, totalPages: 1 };
}

function renderAdminUserList(
  handler: (path: `/${string}`, init?: RequestInit) => Promise<unknown>,
) {
  const client: AuthClient = {
    getCurrentUser: () => ADMIN,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(ADMIN),
    register: () => Promise.resolve(ADMIN),
    refresh: () => Promise.resolve(ADMIN),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>(path: `/${string}`, init?: RequestInit) =>
      handler(path, init) as Promise<T>,
  };
  return render(
    <AuthProvider client={client}>
      <AdminUserList />
    </AuthProvider>,
  );
}

describe("AdminUserList", () => {
  it("loads a safe user table with server pagination and filters", async () => {
    const paths: string[] = [];
    renderAdminUserList((path) => {
      paths.push(path);
      return Promise.resolve(response([TARGET]));
    });

    expect(await screen.findByText("Target User")).toBeInTheDocument();
    expect(screen.getByText("target@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Đang hoạt động").length).toBeGreaterThan(0);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain("page=1");
    expect(paths[0]).toContain("limit=20");
  });

  it("sends status and role mutations, then refetches server state", async () => {
    let current: AdminUser = TARGET;
    const mutations: string[] = [];
    renderAdminUserList((path, init) => {
      if (init?.method === "PATCH") {
        mutations.push(`${path}:${String(init.body)}`);
        current = {
          ...current,
          ...(path.endsWith("/status") ? { status: "DISABLED" } : { role: "SALES_STAFF" }),
        };
      }
      return Promise.resolve(response([current]));
    });

    await screen.findByText("Target User");
    window.confirm = () => true;
    fireEvent.click(screen.getByRole("button", { name: "Vô hiệu hóa" }));
    await waitFor(() => expect(screen.getByText("Đã vô hiệu hóa người dùng.")).toBeInTheDocument());
    fireEvent.change(screen.getByRole("combobox", { name: "Vai trò của target@example.com" }), {
      target: { value: "SALES_STAFF" },
    });
    await waitFor(() => expect(screen.getByText("Đã cập nhật vai trò người dùng.")).toBeInTheDocument());

    expect(mutations).toEqual([
      ["/api/v1/admin/users/target-id/status", JSON.stringify({ status: "DISABLED" })].join(":"),
      ["/api/v1/admin/users/target-id/role", JSON.stringify({ role: "SALES_STAFF" })].join(":"),
    ]);
  });
});
