import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthClient } from "../api/auth-client";
import type { PublicUser } from "../contracts";
import { AuthProvider } from "../session/auth-provider";
import { LogoutButton } from "./logout-button";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const USER: PublicUser = {
  id: "user-id",
  email: "user@example.com",
  fullName: "Test User",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
};

function clientWithLogout(logout: AuthClient["logout"]): AuthClient {
  return {
    getCurrentUser: () => USER,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(USER),
    register: () => Promise.resolve(USER),
    refresh: () => Promise.resolve(USER),
    logout,
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>() => Promise.resolve(undefined as T),
  };
}

function renderButton(logout: AuthClient["logout"]) {
  return render(
    <AuthProvider client={clientWithLogout(logout)}>
      <LogoutButton />
    </AuthProvider>,
  );
}

describe("LogoutButton", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("waits for the logout API before redirecting", async () => {
    let resolveLogout: (() => void) | undefined;
    const logout = vi.fn<AuthClient["logout"]>().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogout = resolve;
        }),
    );
    renderButton(logout);

    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

    expect(
      screen.getByRole("button", { name: "Đang đăng xuất…" }),
    ).toBeDisabled();
    expect(replace).not.toHaveBeenCalled();
    resolveLogout?.();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"));
  });

  it("still clears the UI path when the logout API fails", async () => {
    const logout = vi
      .fn<AuthClient["logout"]>()
      .mockRejectedValue(new Error("network unavailable"));
    renderButton(logout);

    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
