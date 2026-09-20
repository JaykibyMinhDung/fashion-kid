import { Injectable, Logger } from '@nestjs/common';
import type { Workbook } from 'exceljs';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type {
  CouponsReportQueryDto,
  DateRangeQueryDto,
  InventoryAlertsQueryDto,
  OrdersReportQueryDto,
  RevenueSeriesQueryDto,
  TopProductsQueryDto,
} from '../dto/reporting-query.dto';
import { ReportingService } from '../reporting.service';
import {
  addEmptyStateRow,
  applyStandardSheetLayout,
  createWorkbook,
} from './excel-workbook.builder';
import { ReportSheetRegistry } from './report-sheet.registry';

export interface ExportContext {
  actorId?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
}

export interface ExportResult {
  workbook: Workbook;
  filename: string;
}

function formatDateForFilename(dateStr?: string): string {
  if (!dateStr) return 'all';
  return dateStr.replace(/[^a-zA-Z0-9_-]/g, '');
}

function getDateRangeText(from?: string, to?: string): string | undefined {
  if (from && to) return `${from} đến ${to}`;
  if (from) return `Từ ${from}`;
  if (to) return `Đến ${to}`;
  return undefined;
}

@Injectable()
export class ReportingExportService {
  private readonly logger = new Logger(ReportingExportService.name);

