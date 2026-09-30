import { Injectable } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';

type CounterRow = { last_value: number };

@Injectable()
export class InvoiceNumberService {
  /**
   * Cấp số hoá đơn tuần tự tăng dần theo tháng: INV-YYYYMM-NNNNNN.
   * Chạy trực tiếp trong PrismaTransactionClient để đảm bảo tính nguyên tử (atomic)
   * và không trùng lặp số khi nhiều giao dịch diễn ra đồng thời.
   *
   * @param transaction Prisma transaction client hiện tại
   * @param date Thời điểm phát hành hoá đơn
   */
  async generateInvoiceNumber(
    transaction: PrismaTransactionClient,
    date: Date = new Date(),
  ): Promise<string> {
    const BUSINESS_TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Ho_Chi_Minh UTC+7
    const local = new Date(date.getTime() + BUSINESS_TZ_OFFSET_MS);
    const year = local.getUTCFullYear();
    const month = String(local.getUTCMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}${month}`;

    const rows = await transaction.$queryRaw<CounterRow[]>`
      INSERT INTO "invoice_counters" ("year_month", "last_value")
      VALUES (${yearMonth}, 1)
      ON CONFLICT ("year_month") DO UPDATE
      SET "last_value" = "invoice_counters"."last_value" + 1
      RETURNING "last_value"
    `;

    const lastValue = rows[0]?.last_value ?? 1;
    const sequence = String(lastValue).padStart(6, '0');
    return `INV-${yearMonth}-${sequence}`;
  }
}
