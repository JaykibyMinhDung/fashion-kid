import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import { ExportReportButton } from "./export-report-button";

describe("ExportReportButton", () => {
  let mockAuthorizedBlobRequest: ReturnType<
    typeof vi.fn<NonNullable<AuthClient["authorizedBlobRequest"]>>
  >;
  let mockClient: AuthClient;

  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/blob-1");
    window.URL.revokeObjectURL = vi.fn();

    mockAuthorizedBlobRequest = vi
      .fn<NonNullable<AuthClient["authorizedBlobRequest"]>>()
      .mockResolvedValue({
        blob: new Blob(["test"], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename: "bao-cao-tong-hop_2026-09-01_2026-09-16.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

    const adminUser: PublicUser = {
      id: "admin-1",
      email: "admin@jaykiby.vn",
      role: "ADMIN",
      fullName: "Quản trị viên",
      phone: null,
      avatarUrl: null,
    };

    mockClient = {
      getCurrentUser: () => adminUser,
      synchronizeCurrentUser: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      refresh: vi.fn().mockResolvedValue(adminUser),
      logout: vi.fn(),
      changePassword: vi.fn(),
      authorizedRequest: vi.fn(),
      authorizedBlobRequest: mockAuthorizedBlobRequest,
    };
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders export button", () => {
    render(
      <AuthProvider client={mockClient}>
        <ExportReportButton
          dateRange={{ from: "2026-09-01", to: "2026-09-16" }}
          granularity="day"
        />
      </AuthProvider>,
    );

    expect(screen.getByRole("button", { name: /Xuất Excel/i })).toBeDefined();
  });

  it("triggers export on click and displays success message", async () => {
    render(
      <AuthProvider client={mockClient}>
        <ExportReportButton
          dateRange={{ from: "2026-09-01", to: "2026-09-16" }}
          granularity="day"
        />
      </AuthProvider>,
    );

    const button = screen.getByRole("button", { name: /Xuất Excel/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAuthorizedBlobRequest).toHaveBeenCalledWith(
        "/api/v1/reporting/export/workbook?from=2026-09-01&to=2026-09-16&granularity=day",
        {},
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Đã xuất file thành công: bao-cao-tong-hop_2026-09-01_2026-09-16.xlsx/i),
      ).toBeDefined();
    });
  });

  it("displays error message if export fails", async () => {
    mockAuthorizedBlobRequest.mockRejectedValueOnce(
      new Error("Lỗi khi kết xuất file từ máy chủ"),
    );

    render(
      <AuthProvider client={mockClient}>
        <ExportReportButton
          dateRange={{ from: "2026-09-01", to: "2026-09-16" }}
          granularity="day"
        />
      </AuthProvider>,
    );

    const button = screen.getByRole("button", { name: /Xuất Excel/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Lỗi khi kết xuất file từ máy chủ/i)).toBeDefined();
    });
  });
});
