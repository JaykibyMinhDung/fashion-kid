import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiException } from '../../common/errors/api-error';
import { OrderStatus } from '../../generated/prisma/client';
import { Granularity } from './dto/reporting-query.dto';
import { ReportingRepository } from './repositories/reporting.repository';
import { ReportingService } from './reporting.service';

describe('ReportingService', () => {
  let service: ReportingService;

  const mockRepository = {
    getCompletedRevenueSummary: jest.fn(),
    getNewCustomersCount: jest.fn(),
    getInventoryAlertCounts: jest.fn(),
    getRevenueSeries: jest.fn(),
    getCurrentOrderStatusCounts: jest.fn(),
    getPeriodOrderCounts: jest.fn(),
    getTopProducts: jest.fn(),
    getInventoryAlerts: jest.fn(),
    getCompletedCouponUsage: jest.fn(),
    getReviewSummary: jest.fn(),
    getPaymentMethodBreakdown: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: ReportingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
  });

  describe('normalizeDateRange', () => {
    it('should correctly normalize valid custom date range with UTC+7 offset', () => {
      const result = service.normalizeDateRange({
        from: '2026-09-01',
        to: '2026-09-08',
      });

      expect(result.fromStr).toBe('2026-09-01');
      expect(result.toStr).toBe('2026-09-08');
      // 2026-09-01 00:00:00 UTC+7 is 2026-08-31 17:00:00 UTC
      expect(result.fromUtc.toISOString()).toBe('2026-08-31T17:00:00.000Z');
      // 2026-09-08 00:00:00 UTC+7 is 2026-09-07 17:00:00 UTC
      expect(result.toUtc.toISOString()).toBe('2026-09-07T17:00:00.000Z');
    });

    it('should provide default 30-day range when query is omitted', () => {
      const result = service.normalizeDateRange();

      expect(result.fromStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.toStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.fromUtc.getTime()).toBeLessThan(result.toUtc.getTime());
    });

    it('should throw REPORT_INVALID_DATE_RANGE for malformed dates', () => {
      try {
        service.normalizeDateRange({ from: 'invalid-date', to: '2026-09-08' });
        fail('Should throw error');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiException);
        const apiErr = err as ApiException;
        expect(apiErr.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(apiErr.code).toBe('REPORT_INVALID_DATE_RANGE');
      }
    });

    it('should throw REPORT_INVALID_DATE_RANGE when from >= to', () => {
      try {
        service.normalizeDateRange({
          from: '2026-09-08',
          to: '2026-09-08',
        });
        fail('Should throw error');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiException);
        const apiErr = err as ApiException;
        expect(apiErr.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(apiErr.code).toBe('REPORT_INVALID_DATE_RANGE');
      }

      try {
        service.normalizeDateRange({
          from: '2026-09-10',
          to: '2026-09-08',
        });
        fail('Should throw error');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiException);
        const apiErr = err as ApiException;
        expect(apiErr.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(apiErr.code).toBe('REPORT_INVALID_DATE_RANGE');
      }
    });

    it('should throw REPORT_RANGE_TOO_LARGE when range exceeds 366 days', () => {
      try {
        service.normalizeDateRange({
          from: '2025-01-01',
          to: '2026-02-01', // > 366 days
        });
        fail('Should throw error');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiException);
        const apiErr = err as ApiException;
        expect(apiErr.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(apiErr.code).toBe('REPORT_RANGE_TOO_LARGE');
      }
    });
  });

  describe('getDashboardSummary', () => {
    it('should calculate summary metrics and AOV correctly', async () => {
      mockRepository.getCompletedRevenueSummary.mockResolvedValue({
        grossRevenue: 800000n,
        netRevenue: 740741n,
        vatAmount: 59259n,
        completedOrders: 2,
        unitsSold: 5,
      });
      mockRepository.getNewCustomersCount.mockResolvedValue(3);
      mockRepository.getInventoryAlertCounts.mockResolvedValue({
        outOfStockCount: 1,
        lowStockCount: 4,
      });

      const summary = await service.getDashboardSummary({
        from: '2026-09-01',
        to: '2026-09-08',
      });

      expect(summary.grossRevenue).toBe('800000');
      expect(summary.netRevenue).toBe('740741');
      expect(summary.vatAmount).toBe('59259');
      expect(summary.completedOrders).toBe(2);
      expect(summary.averageOrderValue).toBe('400000');
      expect(summary.unitsSold).toBe(5);
      expect(summary.newCustomers).toBe(3);
      expect(summary.outOfStockVariants).toBe(1);
      expect(summary.lowStockVariants).toBe(4);
      expect(summary.metadata.timezone).toBe('Asia/Ho_Chi_Minh');
    });

    it('should handle zero completed orders without divide-by-zero error', async () => {
      mockRepository.getCompletedRevenueSummary.mockResolvedValue({
        grossRevenue: 0n,
        netRevenue: 0n,
        vatAmount: 0n,
        completedOrders: 0,
        unitsSold: 0,
      });
      mockRepository.getNewCustomersCount.mockResolvedValue(0);
      mockRepository.getInventoryAlertCounts.mockResolvedValue({
        outOfStockCount: 0,
        lowStockCount: 0,
      });

      const summary = await service.getDashboardSummary({
        from: '2026-09-01',
        to: '2026-09-02',
      });

      expect(summary.grossRevenue).toBe('0');
      expect(summary.netRevenue).toBe('0');
      expect(summary.vatAmount).toBe('0');
      expect(summary.completedOrders).toBe(0);
      expect(summary.averageOrderValue).toBe('0');
      expect(summary.unitsSold).toBe(0);
    });
  });

  describe('getTaxSummary', () => {
    it('returns grossRevenue, netRevenue, vatAmount and completedOrders', async () => {
      mockRepository.getCompletedRevenueSummary.mockResolvedValue({
        grossRevenue: 1080000n,
        netRevenue: 1000000n,
        vatAmount: 80000n,
        completedOrders: 3,
        unitsSold: 8,
      });

      const tax = await service.getTaxSummary({
        from: '2026-09-01',
        to: '2026-09-30',
      });

      expect(tax.grossRevenue).toBe('1080000');
      expect(tax.netRevenue).toBe('1000000');
      expect(tax.vatAmount).toBe('80000');
      expect(tax.completedOrders).toBe(3);
      expect(tax.metadata.from).toBe('2026-09-01');
      expect(tax.metadata.to).toBe('2026-09-30');
    });
  });

  describe('getRevenueSeries', () => {
    it('should zero-fill missing dates for daily granularity', async () => {
      mockRepository.getRevenueSeries.mockResolvedValue([
        { bucket: '2026-09-02', revenue: 500000n, count: 1 },
      ]);

      const result = await service.getRevenueSeries({
        from: '2026-09-01',
        to: '2026-09-04',
        granularity: 'day',
      });

      expect(result.granularity).toBe('day');
      expect(result.series).toHaveLength(3);
      // Day 1: zero-filled
      expect(result.series[0]).toEqual({
        date: '2026-09-01',
        grossRevenue: '0',
        completedOrders: 0,
      });
      // Day 2: data present
      expect(result.series[1]).toEqual({
        date: '2026-09-02',
        grossRevenue: '500000',
        completedOrders: 1,
      });
      // Day 3: zero-filled
      expect(result.series[2]).toEqual({
        date: '2026-09-03',
        grossRevenue: '0',
        completedOrders: 0,
      });
      expect(result.totalRevenue).toBe('500000');
      expect(result.totalOrders).toBe(1);
    });

    it('should throw REPORT_INVALID_GRANULARITY for invalid granularity', async () => {
      try {
        await service.getRevenueSeries({
          from: '2026-09-01',
          to: '2026-09-04',
          granularity: 'yearly' as unknown as Granularity,
        });
        fail('Should throw error');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiException);
        const apiErr = err as ApiException;
        expect(apiErr.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(apiErr.code).toBe('REPORT_INVALID_GRANULARITY');
      }
    });
  });

  describe('getOrdersReport', () => {
    it('should format all 7 order statuses and period counts', async () => {
      mockRepository.getCurrentOrderStatusCounts.mockResolvedValue([
        { status: OrderStatus.PENDING, count: 5 },
        { status: OrderStatus.COMPLETED, count: 15 },
      ]);
      mockRepository.getPeriodOrderCounts.mockResolvedValue({
        created: 20,
        completed: 15,
        cancelled: 2,
      });

      const report = await service.getOrdersReport({
        from: '2026-09-01',
        to: '2026-09-08',
      });

      expect(report.totalCurrentOrders).toBe(20);
      expect(report.currentDistribution).toHaveLength(7);

      const pendingItem = report.currentDistribution.find(
        (d) => d.status === OrderStatus.PENDING,
      );
      expect(pendingItem).toEqual({
        status: OrderStatus.PENDING,
        count: 5,
        percentage: 25.0,
      });

      const completedItem = report.currentDistribution.find(
        (d) => d.status === OrderStatus.COMPLETED,
      );
      expect(completedItem).toEqual({
        status: OrderStatus.COMPLETED,
        count: 15,
        percentage: 75.0,
      });

      const cancelledItem = report.currentDistribution.find(
        (d) => d.status === OrderStatus.CANCELLED,
      );
      expect(cancelledItem).toEqual({
        status: OrderStatus.CANCELLED,
        count: 0,
        percentage: 0,
      });

      expect(report.periodCreatedOrders).toBe(20);
      expect(report.periodCompletedOrders).toBe(15);
      expect(report.periodCancelledOrders).toBe(2);
    });
  });

  describe('getTopProducts', () => {
    it('should format product list and aggregate totals', async () => {
      mockRepository.getTopProducts.mockResolvedValue([
        {
          productId: 'prod-1',
          productName: 'Áo thun bé trai',
          variantId: 'var-1',
          sku: 'AT-01',
          variantName: 'Đỏ / M',
          unitsSold: 10,
          productRevenue: 1500000n,
        },
        {
          productId: 'prod-2',
          productName: 'Váy bé gái',
          variantId: 'var-2',
          sku: 'VB-02',
          variantName: 'Hồng / L',
          unitsSold: 5,
          productRevenue: 1000000n,
        },
      ]);

      const result = await service.getTopProducts({
        from: '2026-09-01',
        to: '2026-09-08',
        limit: 5,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].productRevenue).toBe('1500000');
      expect(result.totalRevenueRanked).toBe('2500000');
      expect(result.totalUnitsRanked).toBe(15);
    });
  });

  describe('getInventoryAlerts', () => {
    it('should map inventory items and detect out-of-stock flag', async () => {
      mockRepository.getInventoryAlerts.mockResolvedValue([
        {
          variantId: 'var-1',
          productId: 'prod-1',
          productName: 'Áo khoác gió',
          sku: 'AK-01',
          sizeName: '110',
          colorName: 'Xanh',
          onHand: 0,
          reserved: 0,
          available: 0,
        },
        {
          variantId: 'var-2',
          productId: 'prod-2',
          productName: 'Quần jeans',
          sku: 'QJ-01',
          sizeName: '120',
          colorName: 'Đen',
          onHand: 4,
          reserved: 1,
          available: 3,
        },
      ]);
      mockRepository.getInventoryAlertCounts.mockResolvedValue({
        outOfStockCount: 1,
        lowStockCount: 1,
      });

      const alerts = await service.getInventoryAlerts({
        threshold: 5,
      });

      expect(alerts.outOfStockCount).toBe(1);
      expect(alerts.lowStockCount).toBe(1);
      expect(alerts.items[0].isOutOfStock).toBe(true);
      expect(alerts.items[1].isOutOfStock).toBe(false);
    });
  });

  describe('getCouponsReport', () => {
    it('should format coupons report properly', async () => {
      mockRepository.getCompletedCouponUsage.mockResolvedValue({
        totalDiscount: 150000n,
        totalUsages: 3,
        topCoupons: [
          {
            couponId: 'coup-1',
            code: 'CHAOBANMOI',
            name: 'Chào bạn mới',
            discountAmount: 150000n,
            usageCount: 3,
          },
        ],
      });

      const report = await service.getCouponsReport({
        from: '2026-09-01',
        to: '2026-09-08',
      });

      expect(report.realizedDiscountAmount).toBe('150000');
      expect(report.totalCompletedUsages).toBe(3);
      expect(report.topCoupons[0].discountAmount).toBe('150000');
    });
  });

  describe('getReviewsReport', () => {
    it('should delegate to repository for review statistics', async () => {
      const mockReviews = {
        totalPublished: 10,
        averageRating: 4.8,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 8 },
      };
      mockRepository.getReviewSummary.mockResolvedValue(mockReviews);

      const result = await service.getReviewsReport();
      expect(result).toEqual({
        publishedReviewCount: 10,
        averageRating: 4.8,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 8 },
      });
    });
  });

  describe('getPaymentsReport', () => {
    it('should calculate total payment amount correctly', async () => {
      mockRepository.getPaymentMethodBreakdown.mockResolvedValue([
        { method: 'COD', amount: 500000n, count: 2 },
        { method: 'VNPAY', amount: 300000n, count: 1 },
      ]);

      const result = await service.getPaymentsReport({
        from: '2026-09-01',
        to: '2026-09-08',
      });

      expect(result.totalPaidAmount).toBe('800000');
      expect(result.methods).toHaveLength(2);
      expect(result.methods[0]).toEqual({
        method: 'COD',
        amount: '500000',
        count: 2,
      });
    });
  });
});