  constructor(
    private readonly reportingService: ReportingService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  private async recordAudit(
    reportType: string,
    query?: unknown,
    context?: ExportContext,
  ): Promise<void> {
    try {
      await this.auditService.record(this.prisma, {
        actorId: context?.actorId ?? null,
        action: 'REPORT_EXPORTED',
        entityType: 'ReportingExport',
        metadata: {
          reportType,
          query: (query ?? {}) as Record<string, unknown>,
          exportedAt: new Date().toISOString(),
        },
        ipAddress: context?.ipAddress ?? null,
        requestId: context?.requestId ?? null,
      });
    } catch (err) {
      this.logger.warn(`Failed to record audit for ${reportType} export: ${String(err)}`);
    }
  }

  async exportSummary(
    query: DateRangeQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const data = await this.reportingService.getDashboardSummary(query);
    const workbook = createWorkbook('Báo cáo tổng quan KPI');
    const sheet = workbook.addWorksheet('TongQuan');
    const dateRangeText = getDateRangeText(query.from, query.to);
    ReportSheetRegistry.buildSummarySheet(sheet, data, dateRangeText);

    await this.recordAudit('SUMMARY', query, context);
    const filename = `bao-cao-tong-quan_${formatDateForFilename(query.from)}_${formatDateForFilename(query.to)}.xlsx`;
    return { workbook, filename };
  }

  async exportRevenue(
    query: RevenueSeriesQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const data = await this.reportingService.getRevenueSeries(query);
    const workbook = createWorkbook('Báo cáo doanh thu');
    const sheet = workbook.addWorksheet('DoanhThu');
    const dateRangeText = getDateRangeText(query.from, query.to);
    ReportSheetRegistry.buildRevenueSheet(sheet, data, dateRangeText);

    await this.recordAudit('REVENUE', query, context);
    const filename = `bao-cao-doanh-thu_${formatDateForFilename(query.from)}_${formatDateForFilename(query.to)}.xlsx`;
    return { workbook, filename };
  }

  async exportOrders(
    query: OrdersReportQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const data = await this.reportingService.getOrdersReport(query);
    const workbook = createWorkbook('Báo cáo đơn hàng');
    const sheet = workbook.addWorksheet('DonHang');
    const dateRangeText = getDateRangeText(query.from, query.to);
    ReportSheetRegistry.buildOrdersSheet(sheet, data, dateRangeText);

    await this.recordAudit('ORDERS', query, context);
    const filename = `bao-cao-don-hang_${formatDateForFilename(query.from)}_${formatDateForFilename(query.to)}.xlsx`;
    return { workbook, filename };
  }

  async exportProducts(
    query: TopProductsQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const data = await this.reportingService.getTopProducts(query);
    const workbook = createWorkbook('Báo cáo sản phẩm bán chạy');
    const sheet = workbook.addWorksheet('TopSanPham');
    const dateRangeText = getDateRangeText(query.from, query.to);
    ReportSheetRegistry.buildTopProductsSheet(sheet, data, dateRangeText);

    await this.recordAudit('PRODUCTS', query, context);
    const filename = `bao-cao-top-san-pham_${formatDateForFilename(query.from)}_${formatDateForFilename(query.to)}.xlsx`;
    return { workbook, filename };
  }

  async exportInventory(
    query: InventoryAlertsQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const data = await this.reportingService.getInventoryAlerts(query);
    const workbook = createWorkbook('Báo cáo tồn kho');
    const sheet = workbook.addWorksheet('TonKho');
    ReportSheetRegistry.buildInventorySheet(sheet, data);

    await this.recordAudit('INVENTORY', query, context);
    const filename = 'bao-cao-ton-kho.xlsx';
    return { workbook, filename };
  }

  async exportCoupons(
    query: CouponsReportQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const data = await this.reportingService.getCouponsReport(query);
    const workbook = createWorkbook('Báo cáo mã khuyến mãi');
    const sheet = workbook.addWorksheet('Coupon');
    const dateRangeText = getDateRangeText(query.from, query.to);
    ReportSheetRegistry.buildCouponsSheet(sheet, data, dateRangeText);

    await this.recordAudit('COUPONS', query, context);
    const filename = `bao-cao-khuyen-mai_${formatDateForFilename(query.from)}_${formatDateForFilename(query.to)}.xlsx`;
    return { workbook, filename };
  }

  async exportReviews(context?: ExportContext): Promise<ExportResult> {
    const data = await this.reportingService.getReviewsReport();
    const workbook = createWorkbook('Báo cáo đánh giá sản phẩm');
    const sheet = workbook.addWorksheet('DanhGia');
    ReportSheetRegistry.buildReviewsSheet(sheet, data);

    await this.recordAudit('REVIEWS', {}, context);
    const filename = 'bao-cao-danh-gia.xlsx';
    return { workbook, filename };
  }

  async exportPayments(
    query: DateRangeQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const data = await this.reportingService.getPaymentsReport(query);
    const workbook = createWorkbook('Báo cáo phương thức thanh toán');
    const sheet = workbook.addWorksheet('ThanhToan');
    const dateRangeText = getDateRangeText(query.from, query.to);
    ReportSheetRegistry.buildPaymentsSheet(sheet, data, dateRangeText);

    await this.recordAudit('PAYMENTS', query, context);
    const filename = `bao-cao-thanh-toan_${formatDateForFilename(query.from)}_${formatDateForFilename(query.to)}.xlsx`;
    return { workbook, filename };
  }

  async exportTax(
    query: DateRangeQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const data = await this.reportingService.getTaxSummary(query);
    const workbook = createWorkbook('Báo cáo thuế GTGT');
    const sheet = workbook.addWorksheet('ThueGTGT');
    const dateRangeText = getDateRangeText(query.from, query.to);
    ReportSheetRegistry.buildTaxSheet(sheet, data, dateRangeText);

    await this.recordAudit('TAX', query, context);
    const filename = `bao-cao-thue-gtgt_${formatDateForFilename(query.from)}_${formatDateForFilename(query.to)}.xlsx`;
    return { workbook, filename };
  }

  /**
   * Xuất Workbook tổng hợp 9 sheet với cơ chế chịu lỗi Promise.allSettled
   */
  async exportConsolidatedWorkbook(
    query: RevenueSeriesQueryDto,
    context?: ExportContext,
  ): Promise<ExportResult> {
    const workbook = createWorkbook('Báo cáo tổng hợp vận hành & tài chính');
    const dateRangeText = getDateRangeText(query.from, query.to);

    const [
      summaryRes,
      revenueRes,
      ordersRes,
      productsRes,
      inventoryRes,
      couponsRes,
      reviewsRes,
      paymentsRes,
      taxRes,
    ] = await Promise.allSettled([
      this.reportingService.getDashboardSummary(query),
      this.reportingService.getRevenueSeries(query),
      this.reportingService.getOrdersReport(query),
      this.reportingService.getTopProducts({
        from: query.from,
        to: query.to,
        limit: 20,
        sortBy: 'revenue',
      }),
      this.reportingService.getInventoryAlerts({
        threshold: 5,
        limit: 50,
        status: 'all',
      }),
      this.reportingService.getCouponsReport({
        from: query.from,
        to: query.to,
        limit: 20,
      }),
      this.reportingService.getReviewsReport(),
      this.reportingService.getPaymentsReport(query),
      this.reportingService.getTaxSummary(query),
    ]);

    // 1. TongQuan
    const summarySheet = workbook.addWorksheet('TongQuan');
    if (summaryRes.status === 'fulfilled') {
      ReportSheetRegistry.buildSummarySheet(summarySheet, summaryRes.value, dateRangeText);
    } else {
      applyStandardSheetLayout(summarySheet, {
        title: 'Báo cáo tổng quan KPI',
        dateRangeText,
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(summarySheet, 5, 1, 'Không thể tải dữ liệu tổng quan');
    }

    // 2. DoanhThu
    const revenueSheet = workbook.addWorksheet('DoanhThu');
    if (revenueRes.status === 'fulfilled') {
      ReportSheetRegistry.buildRevenueSheet(revenueSheet, revenueRes.value, dateRangeText);
    } else {
      applyStandardSheetLayout(revenueSheet, {
        title: 'Báo cáo doanh thu',
        dateRangeText,
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(revenueSheet, 5, 1, 'Không thể tải dữ liệu doanh thu');
    }

    // 3. DonHang
    const ordersSheet = workbook.addWorksheet('DonHang');
    if (ordersRes.status === 'fulfilled') {
      ReportSheetRegistry.buildOrdersSheet(ordersSheet, ordersRes.value, dateRangeText);
    } else {
      applyStandardSheetLayout(ordersSheet, {
        title: 'Báo cáo đơn hàng',
        dateRangeText,
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(ordersSheet, 5, 1, 'Không thể tải dữ liệu đơn hàng');
    }

    // 4. TopSanPham
    const productsSheet = workbook.addWorksheet('TopSanPham');
    if (productsRes.status === 'fulfilled') {
      ReportSheetRegistry.buildTopProductsSheet(productsSheet, productsRes.value, dateRangeText);
    } else {
      applyStandardSheetLayout(productsSheet, {
        title: 'Báo cáo sản phẩm bán chạy',
        dateRangeText,
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(productsSheet, 5, 1, 'Không thể tải dữ liệu sản phẩm');
    }

    // 5. TonKho
    const inventorySheet = workbook.addWorksheet('TonKho');
    if (inventoryRes.status === 'fulfilled') {
      ReportSheetRegistry.buildInventorySheet(inventorySheet, inventoryRes.value);
    } else {
      applyStandardSheetLayout(inventorySheet, {
        title: 'Báo cáo tồn kho',
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(inventorySheet, 5, 1, 'Không thể tải dữ liệu tồn kho');
    }

    // 6. Coupon
    const couponsSheet = workbook.addWorksheet('Coupon');
    if (couponsRes.status === 'fulfilled') {
      ReportSheetRegistry.buildCouponsSheet(couponsSheet, couponsRes.value, dateRangeText);
    } else {
      applyStandardSheetLayout(couponsSheet, {
        title: 'Báo cáo mã khuyến mãi',
        dateRangeText,
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(couponsSheet, 5, 1, 'Không thể tải dữ liệu mã khuyến mãi');
    }

    // 7. DanhGia
    const reviewsSheet = workbook.addWorksheet('DanhGia');
    if (reviewsRes.status === 'fulfilled') {
      ReportSheetRegistry.buildReviewsSheet(reviewsSheet, reviewsRes.value);
    } else {
      applyStandardSheetLayout(reviewsSheet, {
        title: 'Báo cáo đánh giá',
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(reviewsSheet, 5, 1, 'Không thể tải dữ liệu đánh giá');
    }

    // 8. ThanhToan
    const paymentsSheet = workbook.addWorksheet('ThanhToan');
    if (paymentsRes.status === 'fulfilled') {
      ReportSheetRegistry.buildPaymentsSheet(paymentsSheet, paymentsRes.value, dateRangeText);
    } else {
      applyStandardSheetLayout(paymentsSheet, {
        title: 'Báo cáo thanh toán',
        dateRangeText,
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(paymentsSheet, 5, 1, 'Không thể tải dữ liệu thanh toán');
    }

    // 9. ThueGTGT
    const taxSheet = workbook.addWorksheet('ThueGTGT');
    if (taxRes.status === 'fulfilled') {
      ReportSheetRegistry.buildTaxSheet(taxSheet, taxRes.value, dateRangeText);
    } else {
      applyStandardSheetLayout(taxSheet, {
        title: 'Báo cáo thuế GTGT',
        dateRangeText,
        columns: [{ header: 'Lỗi', key: 'error', width: 40 }],
      });
      addEmptyStateRow(taxSheet, 5, 1, 'Không thể tải dữ liệu thuế GTGT');
    }

    await this.recordAudit('CONSOLIDATED_WORKBOOK', query, context);
    const filename = `bao-cao-tong-hop_${formatDateForFilename(query.from)}_${formatDateForFilename(query.to)}.xlsx`;
    return { workbook, filename };
  }
}
