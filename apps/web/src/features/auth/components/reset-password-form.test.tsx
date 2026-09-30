import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "./reset-password-form";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it("verifies OTP and transitions to password entry in OTP flow", async () => {
    const onVerifyOtp = vi
      .fn()
      .mockResolvedValue({ resetToken: "verified-token" });
    const onResetPassword = vi.fn().mockResolvedValue(undefined);

    render(
      <ResetPasswordForm
        onVerifyOtp={onVerifyOtp}
        onResetPassword={onResetPassword}
      />,
    );

    // Initial state: OTP form
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã xác thực OTP/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mã xác thực OTP/i), {
      target: { value: "123456" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Xác thực mã OTP/i }).closest("form")!);

    await waitFor(() =>
      expect(onVerifyOtp).toHaveBeenCalledWith({
        email: "user@example.com",
        otp: "123456",
      }),
    );

    // State 2: Password form
    expect(
      await screen.findByLabelText("Mật khẩu mới"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "MySecurePassword123!" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
      target: { value: "MySecurePassword123!" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Xác nhận đổi mật khẩu/i }).closest("form")!);

    await waitFor(() =>
      expect(onResetPassword).toHaveBeenCalledWith({
        token: "verified-token",
        newPassword: "MySecurePassword123!",
      }),
    );

    expect(
      await screen.findByText(/Đặt lại mật khẩu thành công!/i),
    ).toBeInTheDocument();
  });

  it("renders new password fields directly when token is in URL", async () => {
    mockSearchParams = new URLSearchParams({ token: "link-token-xyz" });
    const onResetPassword = vi.fn().mockResolvedValue(undefined);

    render(<ResetPasswordForm onResetPassword={onResetPassword} />);

    expect(screen.getByLabelText("Mật khẩu mới")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mã xác thực OTP/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "ValidPassword12345" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
      target: { value: "ValidPassword12345" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Xác nhận đổi mật khẩu/i }).closest("form")!);

    await waitFor(() =>
      expect(onResetPassword).toHaveBeenCalledWith({
        token: "link-token-xyz",
        newPassword: "ValidPassword12345",
      }),
    );

    expect(
      await screen.findByText(/Đặt lại mật khẩu thành công!/i),
    ).toBeInTheDocument();
  });

  it("rejects password shorter than 15 characters", async () => {
    mockSearchParams = new URLSearchParams({ token: "link-token-xyz" });
    const onResetPassword = vi.fn();

    render(<ResetPasswordForm onResetPassword={onResetPassword} />);

    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
      target: { value: "short" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Xác nhận đổi mật khẩu/i }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mật khẩu mới cần dài từ 15 đến 128 ký tự.",
    );
    expect(onResetPassword).not.toHaveBeenCalled();
  });
});
