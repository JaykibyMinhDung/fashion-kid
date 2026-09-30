import { Workbook } from 'exceljs';
import {
  applyStandardSheetLayout,
  autoFitColumns,
  createWorkbook,
  dateCell,
  formulaCell,
  moneyCell,
  numberCell,
  textCell,
} from './excel-workbook.builder';

describe('ExcelWorkbookBuilder', () => {
  let workbook: Workbook;

  beforeEach(() => {
    workbook = createWorkbook('Báo cáo Test');
  });

  it('should create workbook with metadata', () => {
    expect(workbook.creator).toBe('Jaykiby Kids Fashion Ecommerce');
    expect(workbook.title).toBe('Báo cáo Test');
  });

  describe('moneyCell', () => {
    it('should format safe bigint as number with currency numFmt', () => {
      const sheet = workbook.addWorksheet('Test');
      const cell = sheet.getCell('A1');
      moneyCell(cell, 1500000n);

      expect(typeof cell.value).toBe('number');
      expect(cell.value).toBe(1500000);
      expect(cell.numFmt).toBe('#,##0" ₫"');
      expect(cell.alignment?.horizontal).toBe('right');
    });

    it('should handle zero, null, and undefined as 0', () => {
      const sheet = workbook.addWorksheet('Test');
      const c1 = sheet.getCell('A1');
      const c2 = sheet.getCell('A2');
      const c3 = sheet.getCell('A3');

      moneyCell(c1, 0n);
      moneyCell(c2, null);
      moneyCell(c3, undefined);

      expect(c1.value).toBe(0);
      expect(c2.value).toBe(0);
      expect(c3.value).toBe(0);
      expect(c1.numFmt).toBe('#,##0" ₫"');
      expect(c2.numFmt).toBe('#,##0" ₫"');
    });

    it('should fallback to string for bigint exceeding MAX_SAFE_INTEGER', () => {
      const sheet = workbook.addWorksheet('Test');
      const cell = sheet.getCell('A1');
      const hugeVal = BigInt(Number.MAX_SAFE_INTEGER) + 1000n;
      moneyCell(cell, hugeVal);

      expect(typeof cell.value).toBe('string');
      expect(cell.value).toBe(hugeVal.toString());
    });

    it('should format number input', () => {
      const sheet = workbook.addWorksheet('Test');
      const cell = sheet.getCell('A1');
      moneyCell(cell, 250000);

      expect(cell.value).toBe(250000);
      expect(cell.numFmt).toBe('#,##0" ₫"');
    });
  });

  describe('numberCell', () => {
    it('should format integers with comma separator', () => {
      const sheet = workbook.addWorksheet('Test');
      const cell = sheet.getCell('A1');
      numberCell(cell, 12500);

      expect(cell.value).toBe(12500);
      expect(cell.numFmt).toBe('#,##0');
      expect(cell.alignment?.horizontal).toBe('right');
    });
  });

  describe('dateCell', () => {
    it('should format Date object with dd/mm/yyyy', () => {
      const sheet = workbook.addWorksheet('Test');
      const cell = sheet.getCell('A1');
      const d = new Date('2026-09-16T00:00:00.000Z');
      dateCell(cell, d);

      expect(cell.value).toEqual(d);
      expect(cell.numFmt).toBe('dd/mm/yyyy');
      expect(cell.alignment?.horizontal).toBe('center');
    });

    it('should handle null / empty date with dash', () => {
      const sheet = workbook.addWorksheet('Test');
      const cell = sheet.getCell('A1');
      dateCell(cell, null);

      expect(cell.value).toBe('-');
    });
  });

  describe('formulaCell', () => {
    it('should set formula object and numFmt', () => {
      const sheet = workbook.addWorksheet('Test');
      const cell = sheet.getCell('C10');
      formulaCell(cell, 'SUM(C5:C9)', '#,##0" ₫"', true);

      expect(cell.value).toEqual({ formula: 'SUM(C5:C9)' });
      expect(cell.numFmt).toBe('#,##0" ₫"');
      expect(cell.font?.bold).toBe(true);
    });
  });

  describe('sheet layout & auto width', () => {
    it('should apply layout with headers, views and auto-filter', () => {
      const sheet = workbook.addWorksheet('LayoutTest');
      const headerIndex = applyStandardSheetLayout(sheet, {
        title: 'Báo cáo doanh thu',
        dateRangeText: '01/09/2026 - 16/09/2026',
        columns: [
          { header: 'Ngày', key: 'date' },
          { header: 'Doanh thu', key: 'revenue' },
        ],
      });

      expect(headerIndex).toBe(4);
      expect(sheet.getCell('A1').value).toBe('BÁO CÁO DOANH THU');
      expect(sheet.getCell('A4').value).toBe('Ngày');
      expect(sheet.getCell('B4').value).toBe('Doanh thu');
      expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 4 });
      expect(sheet.autoFilter).toBeDefined();
    });

    it('should adjust column width based on content', () => {
      const sheet = workbook.addWorksheet('WidthTest');
      applyStandardSheetLayout(sheet, {
        title: 'Báo cáo',
        columns: [
          { header: 'Tên sản phẩm rất dài cho trẻ em', key: 'name' },
          { header: 'Giá', key: 'price' },
        ],
      });
      textCell(
        sheet.getCell('A5'),
        'Bộ quần áo cộc tay mùa hè bé trai in hình khủng long siêu đáng yêu',
      );
      moneyCell(sheet.getCell('B5'), 185000);

      autoFitColumns(sheet);
      expect(sheet.getColumn(1).width).toBeGreaterThanOrEqual(20);
      expect(sheet.getColumn(2).width).toBeGreaterThanOrEqual(14);
    });
  });
});
