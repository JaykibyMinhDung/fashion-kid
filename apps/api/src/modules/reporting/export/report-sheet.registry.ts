import type { Worksheet } from 'exceljs';
import type {
  CouponsReportResponseDto,
  DashboardSummaryDto,
  InventoryAlertsResponseDto,
  OrdersReportResponseDto,
  PaymentsReportResponseDto,
  RevenueSeriesResponseDto,
  ReviewsReportResponseDto,
  TaxSummaryResponseDto,
  TopProductsResponseDto,
} from '../dto/reporting-response.dto';
import {
  addEmptyStateRow,
  applyStandardSheetLayout,
  autoFitColumns,
  EXCEL_STYLES,
  formulaCell,
  moneyCell,
  numberCell,
  textCell,
} from './excel-workbook.builder';

export class ReportSheetRegistry {
  /**
   * Sheet 1: Tổng quan KPI Dashboard
   */
  static buildSummarySheet(
    sheet: Worksheet,
    data: DashboardSummaryDto,
    dateRangeText?: string,
  ): void {
    const columns = [
      { header: 'Chỉ số KPI', key: 'kpi', width: 35 },
      { header: 'Giá trị', key: 'value', width: 22, align: 'right' as const },
      { header: 'Đơn vị tính', key: 'unit', width: 18, align: 'center' as const },
    ];

    applyStandardSheetLayout(sheet, {
      title: 'Báo cáo tổng quan KPI vận hành',
      dateRangeText,
      columns,
    });

    const rowsData: Array<{
      kpi: string;
      value: bigint | number | string;
      unit: string;
      isMoney?: boolean;
      isNumber?: boolean;
    }> = [
      {
        kpi: 'Doanh thu gộp (Gross Revenue)',
        value: data.grossRevenue,
        unit: 'VNĐ',
        isMoney: true,
      },
      {
        kpi: 'Doanh thu thuần (Net Revenue)',
        value: data.netRevenue,
        unit: 'VNĐ',
        isMoney: true,
      },
      {
        kpi: 'Tiền thuế GTGT 8% (VAT Amount)',
        value: data.vatAmount,
        unit: 'VNĐ',
        isMoney: true,
      },
      {
        kpi: 'Số đơn hàng hoàn tất',
        value: data.completedOrders,
        unit: 'Đơn hàng',
        isNumber: true,
      },
      {
        kpi: 'Giá trị đơn hàng trung bình (AOV)',
        value: data.averageOrderValue,
        unit: 'VNĐ/đơn',
        isMoney: true,
      },
      {
        kpi: 'Tổng sản phẩm bán ra',
        value: data.unitsSold,
        unit: 'Sản phẩm',
        isNumber: true,
      },
      {
        kpi: 'Số biến thể hết hàng (out of stock)',
        value: data.outOfStockVariants,
        unit: 'Biến thể',
        isNumber: true,
      },
      {
        kpi: 'Số biến thể sắp hết hàng (low stock)',
        value: data.lowStockVariants,
        unit: 'Biến thể',
        isNumber: true,
      },
      {
        kpi: 'Số khách hàng mới',
        value: data.newCustomers,
        unit: 'Khách hàng',
        isNumber: true,
      },
    ];

    rowsData.forEach((item, idx) => {
      const row = sheet.getRow(5 + idx);
      row.height = 22;
      textCell(row.getCell(1), item.kpi, 'left');
      if (item.isMoney) {
        moneyCell(row.getCell(2), item.value);
      } else if (item.isNumber) {
        numberCell(row.getCell(2), Number(item.value));
      } else {
        textCell(row.getCell(2), String(item.value), 'right');
      }
      textCell(row.getCell(3), item.unit, 'center');

      for (let c = 1; c <= 3; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    autoFitColumns(sheet);
  }

  /**
   * Sheet 2: Doanh thu theo chuỗi thời gian
   */
  static buildRevenueSheet(
    sheet: Worksheet,
    data: RevenueSeriesResponseDto,
    dateRangeText?: string,
  ): void {
    const columns = [
      { header: 'Mốc thời gian', key: 'date', width: 20 },
      { header: 'Doanh thu hoàn tất (Gross)', key: 'gross', width: 28, align: 'right' as const },
      { header: 'Số đơn hoàn tất', key: 'orders', width: 20, align: 'right' as const },
    ];

    applyStandardSheetLayout(sheet, {
      title: `Báo cáo doanh thu bán hàng (Chu kỳ: ${data.granularity})`,
      dateRangeText,
      columns,
    });

    if (!data.series || data.series.length === 0) {
      addEmptyStateRow(sheet, 5, columns.length);
      autoFitColumns(sheet);
      return;
    }

    const startRow = 5;
    data.series.forEach((item, idx) => {
      const row = sheet.getRow(startRow + idx);
      row.height = 20;
      textCell(row.getCell(1), item.date, 'center');
      moneyCell(row.getCell(2), item.grossRevenue);
      numberCell(row.getCell(3), item.completedOrders);

      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    // Dòng tổng cộng với công thức SUM
    const endRow = startRow + data.series.length - 1;
    const totalRow = sheet.getRow(endRow + 1);
    totalRow.height = 24;
    textCell(totalRow.getCell(1), 'TỔNG CỘNG', 'center');
    formulaCell(totalRow.getCell(2), `SUM(B${startRow}:B${endRow})`, '#,##0" ₫"', true);
    formulaCell(totalRow.getCell(3), `SUM(C${startRow}:C${endRow})`, '#,##0', true);

    for (let c = 1; c <= columns.length; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = EXCEL_STYLES.totalFill;
      cell.border = EXCEL_STYLES.doubleBottomBorder;
    }

    autoFitColumns(sheet);
  }

  /**
   * Sheet 3: Phân bổ và xu hướng đơn hàng
   */
  static buildOrdersSheet(
    sheet: Worksheet,
    data: OrdersReportResponseDto,
    dateRangeText?: string,
  ): void {
    const columns = [
      { header: 'Trạng thái đơn hàng', key: 'status', width: 26 },
      { header: 'Số lượng đơn', key: 'count', width: 18, align: 'right' as const },
      { header: 'Tỷ lệ phân bổ (%)', key: 'pct', width: 20, align: 'right' as const },
    ];

    applyStandardSheetLayout(sheet, {
      title: 'Báo cáo phân bổ trạng thái đơn hàng',
      dateRangeText,
      columns,
    });

    if (!data.currentDistribution || data.currentDistribution.length === 0) {
      addEmptyStateRow(sheet, 5, columns.length);
      autoFitColumns(sheet);
      return;
    }

    const startRow = 5;
    data.currentDistribution.forEach((item, idx) => {
      const row = sheet.getRow(startRow + idx);
      row.height = 20;
      textCell(row.getCell(1), item.status, 'left');
      numberCell(row.getCell(2), item.count);
      textCell(row.getCell(3), `${item.percentage.toFixed(1)}%`, 'right');

      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    const endRow = startRow + data.currentDistribution.length - 1;
    const totalRow = sheet.getRow(endRow + 1);
    totalRow.height = 24;
    textCell(totalRow.getCell(1), 'TỔNG CỘNG', 'center');
    formulaCell(totalRow.getCell(2), `SUM(B${startRow}:B${endRow})`, '#,##0', true);
    textCell(totalRow.getCell(3), '100.0%', 'right');

    for (let c = 1; c <= columns.length; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = EXCEL_STYLES.totalFill;
      cell.border = EXCEL_STYLES.doubleBottomBorder;
    }

    autoFitColumns(sheet);
  }

  /**
   * Sheet 4: Top sản phẩm bán chạy
   */
  static buildTopProductsSheet(
    sheet: Worksheet,
    data: TopProductsResponseDto,
    dateRangeText?: string,
  ): void {
    const columns = [
      { header: 'STT', key: 'idx', width: 10, align: 'center' as const },
      { header: 'Mã SKU', key: 'sku', width: 18, align: 'center' as const },
      { header: 'Tên sản phẩm', key: 'name', width: 36 },
      { header: 'Biến thể', key: 'variant', width: 20, align: 'center' as const },
      { header: 'Số lượng đã bán', key: 'sold', width: 20, align: 'right' as const },
      { header: 'Doanh thu mang lại', key: 'rev', width: 24, align: 'right' as const },
    ];

    applyStandardSheetLayout(sheet, {
      title: 'Báo cáo danh sách sản phẩm bán chạy',
      dateRangeText,
      columns,
    });

    if (!data.items || data.items.length === 0) {
      addEmptyStateRow(sheet, 5, columns.length);
      autoFitColumns(sheet);
      return;
    }

    const startRow = 5;
    data.items.forEach((item, idx) => {
      const row = sheet.getRow(startRow + idx);
      row.height = 20;
      numberCell(row.getCell(1), idx + 1);
      textCell(row.getCell(2), item.sku, 'center');
      textCell(row.getCell(3), item.productName, 'left');
      textCell(row.getCell(4), item.variantName, 'center');
      numberCell(row.getCell(5), item.unitsSold);
      moneyCell(row.getCell(6), item.productRevenue);

      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    const endRow = startRow + data.items.length - 1;
    const totalRow = sheet.getRow(endRow + 1);
    totalRow.height = 24;
    totalRow.getCell(1).value = '';
    textCell(totalRow.getCell(3), 'TỔNG CỘNG', 'center');
    formulaCell(totalRow.getCell(5), `SUM(E${startRow}:E${endRow})`, '#,##0', true);
    formulaCell(totalRow.getCell(6), `SUM(F${startRow}:F${endRow})`, '#,##0" ₫"', true);

    for (let c = 1; c <= columns.length; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = EXCEL_STYLES.totalFill;
      cell.border = EXCEL_STYLES.doubleBottomBorder;
    }

    autoFitColumns(sheet);
  }

  /**
   * Sheet 5: Cảnh báo tồn kho
   */
  static buildInventorySheet(
    sheet: Worksheet,
    data: InventoryAlertsResponseDto,
  ): void {
    const columns = [
      { header: 'Mã SKU', key: 'sku', width: 18, align: 'center' as const },
      { header: 'Tên sản phẩm', key: 'name', width: 36 },
      { header: 'Màu sắc', key: 'color', width: 14, align: 'center' as const },
      { header: 'Kích cỡ', key: 'size', width: 14, align: 'center' as const },
      { header: 'Tồn thực tế', key: 'onHand', width: 16, align: 'right' as const },
      { header: 'Tồn đang giữ', key: 'res', width: 16, align: 'right' as const },
      { header: 'Tồn khả dụng', key: 'avail', width: 16, align: 'right' as const },
      { header: 'Trạng thái', key: 'status', width: 18, align: 'center' as const },
    ];

    applyStandardSheetLayout(sheet, {
      title: 'Báo cáo cảnh báo tồn kho sản phẩm',
      columns,
    });

    if (!data.items || data.items.length === 0) {
      addEmptyStateRow(sheet, 5, columns.length, 'Tất cả sản phẩm đều ở mức tồn an toàn');
      autoFitColumns(sheet);
      return;
    }

    const startRow = 5;
    data.items.forEach((item, idx) => {
      const row = sheet.getRow(startRow + idx);
      row.height = 20;
      textCell(row.getCell(1), item.sku, 'center');
      textCell(row.getCell(2), item.productName, 'left');
      textCell(row.getCell(3), item.colorName, 'center');
      textCell(row.getCell(4), item.sizeName, 'center');
      numberCell(row.getCell(5), item.onHand);
      numberCell(row.getCell(6), item.reserved);
      numberCell(row.getCell(7), item.available);
      textCell(
        row.getCell(8),
        item.isOutOfStock
          ? 'HẾT HÀNG'
          : item.available <= (data.threshold ?? 5)
            ? 'SẮP HẾT'
            : 'AN TOÀN',
        'center',
      );

      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    autoFitColumns(sheet);
  }

  /**
   * Sheet 6: Hiệu quả sử dụng mã khuyến mãi (STRICTLY NO PII)
   */
  static buildCouponsSheet(
    sheet: Worksheet,
    data: CouponsReportResponseDto,
    dateRangeText?: string,
  ): void {
    const columns = [
      { header: 'Mã khuyến mãi', key: 'code', width: 22, align: 'center' as const },
      { header: 'Tên chương trình', key: 'name', width: 32 },
      { header: 'Số lượt sử dụng', key: 'usage', width: 18, align: 'right' as const },
      { header: 'Tổng tiền đã giảm', key: 'discount', width: 24, align: 'right' as const },
    ];

    applyStandardSheetLayout(sheet, {
      title: 'Báo cáo hiệu quả sử dụng mã khuyến mãi',
      dateRangeText,
      columns,
    });

    if (!data.topCoupons || data.topCoupons.length === 0) {
      addEmptyStateRow(sheet, 5, columns.length);
      autoFitColumns(sheet);
      return;
    }

    const startRow = 5;
    data.topCoupons.forEach((item, idx) => {
      const row = sheet.getRow(startRow + idx);
      row.height = 20;
      textCell(row.getCell(1), item.code, 'center');
      textCell(row.getCell(2), item.name, 'left');
      numberCell(row.getCell(3), item.usageCount);
      moneyCell(row.getCell(4), item.discountAmount);

      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    const endRow = startRow + data.topCoupons.length - 1;
    const totalRow = sheet.getRow(endRow + 1);
    totalRow.height = 24;
    textCell(totalRow.getCell(1), 'TỔNG CỘNG', 'center');
    formulaCell(totalRow.getCell(3), `SUM(C${startRow}:C${endRow})`, '#,##0', true);
    formulaCell(totalRow.getCell(4), `SUM(D${startRow}:D${endRow})`, '#,##0" ₫"', true);

    for (let c = 1; c <= columns.length; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = EXCEL_STYLES.totalFill;
      cell.border = EXCEL_STYLES.doubleBottomBorder;
    }

    autoFitColumns(sheet);
  }

  /**
   * Sheet 7: Thống kê đánh giá sản phẩm
   */
  static buildReviewsSheet(
    sheet: Worksheet,
    data: ReviewsReportResponseDto,
  ): void {
    const columns = [
      { header: 'Số sao đánh giá', key: 'stars', width: 22, align: 'center' as const },
      { header: 'Số lượng đánh giá', key: 'count', width: 22, align: 'right' as const },
      { header: 'Tỷ lệ phân bổ (%)', key: 'pct', width: 22, align: 'right' as const },
    ];

    applyStandardSheetLayout(sheet, {
      title: `Báo cáo đánh giá (Tổng: ${data.publishedReviewCount} đánh giá, ĐTB: ${data.averageRating.toFixed(1)} / 5 sao)`,
      columns,
    });

    const stars = [5, 4, 3, 2, 1];
    const totalReviews = data.publishedReviewCount || 0;

    const startRow = 5;
    stars.forEach((star, idx) => {
      const count = (data.ratingDistribution && data.ratingDistribution[star]) || 0;
      const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

      const row = sheet.getRow(startRow + idx);
      row.height = 20;
      textCell(row.getCell(1), `${star} Sao (⭐)`, 'center');
      numberCell(row.getCell(2), count);
      textCell(row.getCell(3), `${pct.toFixed(1)}%`, 'right');

      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    const endRow = startRow + stars.length - 1;
    const totalRow = sheet.getRow(endRow + 1);
    totalRow.height = 24;
    textCell(totalRow.getCell(1), 'TỔNG CỘNG', 'center');
    formulaCell(totalRow.getCell(2), `SUM(B${startRow}:B${endRow})`, '#,##0', true);
    textCell(totalRow.getCell(3), '100.0%', 'right');

    for (let c = 1; c <= columns.length; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = EXCEL_STYLES.totalFill;
      cell.border = EXCEL_STYLES.doubleBottomBorder;
    }

    autoFitColumns(sheet);
  }

  /**
   * Sheet 8: Phân bổ phương thức thanh toán
   */
  static buildPaymentsSheet(
    sheet: Worksheet,
    data: PaymentsReportResponseDto,
    dateRangeText?: string,
  ): void {
    const columns = [
      { header: 'Phương thức thanh toán', key: 'method', width: 28 },
      { header: 'Số đơn thanh toán', key: 'orders', width: 20, align: 'right' as const },
      { header: 'Tổng tiền thanh toán', key: 'amount', width: 26, align: 'right' as const },
      { header: 'Tỷ lệ doanh thu (%)', key: 'pct', width: 22, align: 'right' as const },
    ];

    applyStandardSheetLayout(sheet, {
      title: 'Báo cáo phân bổ phương thức thanh toán',
      dateRangeText,
      columns,
    });

    if (!data.methods || data.methods.length === 0) {
      addEmptyStateRow(sheet, 5, columns.length);
      autoFitColumns(sheet);
      return;
    }

    const totalAmountNum = Number(data.totalPaidAmount) || 0;

    const startRow = 5;
    data.methods.forEach((item, idx) => {
      const row = sheet.getRow(startRow + idx);
      row.height = 20;
      const methodName =
        item.method === 'COD'
          ? 'Thanh toán khi nhận hàng (COD)'
          : item.method === 'VNPAY'
            ? 'Cổng thanh toán VNPay'
            : item.method;
      textCell(row.getCell(1), methodName, 'left');
      numberCell(row.getCell(2), item.count);
      moneyCell(row.getCell(3), item.amount);
      const itemAmount = Number(item.amount) || 0;
      const pct = totalAmountNum > 0 ? (itemAmount / totalAmountNum) * 100 : 0;
      textCell(row.getCell(4), `${pct.toFixed(1)}%`, 'right');

      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    const endRow = startRow + data.methods.length - 1;
    const totalRow = sheet.getRow(endRow + 1);
    totalRow.height = 24;
    textCell(totalRow.getCell(1), 'TỔNG CỘNG', 'center');
    formulaCell(totalRow.getCell(2), `SUM(B${startRow}:B${endRow})`, '#,##0', true);
    formulaCell(totalRow.getCell(3), `SUM(C${startRow}:C${endRow})`, '#,##0" ₫"', true);
    textCell(totalRow.getCell(4), '100.0%', 'right');

    for (let c = 1; c <= columns.length; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = EXCEL_STYLES.totalFill;
      cell.border = EXCEL_STYLES.doubleBottomBorder;
    }

    autoFitColumns(sheet);
  }

  /**
   * Sheet 9: Báo cáo thuế GTGT (VAT 8% - Nghị định 72/2024/NĐ-CP)
   */
  static buildTaxSheet(
    sheet: Worksheet,
    data: TaxSummaryResponseDto,
    dateRangeText?: string,
  ): void {
    const columns = [
      { header: 'Chỉ tiêu tài chính & Thuế', key: 'metric', width: 42 },
      { header: 'Giá trị', key: 'val', width: 24, align: 'right' as const },
      { header: 'Đơn vị tính', key: 'unit', width: 18, align: 'center' as const },
      { header: 'Căn cứ pháp lý / Ghi chú', key: 'note', width: 36 },
    ];

    applyStandardSheetLayout(sheet, {
      title: 'Báo cáo thuế giá trị gia tăng (VAT 8%)',
      dateRangeText,
      columns,
    });

    const rowsData: Array<{
      metric: string;
      value: bigint | number | string;
      unit: string;
      note: string;
      isMoney?: boolean;
      isNumber?: boolean;
    }> = [
      {
        metric: 'Tổng doanh thu gộp (Gross Amount - Đã bao gồm thuế)',
        value: data.grossRevenue,
        unit: 'VNĐ',
        note: 'Giá bán niêm yết tax-inclusive',
        isMoney: true,
      },
      {
        metric: 'Doanh thu thuần chưa thuế (Net Amount)',
        value: data.netRevenue,
        unit: 'VNĐ',
        note: 'Doanh thu tính thuế GTGT',
        isMoney: true,
      },
      {
        metric: 'Tiền thuế GTGT đầu ra (VAT 8%)',
        value: data.vatAmount,
        unit: 'VNĐ',
        note: 'Nghị định 72/2024/NĐ-CP',
        isMoney: true,
      },
      {
        metric: 'Thuế suất thực tế áp dụng',
        value: '8.0%',
        unit: '%',
        note: '800 điểm cơ bản (8%)',
      },
      {
        metric: 'Số lượng đơn hàng hoàn tất',
        value: data.completedOrders,
        unit: 'Đơn hàng',
        note: 'Chỉ tính đơn DELIVERED/COMPLETED',
        isNumber: true,
      },
    ];

    rowsData.forEach((item, idx) => {
      const row = sheet.getRow(5 + idx);
      row.height = 22;
      textCell(row.getCell(1), item.metric, 'left');
      if (item.isMoney) {
        moneyCell(row.getCell(2), item.value);
      } else if (item.isNumber) {
        numberCell(row.getCell(2), Number(item.value));
      } else {
        textCell(row.getCell(2), String(item.value), 'right');
      }
      textCell(row.getCell(3), item.unit, 'center');
      textCell(row.getCell(4), item.note, 'left');

      for (let c = 1; c <= 4; c++) {
        row.getCell(c).border = EXCEL_STYLES.thinBorder;
      }
    });

    autoFitColumns(sheet);
  }
}
