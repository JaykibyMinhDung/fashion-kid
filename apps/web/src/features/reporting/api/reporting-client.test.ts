import { describe, expect, it, vi } from "vitest";
import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import {
  exportConsolidatedWorkbook,
  getDashboardSummary,
  getInventoryAlerts,
  getOrdersReport,
  getRevenueSeries,
  getTopProducts,
} from "./reporting-client";

describe("reporting-client", () => {
  it("correctly constructs API paths with query parameters", async () => {
    const calls: Array<{ path: string; method: string }> = [];
    const request: AuthContextValue["authorizedRequest"] = async <T>(
      path: `/${string}`,
      init?: RequestInit,
    ) => {
      calls.push({
        path,
        method: init?.method ?? "GET",
      });
      return {} as T;
    };

    await getDashboardSummary(request, {
      from: "2026-09-01",
      to: "2026-09-08",
    });

    await getRevenueSeries(request, {
      from: "2026-09-01",
      to: "2026-09-08",
      granularity: "day",
    });

    await getOrdersReport(request, {
      from: "2026-09-01",
      to: "2026-09-08",
    });

    await getTopProducts(request, {
      from: "2026-09-01",
      to: "2026-09-08",
      limit: 5,
      sortBy: "revenue",
    });

    await getInventoryAlerts(request, {
      threshold: 5,
      limit: 10,
    });

    expect(calls).toEqual([
      {
        path: "/api/v1/admin/reports/summary?from=2026-09-01&to=2026-09-08",
        method: "GET",
      },
      {
        path: "/api/v1/admin/reports/revenue?from=2026-09-01&to=2026-09-08&granularity=day",
        method: "GET",
      },
      {
        path: "/api/v1/admin/reports/orders?from=2026-09-01&to=2026-09-08",
        method: "GET",
      },
      {
        path: "/api/v1/admin/reports/products?from=2026-09-01&to=2026-09-08&limit=5&sortBy=revenue",
        method: "GET",
      },
      {
        path: "/api/v1/admin/reports/inventory?threshold=5&limit=10",
        method: "GET",
      },
    ]);
  });

  it("correctly calls exportConsolidatedWorkbook and triggers download", async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/test-blob");
    window.URL.revokeObjectURL = vi.fn();

    const mockBlob = new Blob(["fake-excel-data"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const calls: Array<{ path: string }> = [];
    const blobRequest = async (path: `/${string}`) => {
      calls.push({ path });
      return {
        blob: mockBlob,
        filename: "bao-cao-tong-hop_2026-09-01_2026-09-16.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    };

    const filename = await exportConsolidatedWorkbook(blobRequest, {
      from: "2026-09-01",
      to: "2026-09-16",
      granularity: "day",
    });

    expect(filename).toBe("bao-cao-tong-hop_2026-09-01_2026-09-16.xlsx");
    expect(calls[0].path).toBe(
      "/api/v1/reporting/export/workbook?from=2026-09-01&to=2026-09-16&granularity=day",
    );
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/test-blob");
  });
});
