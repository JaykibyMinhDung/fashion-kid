import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "../api/auth-client";
import { ApiClientError } from "@/lib/api/api-client";
import type { PublicUser, RoleCode } from "../contracts";
import { landingPathForRole } from "../role-routing";
import { AuthProvider } from "../session/auth-provider";
import { LoginForm } from "./login-form";

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

function clientWithLogin(login: AuthClient["login"]): AuthClient {
  return {
    getCurrentUser: () => null,
    synchronizeCurrentUser: () => undefined,
    login,
    register: () => Promise.resolve(USER),
    refresh: () => Promise.reject(new Error("anonymous")),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>() => Promise.resolve(undefined as T),
  };
}

function fillAndSubmit({ remember = false } = {}) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " USER@example.com " },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "submitted password" },
  });
  if (remember) {
    fireEvent.click(screen.getByLabelText("Ghi nhớ đăng nhập"));
  }
  fireEvent.submit(screen.getByRole("button", { name: /Đăng nhập/ }).closest("form")!);
}

describe("LoginForm", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("validates required credentials before calling the API", async () => {
    const login = vi.fn<AuthClient["login"]>();
    render(
      <AuthProvider client={clientWithLogin(login)}>
        <LoginForm />
      </AuthProvider>,
    );

    fireEvent.submit(screen.getByRole("button", { name: "Đăng nhập" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vui lòng nhập email và mật khẩu hợp lệ.",
    );
    expect(login).not.toHaveBeenCalled();
  });

  it("submits exact password, normalized email and remember state", async () => {
    const login = vi.fn<AuthClient["login"]>().mockResolvedValue(USER);
    render(
      <AuthProvider client={clientWithLogin(login)}>
        <LoginForm />
      </AuthProvider>,
    );

    fillAndSubmit({ remember: true });

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: "USER@example.com",
        password: "submitted password",
        remember: true,
      }),
    );
  });

  it("keeps the submit button pending until login settles", async () => {
    let resolveLogin: ((user: PublicUser) => void) | undefined;
    const login = vi.fn<AuthClient["login"]>().mockImplementation(
      () =>
        new Promise<PublicUser>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    render(
      <AuthProvider client={clientWithLogin(login)}>
        <LoginForm />
      </AuthProvider>,
    );

    fillAndSubmit();
    expect(
      screen.getByRole("button", { name: /Đang đăng nhập/ }),
    ).toBeDisabled();
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    resolveLogin?.(USER);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Đăng nhập/ })).toBeEnabled(),
    );
  });

  it("renders the generic credential error accessibly", async () => {
    const login = vi
      .fn<AuthClient["login"]>()
      .mockRejectedValue(
        new ApiClientError(
          401,
          "INVALID_CREDENTIALS",
          "Email hoặc mật khẩu không hợp lệ",
        ),
      );
    render(
      <AuthProvider client={clientWithLogin(login)}>
        <LoginForm />
      </AuthProvider>,
    );

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email hoặc mật khẩu không chính xác.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it.each<RoleCode>([
    "CUSTOMER",
    "SALES_STAFF",
    "WAREHOUSE_STAFF",
    "ADMIN",
  ])("redirects %s to its single-source landing route", async (role) => {
    const login = vi
      .fn<AuthClient["login"]>()
      .mockResolvedValue({ ...USER, role });
    render(
      <AuthProvider client={clientWithLogin(login)}>
        <LoginForm />
      </AuthProvider>,
    );

    fillAndSubmit();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(landingPathForRole(role)),
    );
  });
});
