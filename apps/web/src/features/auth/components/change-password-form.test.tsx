import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "../api/auth-client";
import { ApiClientError } from "@/lib/api/api-client";
import type { PublicUser } from "../contracts";
import { AuthProvider } from "../session/auth-provider";
import { ChangePasswordForm } from "./change-password-form";

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

function clientWithChangePassword(
  changePassword: AuthClient["changePassword"],
): AuthClient {
  return {
    getCurrentUser: () => USER,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(USER),
    register: () => Promise.resolve(USER),
    refresh: () => Promise.resolve(USER),
    logout: () => Promise.resolve(),
    changePassword,
    authorizedRequest: <T,>() => Promise.resolve(undefined as T),
  };
}

function submitPasswords(
  currentPassword: string,
  newPassword: string,
  confirmation = newPassword,
) {
  fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), {
    target: { value: currentPassword },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
    target: { value: newPassword },
  });
  fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
    target: { value: confirmation },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: /Cập nhật mật khẩu/ }).closest("form")!,
  );
}

describe("ChangePasswordForm", () => {
  beforeEach(() => replace.mockReset());

  it("rejects a mismatched confirmation", async () => {
    const changePassword = vi.fn<AuthClient["changePassword"]>();
    render(
      <AuthProvider client={clientWithChangePassword(changePassword)}>
        <ChangePasswordForm />
      </AuthProvider>,
    );

    submitPasswords(
      "the current sufficiently long password",
      "the new sufficiently long password",
      "a different confirmation value",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Xác nhận mật khẩu mới chưa khớp.",
    );
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("rejects reuse of the current password", async () => {
    const changePassword = vi.fn<AuthClient["changePassword"]>();
    render(
      <AuthProvider client={clientWithChangePassword(changePassword)}>
        <ChangePasswordForm />
      </AuthProvider>,
    );
    const samePassword = "the same sufficiently long password";

    submitPasswords(samePassword, samePassword);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mật khẩu mới phải khác mật khẩu hiện tại.",
    );
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("maps a wrong current password to an accessible message", async () => {
    const changePassword = vi
      .fn<AuthClient["changePassword"]>()
      .mockRejectedValue(
        new ApiClientError(
          401,
          "INVALID_CREDENTIALS",
          "Email hoặc mật khẩu không hợp lệ",
        ),
      );
    render(
      <AuthProvider client={clientWithChangePassword(changePassword)}>
        <ChangePasswordForm />
      </AuthProvider>,
    );

    submitPasswords(
      "the wrong sufficiently long password",
      "the new sufficiently long password",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mật khẩu hiện tại không đúng.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("submits only current/new passwords, clears session and redirects", async () => {
    const changePassword = vi
      .fn<AuthClient["changePassword"]>()
      .mockResolvedValue(undefined);
    render(
      <AuthProvider client={clientWithChangePassword(changePassword)}>
        <ChangePasswordForm />
      </AuthProvider>,
    );

    submitPasswords(
      "the current sufficiently long password",
      "the new sufficiently long password",
    );

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: "the current sufficiently long password",
        newPassword: "the new sufficiently long password",
      }),
    );
    expect(replace).toHaveBeenCalledWith("/auth/login");
  });
});
