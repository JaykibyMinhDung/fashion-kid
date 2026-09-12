import { Injectable } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';

type CounterRow = { last_value: number };

@Injectable()
export class OrderCounterService {
  async generateOrderNumber(
    transaction: PrismaTransactionClient,
    date: Date = new Date(),
  ): Promise<string> {
    // BE-4: bucket theo ngày nghiệp vụ UTC+7 (Asia/Ho_Chi_Minh), không dùng UTC thô.
    const BUSINESS_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
    const local = new Date(date.getTime() + BUSINESS_TZ_OFFSET_MS);
    const year = local.getUTCFullYear();
    const month = String(local.getUTCMonth() + 1).padStart(2, '0');
    const day = String(local.getUTCDate()).padStart(2, '0');
    const orderDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    const datePrefix = `${year}${month}${day}`;

    const rows = await transaction.$queryRaw<CounterRow[]>`
      INSERT INTO "order_counters" ("order_date", "last_value")
      VALUES (${orderDate}, 1)
      ON CONFLICT ("order_date") DO UPDATE
      SET "last_value" = "order_counters"."last_value" + 1
      RETURNING "last_value"
    `;

    const lastValue = rows[0]?.last_value ?? 1;
    const sequence = String(lastValue).padStart(6, '0');
    return `ORD-${datePrefix}-${sequence}`;
  }
}
