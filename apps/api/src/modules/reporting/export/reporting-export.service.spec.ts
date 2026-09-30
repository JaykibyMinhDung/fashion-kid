import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ReportingService } from '../reporting.service';
import { ReportingExportService } from './reporting-export.service';
import { OrderStatus } from '../../../generated/prisma/client';

describe('ReportingExportService', () => {
  let service: ReportingExportService;
  let reportingService: jest.Mocked<Partial<ReportingService>>;
  let auditService: jest.Mocked<Partial<AuditService>>;

  const mockSummary = {
    grossRevenue: '10000000',
    netRevenue: '9259259',
    vatAmount: '740741',
    completedOrders: 20,
    averageOrderValue: '500000',
    unitsSold: 40,
    outOfStockVariants: 1,
    lowStockVariants: 3,
    newCustomers: 15,
    metadata: {
      from: '2026-09-01',
      to: '2026-09-16',
      timezone: 'Asia/Ho_Chi_Minh',
      generatedAt: new Date().toISOString(),
    },
  };

  const mockRevenue = {
    granularity: 'day' as const,
    series: [
      {
        date: '2026-09-01',
        grossRevenue: '2000000',
        completedOrders: 4,
      },
    ],
    totalRevenue: '2000000',
    totalOrders: 4,
    metadata: {
      from: '2026-09-01',
      to: '2026-09-16',
      timezone: 'Asia/Ho_Chi_Minh',
      generatedAt: new Date().toISOString(),
    },
  };

  const mockOrders = {
    currentDistribution: [
      { status: 'DELIVERED' as OrderStatus, count: 18, percentage: 90.0 },
      { status: 'CANCELLED' as OrderStatus, count: 2, percentage: 10.0 },
    ],
    totalCurrentOrders: 20,
    periodCreatedOrders: 20,
    periodCompletedOrders: 18,
    periodCancelledOrders: 2,
    metadata: {
      from: '2026-09-01',
      to: '2026-09-16',
      timezone: 'Asia/Ho_Chi_Minh',
      generatedAt: new Date().toISOString(),
    },
  };

  const mockProducts = {
    items: [
      {
        productId: 'p-1',
        productName: 'Áo thun bé trai',
        variantId: 'v-1',
        sku: 'AT-001',
        variantName: 'Xanh - Size 4',
        unitsSold: 12,
        productRevenue: '1800000',
      },
    ],
    totalRevenueRanked: '1800000',
    totalUnitsRanked: 12,
    metadata: {
      from: '2026-09-01',
      to: '2026-09-16',
      timezone: 'Asia/Ho_Chi_Minh',
      generatedAt: new Date().toISOString(),
    },
  };

  const mockInventory = {
    items: [
      {
        variantId: 'v-1',
        productId: 'p-1',
        sku: 'AT-001-BLU-4',
        productName: 'Áo thun bé trai',
        colorName: 'Xanh',
        sizeName: '4',
        onHand: 3,
        reserved: 1,
        available: 2,
        isOutOfStock: false,
      },
    ],
    outOfStockCount: 0,
    lowStockCount: 1,
    threshold: 5,
  };

  const mockCoupons = {
    realizedDiscountAmount: '100000',
    totalCompletedUsages: 5,
    topCoupons: [
      {
        couponId: 'c-1',
        code: 'SUMMER2026',
        name: 'Giảm giá hè 2026',
        discountAmount: '100000',
        usageCount: 5,
      },
    ],
    metadata: {
      from: '2026-09-01',
      to: '2026-09-16',
      timezone: 'Asia/Ho_Chi_Minh',
      generatedAt: new Date().toISOString(),
    },
  };

  const mockReviews = {
    publishedReviewCount: 10,
    averageRating: 4.8,
    ratingDistribution: {
      5: 8,
      4: 2,
      3: 0,
      2: 0,
      1: 0,
    },
  };

  const mockPayments = {
    methods: [
      {
        method: 'COD',
        count: 15,
        amount: '7500000',
      },
      {
        method: 'VNPAY',
        count: 5,
        amount: '2500000',
      },
    ],
    totalPaidAmount: '10000000',
    metadata: {
      from: '2026-09-01',
      to: '2026-09-16',
      timezone: 'Asia/Ho_Chi_Minh',
      generatedAt: new Date().toISOString(),
    },
  };

  const mockTax = {
    grossRevenue: '10000000',
    netRevenue: '9259259',
    vatAmount: '740741',
    completedOrders: 20,
    metadata: {
      from: '2026-09-01',
      to: '2026-09-16',
      timezone: 'Asia/Ho_Chi_Minh',
      generatedAt: new Date().toISOString(),
    },
  };

  beforeEach(async () => {
    reportingService = {
      getDashboardSummary: jest.fn().mockResolvedValue(mockSummary),
      getRevenueSeries: jest.fn().mockResolvedValue(mockRevenue),
      getOrdersReport: jest.fn().mockResolvedValue(mockOrders),
      getTopProducts: jest.fn().mockResolvedValue(mockProducts),
      getInventoryAlerts: jest.fn().mockResolvedValue(mockInventory),
      getCouponsReport: jest.fn().mockResolvedValue(mockCoupons),
      getReviewsReport: jest.fn().mockResolvedValue(mockReviews),
      getPaymentsReport: jest.fn().mockResolvedValue(mockPayments),
      getTaxSummary: jest.fn().mockResolvedValue(mockTax),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingExportService,
        { provide: ReportingService, useValue: reportingService },
        { provide: AuditService, useValue: auditService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<ReportingExportService>(ReportingExportService);
  });

  it('should export summary report and record audit', async () => {
    const result = await service.exportSummary(
      { from: '2026-09-01', to: '2026-09-16' },
      { actorId: 'admin-1', ipAddress: '127.0.0.1' },
    );

    expect(result.workbook.worksheets.length).toBe(1);
    expect(result.workbook.getWorksheet('TongQuan')).toBeDefined();
    expect(result.filename).toContain('bao-cao-tong-quan');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'REPORT_EXPORTED',
        entityType: 'ReportingExport',
        actorId: 'admin-1',
      }),
    );
  });

  it('should export revenue series report', async () => {
    const result = await service.exportRevenue({
      from: '2026-09-01',
      to: '2026-09-16',
      granularity: 'day',
    });

    expect(result.workbook.getWorksheet('DoanhThu')).toBeDefined();
    expect(result.filename).toContain('bao-cao-doanh-thu');
  });

  it('should export consolidated workbook with all 9 sheets', async () => {
    const result = await service.exportConsolidatedWorkbook({
      from: '2026-09-01',
      to: '2026-09-16',
      granularity: 'day',
    });

    expect(result.workbook.worksheets.length).toBe(9);
    const sheetNames = result.workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toEqual([
      'TongQuan',
      'DoanhThu',
      'DonHang',
      'TopSanPham',
      'TonKho',
      'Coupon',
      'DanhGia',
      'ThanhToan',
      'ThueGTGT',
    ]);
    expect(result.filename).toContain('bao-cao-tong-hop');
  });

  it('should handle partial failure gracefully when building consolidated workbook', async () => {
    (reportingService.getReviewsReport as jest.Mock).mockRejectedValueOnce(
      new Error('Reviews DB connection timeout'),
    );

    const result = await service.exportConsolidatedWorkbook({
      from: '2026-09-01',
      to: '2026-09-16',
      granularity: 'day',
    });

    expect(result.workbook.worksheets.length).toBe(9);
    const reviewsSheet = result.workbook.getWorksheet('DanhGia');
    expect(reviewsSheet).toBeDefined();
    expect(reviewsSheet?.getCell('A5').value).toBe(
      'Không thể tải dữ liệu đánh giá',
    );
  });
});
