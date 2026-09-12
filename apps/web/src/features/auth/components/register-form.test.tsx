import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "../api/auth-client";
import { ApiClientError } from "@/lib/api/api-client";
import type { PublicUser } from "../contracts";
import { AuthProvider } from "../session/auth-provider";
import { RegisterForm } from "./register-form";

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

function clientWithRegister(register: AuthClient["register"]): AuthClient {
  return {
    getCurrentUser: () => null,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(USER),
    register,
    refresh: () => Promise.reject(new Error("anonymous")),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>() => Promise.resolve(undefined as T),
  };
}

function fillForm(password: string, confirmation = password) {
  fireEvent.change(screen.getByLabelText("Họ và tên"), {
    target: { value: "  Test User  " },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " user@example.com " },
  });
  fireEvent.change(screen.getByLabelText(/Số điện thoại/), {
    target: { value: "+84 901-234-567" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu"), {
    target: { value: confirmation },
  });
  fireEvent.submit(screen.getByRole("button", { name: /Tạo tài khoản/ }).closest("form")!);
}

describe("RegisterForm", () => {
  beforeEach(() => replace.mockReset());

  it("rejects password mismatch before calling the API", async () => {
    const register = vi.fn<AuthClient["register"]>();
    render(
      <AuthProvider client={clientWithRegister(register)}>
        <RegisterForm />
      </AuthProvider>,
    );

    fillForm("a sufficiently long password", "a different confirmation");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Xác nhận mật khẩu chưa khớp.",
    );
    expect(register).not.toHaveBeenCalled();
  });

  it("gives immediate weak-password length feedback", async () => {
    const register = vi.fn<AuthClient["register"]>();
    render(
      <AuthProvider client={clientWithRegister(register)}>
        <RegisterForm />
      </AuthProvider>,
    );

    fillForm("too short");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mật khẩu cần dài từ 15 đến 128 ký tự.",
    );
    expect(register).not.toHaveBeenCalled();
  });

  it("never sends confirmPassword or role and redirects the CUSTOMER", async () => {
    const register = vi.fn<AuthClient["register"]>().mockResolvedValue(USER);
    render(
      <AuthProvider client={clientWithRegister(register)}>
        <RegisterForm />
      </AuthProvider>,
    );

    fillForm("a sufficiently long password");

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const payload = register.mock.calls[0]?.[0];
    expect(payload).toEqual({
      fullName: "Test User",
      email: "user@example.com",
      phone: "+84 901-234-567",
      password: "a sufficiently long password",
      remember: false,
    });
    expect(payload).not.toHaveProperty("confirmPassword");
    expect(payload).not.toHaveProperty("role");
    expect(replace).toHaveBeenCalledWith("/account/profile");
  });

  it("shows a generic conflict without confirming email existence", async () => {
    const register = vi
      .fn<AuthClient["register"]>()
      .mockRejectedValue(
        new ApiClientError(
          409,
          "REGISTRATION_FAILED",
          "Không thể tạo tài khoản",
        ),
      );
    render(
      <AuthProvider client={clientWithRegister(register)}>
        <RegisterForm />
      </AuthProvider>,
    );

    fillForm("a sufficiently long password");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không thể tạo tài khoản");
    expect(alert).not.toHaveTextContent("đã tồn tại");
    expect(replace).not.toHaveBeenCalled();
  });
});
