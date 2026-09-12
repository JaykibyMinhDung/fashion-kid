import { act, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "../api/auth-client";
import type { PublicUser } from "../contracts";
import { AuthProvider, useAuth } from "./auth-provider";

const USER: PublicUser = {
  id: "user-id",
  email: "user@example.com",
  fullName: "Test User",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
};

function fakeClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    getCurrentUser: () => null,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(USER),
    register: () => Promise.resolve(USER),
    refresh: () => Promise.resolve(USER),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>() => Promise.resolve(undefined as T),
    ...overrides,
  };
}

function SessionProbe() {
  const auth = useAuth();
  return (
    <div>
      <output data-testid="status">{auth.status}</output>
      <output data-testid="user">{auth.user?.email ?? "none"}</output>
      <output data-testid="keys">{Object.keys(auth).sort().join(",")}</output>
      <button
        type="button"
        onClick={() => void auth.logout().catch(() => undefined)}
      >
        Logout
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  it("bootstraps one time under React Strict Mode and exposes no token", async () => {
    const refresh = vi.fn().mockResolvedValue(USER);
    render(
      <StrictMode>
        <AuthProvider client={fakeClient({ refresh })}>
          <SessionProbe />
        </AuthProvider>
      </StrictMode>,
    );

    expect(screen.getByTestId("status")).toHaveTextContent("loading");
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent(USER.email);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("keys")).not.toHaveTextContent("accessToken");
  });

  it("settles as anonymous when refresh bootstrap fails", async () => {
    render(
      <AuthProvider
        client={fakeClient({
          refresh: () => Promise.reject(new Error("no refresh session")),
        })}
      >
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("always clears provider state after logout", async () => {
    const logout = vi.fn().mockRejectedValue(new Error("network unavailable"));
    render(
      <AuthProvider client={fakeClient({ logout })}>
        <SessionProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    );

    await act(async () => {
      screen.getByRole("button", { name: "Logout" }).click();
      await Promise.resolve();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
});
