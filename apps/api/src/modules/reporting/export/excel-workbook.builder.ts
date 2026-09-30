import {
  type Cell,
  type Fill,
  type Font,
  type Style,
  Workbook,
  type Worksheet,
} from 'exceljs';

export interface SheetColumnDef {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export const EXCEL_STYLES = {
  headerFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E2F3' },
  } as Fill,
  headerFont: {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FF000000' },
  } as Font,
  titleFont: {
    name: 'Arial',
    size: 14,
    bold: true,
    color: { argb: 'FF1F497D' },
  } as Font,
  subtitleFont: {
    name: 'Arial',
    size: 10,
    italic: true,
    color: { argb: 'FF595959' },
  } as Font,
  totalFont: {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FF000000' },
  } as Font,
  totalFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' },
  } as Fill,
  cellFont: {
    name: 'Arial',
    size: 10,
  } as Font,
  thinBorder: {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  } as Style['border'],
  doubleBottomBorder: {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'double', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  } as Style['border'],
};

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export function createWorkbook(title?: string): Workbook {
  const workbook = new Workbook();
  workbook.creator = 'Jaykiby Kids Fashion Ecommerce';
  workbook.created = new Date();
  if (title) {
    workbook.title = title;
  }
  return workbook;
}

export function moneyCell(
  cell: Cell,
  value: bigint | number | string | null | undefined,
): void {
  if (value === null || value === undefined) {
    cell.value = 0;
    cell.numFmt = '#,##0" ₫"';
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    return;
  }

  if (typeof value === 'bigint') {
    if (value > MAX_SAFE_BIGINT || value < -MAX_SAFE_BIGINT) {
      cell.value = value.toString();
    } else {
      cell.value = Number(value);
      cell.numFmt = '#,##0" ₫"';
    }
  } else if (typeof value === 'number') {
    cell.value = value;
    cell.numFmt = '#,##0" ₫"';
  } else {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      cell.value = parsed;
      cell.numFmt = '#,##0" ₫"';
    } else {
      cell.value = value;
    }
  }
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.font = EXCEL_STYLES.cellFont;
}

export function numberCell(
  cell: Cell,
  value: number | bigint | null | undefined,
  numFmt = '#,##0',
): void {
  if (value === null || value === undefined) {
    cell.value = 0;
  } else if (typeof value === 'bigint') {
    cell.value = Number(value);
  } else {
    cell.value = value;
  }
  cell.numFmt = numFmt;
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.font = EXCEL_STYLES.cellFont;
}

export function dateCell(
  cell: Cell,
  value: Date | string | null | undefined,
  numFmt = 'dd/mm/yyyy',
): void {
  if (!value) {
    cell.value = '-';
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = EXCEL_STYLES.cellFont;
    return;
  }

  const dateObj = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateObj.getTime())) {
    cell.value = String(value);
  } else {
    cell.value = dateObj;
    cell.numFmt = numFmt;
  }
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.font = EXCEL_STYLES.cellFont;
}

export function textCell(
  cell: Cell,
  value: string | null | undefined,
  align: 'left' | 'center' | 'right' = 'left',
): void {
  cell.value = value ?? '-';
  cell.alignment = { horizontal: align, vertical: 'middle' };
  cell.font = EXCEL_STYLES.cellFont;
}

export function formulaCell(
  cell: Cell,
  formula: string,
  numFmt?: string,
  isTotal = false,
): void {
  cell.value = { formula };
  if (numFmt) {
    cell.numFmt = numFmt;
  }
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.font = isTotal ? EXCEL_STYLES.totalFont : EXCEL_STYLES.cellFont;
}

export function formatHeaderRow(
  worksheet: Worksheet,
  rowNumber: number,
  columnsCount: number,
): void {
  const row = worksheet.getRow(rowNumber);
  row.height = 26;
  for (let c = 1; c <= columnsCount; c++) {
    const cell = row.getCell(c);
    cell.fill = EXCEL_STYLES.headerFill;
    cell.font = EXCEL_STYLES.headerFont;
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = EXCEL_STYLES.thinBorder;
  }
}

export function applyStandardSheetLayout(
  worksheet: Worksheet,
  options: {
    title: string;
    dateRangeText?: string;
    columns: SheetColumnDef[];
    headerRowIndex?: number;
  },
): number {
  const headerRowIndex = options.headerRowIndex ?? 4;
  const colCount = options.columns.length;

  // Row 1: Title
  const titleRow = worksheet.getRow(1);
  titleRow.height = 24;
  const titleCell = titleRow.getCell(1);
  titleCell.value = options.title.toUpperCase();
  titleCell.font = EXCEL_STYLES.titleFont;

  // Row 2: Subtitle / Date range / Export timestamp (UTC+7)
  const subRow = worksheet.getRow(2);
  subRow.height = 18;
  const subCell = subRow.getCell(1);
  const nowUtc7 = new Date(Date.now() + 7 * 3600 * 1000);
  const formattedTime = nowUtc7.toISOString().replace('T', ' ').slice(0, 19);
  const rangePart = options.dateRangeText
    ? `Khoảng thời gian: ${options.dateRangeText} | `
    : '';
  subCell.value = `${rangePart}Thời điểm xuất: ${formattedTime} (UTC+7)`;
  subCell.font = EXCEL_STYLES.subtitleFont;

  // Row 3: Blank spacing row
  worksheet.getRow(3).height = 10;

  // Row 4 (headerRowIndex): Headers
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 26;
  options.columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.fill = EXCEL_STYLES.headerFill;
    cell.font = EXCEL_STYLES.headerFont;
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = EXCEL_STYLES.thinBorder;
  });

  // Freeze panes below header row
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: headerRowIndex, activeCell: 'A5' },
  ];

  // Auto filter on header row
  worksheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: colCount },
  };

  return headerRowIndex;
}

export function autoFitColumns(
  worksheet: Worksheet,
  minWidth = 14,
  maxWidth = 50,
): void {
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
      // Ignore main report title in row 1 & 2 when calculating column width
      if (rowNumber <= 2) return;
      const cellVal = cell.value;
      if (!cellVal) return;

      let len = 0;
      if (typeof cellVal === 'object' && 'formula' in cellVal) {
        len = 12;
      } else if (cell.numFmt?.includes('₫')) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- ước lượng bề rộng cột
        len = String(cellVal).length + 6;
      } else if (cellVal instanceof Date) {
        len = 12;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- ước lượng bề rộng cột
        len = String(cellVal).length;
      }
      if (len > maxLen) {
        maxLen = len;
      }
    });
    column.width = Math.min(Math.max(maxLen + 3, minWidth), maxWidth);
  });
}

export function addEmptyStateRow(
  worksheet: Worksheet,
  rowNumber: number,
  columnsCount: number,
  message = 'Không có dữ liệu trong khoảng thời gian đã chọn',
): void {
  const row = worksheet.getRow(rowNumber);
  row.height = 24;
  const cell = row.getCell(1);
  cell.value = message;
  cell.font = EXCEL_STYLES.subtitleFont;
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(rowNumber, 1, rowNumber, columnsCount);
  for (let c = 1; c <= columnsCount; c++) {
    row.getCell(c).border = EXCEL_STYLES.thinBorder;
  }
}
