import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardSummaryCards } from "./dashboard-summary-cards";
import { DateRangeFilter } from "./date-range-filter";
import { InventoryAlertsCard } from "./inventory-alerts-card";
import { OrderStatusDistribution } from "./order-status-distribution";
import { RevenueChart } from "./revenue-chart";
import { TopProductsTable } from "./top-products-table";

describe("Reporting Components", () => {
  describe("DashboardSummaryCards", () => {
    it("renders KPI cards with exact Vietnamese labels and formatted values", () => {
      render(
        <DashboardSummaryCards
          summary={{
            grossRevenue: "800000",
            completedOrders: 2,
            averageOrderValue: "400000",
            unitsSold: 5,
            outOfStockVariants: 1,
            lowStockVariants: 3,
            newCustomers: 4,
            metadata: {
              from: "2026-09-01",
              to: "2026-09-08",
              timezone: "Asia/Ho_Chi_Minh",
              generatedAt: "2026-09-08T00:00:00.000Z",
            },
          }}
        />,
      );

      expect(screen.getByText("Doanh thu hoàn tất")).toBeInTheDocument();
      expect(screen.getByText(/800\.000/)).toBeInTheDocument();
      expect(screen.getByText("Đơn hoàn tất")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Giá trị TB / đơn (AOV)")).toBeInTheDocument();
      expect(screen.getByText(/400\.000/)).toBeInTheDocument();
      expect(screen.getByText("Sản phẩm đã bán")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Cảnh báo tồn kho")).toBeInTheDocument();
      expect(screen.getByText(/1 hết \/ 3 thấp/)).toBeInTheDocument();
      expect(screen.getByText("Khách hàng mới")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  describe("RevenueChart", () => {
    it("renders SVG chart with total revenue and granularity buttons", () => {
      const onGranularityChange = vi.fn();
      render(
        <RevenueChart
          data={{
            granularity: "day",
            series: [
              { date: "2026-09-01", grossRevenue: "300000", completedOrders: 1 },
              { date: "2026-09-02", grossRevenue: "500000", completedOrders: 1 },
            ],
            totalRevenue: "800000",
            totalOrders: 2,
            metadata: {
              from: "2026-09-01",
              to: "2026-09-03",
              timezone: "Asia/Ho_Chi_Minh",
              generatedAt: "2026-09-03T00:00:00.000Z",
            },
          }}
          onGranularityChange={onGranularityChange}
        />,
      );

      expect(
        screen.getByText("Biểu đồ Doanh thu hoàn tất"),
      ).toBeInTheDocument();
      expect(screen.getByText(/800\.000/)).toBeInTheDocument();
      expect(screen.getByText(/2 đơn/)).toBeInTheDocument();

      const monthButton = screen.getByRole("button", { name: "Tháng" });
      fireEvent.click(monthButton);
      expect(onGranularityChange).toHaveBeenCalledWith("month");
    });
  });

  describe("OrderStatusDistribution", () => {
    it("renders order statuses with counts and percentages", () => {
      render(
        <OrderStatusDistribution
          data={{
            totalCurrentOrders: 10,
            periodCreatedOrders: 12,
            periodCompletedOrders: 8,
            periodCancelledOrders: 1,
            currentDistribution: [
              { status: "COMPLETED", count: 8, percentage: 80 },
              { status: "CANCELLED", count: 1, percentage: 10 },
              { status: "PENDING", count: 1, percentage: 10 },
            ],
            metadata: {
              from: "2026-09-01",
              to: "2026-09-08",
              timezone: "Asia/Ho_Chi_Minh",
              generatedAt: "2026-09-08T00:00:00.000Z",
            },
          }}
        />,
      );

      expect(
        screen.getByText("Phân bổ trạng thái đơn hàng"),
      ).toBeInTheDocument();
      expect(screen.getByText(/10 đơn/)).toBeInTheDocument();
      expect(screen.getByText("Hoàn tất")).toBeInTheDocument();
      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(screen.getByText("Đã hủy")).toBeInTheDocument();
      expect(screen.getByText("Chờ xác nhận")).toBeInTheDocument();
    });
  });

  describe("TopProductsTable", () => {
    it("renders top products ranking with unit sales and revenue", () => {
      render(
        <TopProductsTable
          data={{
            items: [
              {
                productId: "p1",
                productName: "Áo Thun Cotton",
                variantId: "v1",
                sku: "AT-01",
                variantName: "Xanh / 110",
                unitsSold: 10,
                productRevenue: "1500000",
              },
            ],
            totalRevenueRanked: "1500000",
            totalUnitsRanked: 10,
            metadata: {
              from: "2026-09-01",
              to: "2026-09-08",
              timezone: "Asia/Ho_Chi_Minh",
              generatedAt: "2026-09-08T00:00:00.000Z",
            },
          }}
        />,
      );

      expect(screen.getByText("Top sản phẩm bán chạy")).toBeInTheDocument();
      expect(screen.getByText("Áo Thun Cotton")).toBeInTheDocument();
      expect(screen.getByText("AT-01")).toBeInTheDocument();
      expect(screen.getAllByText("10 sp")).toHaveLength(2);
      expect(screen.getAllByText(/1\.500\.000/)).toHaveLength(2);
    });
  });

  describe("InventoryAlertsCard", () => {
    it("renders out-of-stock and low-stock items with direct inventory link", () => {
      render(
        <InventoryAlertsCard
          data={{
            threshold: 5,
            outOfStockCount: 1,
            lowStockCount: 1,
            items: [
              {
                variantId: "v1",
                productId: "p1",
                productName: "Váy hoa nhí",
                sku: "VH-01",
                sizeName: "100",
                colorName: "Hồng",
                onHand: 0,
                reserved: 0,
                available: 0,
                isOutOfStock: true,
              },
              {
                variantId: "v2",
                productId: "p2",
                productName: "Quần yếm",
                sku: "QY-02",
                sizeName: "110",
                colorName: "Be",
                onHand: 4,
                reserved: 1,
                available: 3,
                isOutOfStock: false,
              },
            ],
          }}
        />,
      );

      expect(screen.getByText("Cảnh báo tồn kho")).toBeInTheDocument();
      expect(screen.getByText("Hết hàng")).toBeInTheDocument();
      expect(screen.getByText("Còn 3")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Quản lý kho/ })).toHaveAttribute(
        "href",
        "/admin/inventory",
      );
    });
  });

  describe("DateRangeFilter", () => {
    it("allows clicking preset buttons to update date range", () => {
      const onChange = vi.fn();
      render(
        <DateRangeFilter
          from="2026-08-10"
          to="2026-09-10"
          onChange={onChange}
        />,
      );

      const btn7 = screen.getByRole("button", { name: "7 ngày qua" });
      fireEvent.click(btn7);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(String),
          to: expect.any(String),
        }),
      );
    });
  });
});
