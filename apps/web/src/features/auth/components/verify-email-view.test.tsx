import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/api-client";
import { VerifyEmailView } from "./verify-email-view";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("VerifyEmailView", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it("automatically verifies token when present in URL and displays success", async () => {
    mockSearchParams = new URLSearchParams({ token: "verify-token-123" });
    const onVerifyEmail = vi
      .fn()
      .mockResolvedValue({ success: true, message: "Verified" });

    render(<VerifyEmailView onVerifyEmail={onVerifyEmail} />);

    await waitFor(() =>
      expect(onVerifyEmail).toHaveBeenCalledWith({ token: "verify-token-123" }),
    );

    expect(
      await screen.findByText(/Xác thực email thành công!/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Đăng nhập ngay/i }),
    ).toBeInTheDocument();
  });

  it("displays error message and resend form when token verification fails", async () => {
    mockSearchParams = new URLSearchParams({ token: "expired-token" });
    const onVerifyEmail = vi
      .fn()
      .mockRejectedValue(
        new ApiClientError(
          400,
          "EMAIL_VERIFICATION_TOKEN_EXPIRED",
          "Mã xác thực đã hết hạn.",
        ),
      );

    render(<VerifyEmailView onVerifyEmail={onVerifyEmail} />);

    expect(
      await screen.findByText(/Mã xác thực đã hết hạn/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Gửi lại email xác thực/i }),
    ).toBeInTheDocument();
  });

  it("submits resend verification form when no token in URL", async () => {
    const onResendVerification = vi
      .fn()
      .mockResolvedValue({ message: "Resent" });

    render(<VerifyEmailView onResendVerification={onResendVerification} />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /Gửi lại email xác thực/i }).closest("form")!,
    );

    await waitFor(() =>
      expect(onResendVerification).toHaveBeenCalledWith({
        email: "user@example.com",
      }),
    );

    expect(
      await screen.findByText(/Đã gửi email kích hoạt mới/i),
    ).toBeInTheDocument();
  });
});
