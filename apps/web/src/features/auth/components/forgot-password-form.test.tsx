import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/api-client";
import { ForgotPasswordForm } from "./forgot-password-form";

describe("ForgotPasswordForm", () => {
  it("rejects invalid email before calling API", async () => {
    const onSubmitEmail = vi.fn();
    render(<ForgotPasswordForm onSubmitEmail={onSubmitEmail} />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "invalid-email" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Gửi hướng dẫn/i }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vui lòng nhập địa chỉ email hợp lệ.",
    );
    expect(onSubmitEmail).not.toHaveBeenCalled();
  });

  it("submits valid email and displays confirmation", async () => {
    const onSubmitEmail = vi.fn().mockResolvedValue({ message: "Success" });
    render(<ForgotPasswordForm onSubmitEmail={onSubmitEmail} />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Gửi hướng dẫn/i }).closest("form")!);

    await waitFor(() =>
      expect(onSubmitEmail).toHaveBeenCalledWith({ email: "user@example.com" }),
    );

    expect(
      await screen.findByText(/Đã gửi hướng dẫn khôi phục mật khẩu/i),
    ).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Nhập mã OTP đặt lại mật khẩu/i }),
    ).toBeInTheDocument();
  });

  it("displays server error message on failure", async () => {
    const onSubmitEmail = vi
      .fn()
      .mockRejectedValue(
        new ApiClientError(429, "RATE_LIMITED", "Quá nhiều yêu cầu. Vui lòng thử lại sau."),
      );
    render(<ForgotPasswordForm onSubmitEmail={onSubmitEmail} />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Gửi hướng dẫn/i }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
    );
  });
});
