import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "@/features/auth/api/auth-client";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import type { EmailOutboxListResponse } from "../contracts";
import { EmailOutboxList } from "./email-outbox-list";

function createMockClient(
  authorizedRequest: <T>(path: `/${string}`, init?: RequestInit) => Promise<T>,
): AuthClient {
  return {
    getCurrentUser: () => null,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.reject(new Error("not implemented")),
    register: () => Promise.reject(new Error("not implemented")),
    refresh: () => Promise.reject(new Error("anonymous")),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest,
  };
}

describe("EmailOutboxList", () => {
  it("renders outbox list and expands row details", async () => {
    const mockData: EmailOutboxListResponse = {
      data: [
        {
          id: "outbox-1",
          dedupeKey: "INVOICE_ISSUED:inv-123",
          toEmail: "customer@example.com",
          template: "invoice-issued",
          payload: { invoiceId: "inv-123", total: 500000 },
          status: "SENT",
          attempts: 1,
          maxAttempts: 5,
          nextAttemptAt: new Date().toISOString(),
          lastError: null,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    const authorizedRequest = vi.fn().mockResolvedValue(mockData);

    render(
      <AuthProvider client={createMockClient(authorizedRequest)}>
        <EmailOutboxList />
      </AuthProvider>,
    );

    expect(
      await screen.findByText("Hàng đợi Email (Outbox)"),
    ).toBeInTheDocument();
    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();
    expect(screen.getByText("Đã gửi")).toBeInTheDocument();
    expect(screen.getByText("Hoá đơn GTGT")).toBeInTheDocument();

    // Click row to expand payload details
    fireEvent.click(screen.getByText("customer@example.com"));

    expect(
      await screen.findByText(/INVOICE_ISSUED:inv-123/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dữ liệu mẫu \(Payload\):/i)).toBeInTheDocument();
  });

  it("renders empty state when no outbox entries exist", async () => {
    const mockEmptyData: EmailOutboxListResponse = {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    };

    const authorizedRequest = vi.fn().mockResolvedValue(mockEmptyData);

    render(
      <AuthProvider client={createMockClient(authorizedRequest)}>
        <EmailOutboxList />
      </AuthProvider>,
    );

    expect(
      await screen.findByText("Không có email nào"),
    ).toBeInTheDocument();
  });
});
