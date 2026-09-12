import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import {
  EntityStatus,
  InventoryTxType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  InventoryHistoryResponseDto,
  InventoryItemResponseDto,
  InventoryListResponseDto,
  InventoryMutationResponseDto,
  InventoryTransactionResponseDto,
  InventoryVariantResponseDto,
  InventoryWarehouseResponseDto,
} from '../dto/inventory.dto';
import {
  InventoryConflictError,
  InventoryRepository,
  InventoryStockMutation,
  InventoryVariantNotFoundError,
  InventoryWarehouseNotFoundError,
  InsufficientInventoryError,
  InventoryAdjustmentCommand,
  InventoryHistoryQuery,
  InventoryImportCommand,
  InventoryListQuery,
  InventoryReservation,
  ReserveInventoryCommand,
  ReserveInventoryLine,
  StockMutationCommand,
} from './inventory.repository';

const WAREHOUSE_SELECT = {
  id: true,
  code: true,
  name: true,
  address: true,
  status: true,
} satisfies Prisma.WarehouseSelect;

const ACTOR_SELECT = {
  id: true,
  fullName: true,
  email: true,
} satisfies Prisma.UserSelect;

function variantInclude(warehouseId: string) {
  return {
    product: { select: { id: true, name: true, slug: true } },
    size: { select: { id: true, code: true, name: true } },
    color: { select: { id: true, code: true, name: true, hexCode: true } },
    inventories: {
      where: { warehouseId },
      select: { id: true, onHand: true, reserved: true, updatedAt: true },
    },
  } satisfies Prisma.ProductVariantInclude;
}

const TRANSACTION_INCLUDE = {
  actor: { select: ACTOR_SELECT },
} satisfies Prisma.InventoryTransactionInclude;

type InventoryVariantRow = {
  id: string;
  sku: string;
  updatedAt: Date;
  product: { id: string; name: string; slug: string };
  size: { id: string; code: string; name: string };
  color: { id: string; code: string; name: string; hexCode: string | null };
  inventories: Array<{
    id: string;
    onHand: number;
    reserved: number;
    updatedAt: Date;
  }>;
};

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  status: EntityStatus;
};

type TransactionRow = {
  id: string;
  inventoryId: string;
  variantId: string;
  warehouseId: string;
  type: InventoryTxType;
  quantity: number;
  onHandBefore: number;
  onHandAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  actorId: string | null;
  note: string | null;
  createdAt: Date;
  actor: { id: string; fullName: string; email: string } | null;
};

type UpdatedInventoryRow = {
  id: string;
  onHand: number;
  reservedBefore: number;
  reservedAfter: number;
};

type UpdatedStockRow = {
  id: string;
  onHandBefore: number;
  onHandAfter: number;
  reservedBefore: number;
  reservedAfter: number;
};

function warehouseResponse(row: WarehouseRow): InventoryWarehouseResponseDto {
  return row;
}

function variantResponse(
  row: InventoryVariantRow,
): InventoryVariantResponseDto {
  return {
    id: row.id,
    sku: row.sku,
    product: row.product,
    size: row.size,
    color: row.color,
  };
}

function itemResponse(
  row: InventoryVariantRow,
  warehouse: WarehouseRow,
): InventoryItemResponseDto {
  const inventory = row.inventories[0];
  const onHand = inventory?.onHand ?? 0;
  const reserved = inventory?.reserved ?? 0;
  return {
    inventoryId: inventory?.id ?? null,
    variantId: row.id,
    warehouse: warehouseResponse(warehouse),
    variant: variantResponse(row),
    onHand,
    reserved,
    available: onHand - reserved,
    updatedAt: (inventory?.updatedAt ?? row.updatedAt).toISOString(),
  };
}

function transactionResponse(
  row: TransactionRow,
): InventoryTransactionResponseDto {
  return {
    id: row.id,
    inventoryId: row.inventoryId,
    variantId: row.variantId,
    warehouseId: row.warehouseId,
    type: row.type,
    quantity: row.quantity,
    onHandBefore: row.onHandBefore,
    onHandAfter: row.onHandAfter,
    reservedBefore: row.reservedBefore,
    reservedAfter: row.reservedAfter,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    actor: row.actor,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

type InventorySortKey = {
  id: string;
  sku: string;
  updatedAt: Date;
  inventories: Array<{ onHand: number; reserved: number; updatedAt: Date }>;
};

function available(row: InventorySortKey): number {
  const inventory = row.inventories[0];
  return (inventory?.onHand ?? 0) - (inventory?.reserved ?? 0);
}

function compareRows<T extends InventorySortKey>(
  left: T,
  right: T,
  sort: InventoryListQuery['sort'],
): number {
  if (sort === 'sku:asc') {
    return left.sku.localeCompare(right.sku) || left.id.localeCompare(right.id);
  }
  if (sort === 'available:asc') {
    return (
      available(left) - available(right) ||
      left.sku.localeCompare(right.sku) ||
      left.id.localeCompare(right.id)
    );
  }
  const leftDate = left.inventories[0]?.updatedAt ?? left.updatedAt;
  const rightDate = right.inventories[0]?.updatedAt ?? right.updatedAt;
  const dateResult = rightDate.getTime() - leftDate.getTime();
  return (
    (sort === 'updatedAt:asc' ? -dateResult : dateResult) ||
    left.sku.localeCompare(right.sku) ||
    left.id.localeCompare(right.id)
  );
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class PrismaInventoryRepository extends InventoryRepository {
  constructor(private readonly prisma?: PrismaService) {
    super();
  }

  private get db(): PrismaService {
    if (!this.prisma) {
      throw new Error('PrismaService is required for inventory queries');
    }
    return this.prisma;
  }

  async findWarehouseByCode(
    code: string,
  ): Promise<InventoryWarehouseResponseDto | null> {
    const row = await this.db.warehouse.findUnique({
      where: { code },
      select: WAREHOUSE_SELECT,
    });
    return row ? warehouseResponse(row) : null;
  }

  async list(query: InventoryListQuery): Promise<InventoryListResponseDto> {
    const where: Prisma.ProductVariantWhereInput = query.q
      ? {
          OR: [
            { sku: { contains: query.q, mode: 'insensitive' } },
            { product: { name: { contains: query.q, mode: 'insensitive' } } },
            { product: { slug: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {};
    const warehouse = await this.requireWarehouse(query.warehouseId);
    const skip = (query.page - 1) * query.limit;

    // BE-1: phân trang id-first. Nạp khóa sắp xếp nhẹ (sku/updatedAt/onHand/reserved)
    // cho toàn bộ tập lọc, rồi nạp graph biến thể đầy đủ CHỈ cho trang hiện tại.
    const [total, keyRows] = await Promise.all([
      this.db.productVariant.count({ where }),
      this.db.productVariant.findMany({
        where,
        select: {
          id: true,
          sku: true,
          updatedAt: true,
          inventories: {
            where: { warehouseId: query.warehouseId },
            select: { onHand: true, reserved: true, updatedAt: true },
          },
        },
      }),
    ]);

    const orderedIds = [...keyRows]
      .sort((left, right) => compareRows(left, right, query.sort))
      .slice(skip, skip + query.limit)
      .map((row) => row.id);

    const pageRows =
      orderedIds.length === 0
        ? []
        : ((await this.db.productVariant.findMany({
            where: { id: { in: orderedIds } },
            include: variantInclude(query.warehouseId),
          })) as InventoryVariantRow[]);
    const byId = new Map(pageRows.map((row) => [row.id, row]));
    const items = orderedIds
      .map((id) => byId.get(id))
      .filter((row): row is InventoryVariantRow => row !== undefined)
      .map((row) => itemResponse(row, warehouse));

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async findByVariant(
    variantId: string,
    warehouseId: string,
  ): Promise<InventoryItemResponseDto | null> {
    const [warehouse, row] = await Promise.all([
      this.requireWarehouse(warehouseId),
      this.db.productVariant.findUnique({
        where: { id: variantId },
        include: variantInclude(warehouseId),
      }),
    ]);
    return row ? itemResponse(row, warehouse) : null;
  }

  async listHistory(
    query: InventoryHistoryQuery,
  ): Promise<InventoryHistoryResponseDto> {
    await this.requireWarehouse(query.warehouseId);
    const where: Prisma.InventoryTransactionWhereInput = {
      warehouseId: query.warehouseId,
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [total, rows] = await this.db.$transaction([
      this.db.inventoryTransaction.count({ where }),
      this.db.inventoryTransaction.findMany({
        where,
        include: TRANSACTION_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      items: (rows as TransactionRow[]).map(transactionResponse),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async importOne(
    transaction: PrismaTransactionClient,
    command: InventoryImportCommand,
  ): Promise<InventoryMutationResponseDto> {
    await this.lockWarehouse(transaction, command.warehouseId);
    await this.lockVariant(transaction, command.variantId);
    const inventory = await this.ensureInventory(
      transaction,
      command.warehouseId,
      command.variantId,
    );
    const updated = await transaction.inventory.update({
      where: { id: inventory.id },
      data: { onHand: { increment: command.quantity } },
      select: { onHand: true, reserved: true },
    });
    const ledger = await transaction.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        warehouseId: command.warehouseId,
        variantId: command.variantId,
        actorId: command.actorId,
        type: InventoryTxType.IMPORT,
        quantity: command.quantity,
        onHandBefore: inventory.onHand,
        onHandAfter: updated.onHand,
        reservedBefore: inventory.reserved,
        reservedAfter: updated.reserved,
        referenceType: 'ADMIN_IMPORT',
        referenceId: command.referenceId,
        note: command.note,
      },
      include: TRANSACTION_INCLUDE,
    });
    return this.mutationResponse(
      transaction,
      command.variantId,
      command.warehouseId,
      ledger,
    );
  }

  async adjustOne(
    transaction: PrismaTransactionClient,
    command: InventoryAdjustmentCommand,
  ): Promise<InventoryMutationResponseDto> {
    await this.lockWarehouse(transaction, command.warehouseId);
    await this.lockVariant(transaction, command.variantId);
    let inventory = await transaction.inventory.findUnique({
      where: {
        warehouseId_variantId: {
          warehouseId: command.warehouseId,
          variantId: command.variantId,
        },
      },
    });
    if (!inventory) {
      if (command.targetOnHand === 0) {
        throw new InventoryConflictError('NOOP');
      }
      inventory = await transaction.inventory.create({
        data: {
          warehouseId: command.warehouseId,
          variantId: command.variantId,
          onHand: 0,
          reserved: 0,
        },
      });
    }
    if (command.targetOnHand === inventory.onHand) {
      throw new InventoryConflictError('NOOP');
    }
    if (command.targetOnHand < inventory.reserved) {
      throw new InventoryConflictError('TARGET_BELOW_RESERVED');
    }
    const delta = command.targetOnHand - inventory.onHand;
    const updated = await transaction.inventory.update({
      where: { id: inventory.id },
      data: { onHand: command.targetOnHand },
      select: { onHand: true, reserved: true },
    });
    const ledger = await transaction.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        warehouseId: command.warehouseId,
        variantId: command.variantId,
        actorId: command.actorId,
        type: InventoryTxType.ADJUSTMENT,
        quantity: delta,
        onHandBefore: inventory.onHand,
        onHandAfter: updated.onHand,
        reservedBefore: inventory.reserved,
        reservedAfter: updated.reserved,
        referenceType: 'ADMIN_ADJUSTMENT',
        referenceId: command.referenceId,
        note: [command.reason, command.note].filter(Boolean).join(' · '),
      },
      include: TRANSACTION_INCLUDE,
    });
    return this.mutationResponse(
      transaction,
      command.variantId,
      command.warehouseId,
      ledger,
    );
  }

  async reserveMany(
    transaction: PrismaTransactionClient,
    command: ReserveInventoryCommand,
  ): Promise<InventoryReservation[]> {
    const lines = this.validateAndSortLines(command.lines);
    const reservations: InventoryReservation[] = [];

    for (const line of lines) {
      const reservation = await this.reserveOne(transaction, line, command);
      if (!reservation) {
        throw new InsufficientInventoryError(
          line.warehouseId,
          line.variantId,
          'RESERVE',
        );
      }
      reservations.push(reservation);
    }

    return reservations;
  }

  async releaseMany(
    transaction: PrismaTransactionClient,
    command: StockMutationCommand,
  ): Promise<InventoryStockMutation[]> {
    return this.mutateReservedMany(
      transaction,
      command,
      InventoryTxType.RELEASE,
      'RELEASE',
    );
  }

  async saleMany(
    transaction: PrismaTransactionClient,
    command: StockMutationCommand,
  ): Promise<InventoryStockMutation[]> {
    return this.mutateReservedMany(
      transaction,
      command,
      InventoryTxType.SALE,
      'SALE',
    );
  }

  private async mutateReservedMany(
    transaction: PrismaTransactionClient,
    command: StockMutationCommand,
    type: InventoryTxType,
    operation: 'RELEASE' | 'SALE',
  ): Promise<InventoryStockMutation[]> {
    const lines = this.validateAndSortLines(command.lines);
    const mutations: InventoryStockMutation[] = [];
    for (const line of lines) {
      const mutation = await this.mutateReservedOne(
        transaction,
        line,
        command,
        type,
        operation,
      );
      if (!mutation) {
        throw new InsufficientInventoryError(
          line.warehouseId,
          line.variantId,
          operation,
        );
      }
      mutations.push(mutation);
    }
    return mutations;
  }

  private async reserveOne(
    transaction: PrismaTransactionClient,
    line: ReserveInventoryLine,
    command: ReserveInventoryCommand,
  ): Promise<InventoryReservation | null> {
    const rows = await transaction.$queryRaw<UpdatedInventoryRow[]>`
      UPDATE "inventories"
      SET
        "reserved" = "reserved" + ${line.quantity},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE
        "warehouse_id" = ${line.warehouseId}::uuid
        AND "variant_id" = ${line.variantId}::uuid
        AND "on_hand" - "reserved" >= ${line.quantity}
      RETURNING
        "id",
        "on_hand" AS "onHand",
        "reserved" - ${line.quantity} AS "reservedBefore",
        "reserved" AS "reservedAfter"
    `;

    const inventory = rows[0];
    if (!inventory) return null;

    const ledger = await transaction.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        warehouseId: line.warehouseId,
        variantId: line.variantId,
        actorId: command.actorId,
        type: InventoryTxType.RESERVE,
        quantity: line.quantity,
        onHandBefore: inventory.onHand,
        onHandAfter: inventory.onHand,
        reservedBefore: inventory.reservedBefore,
        reservedAfter: inventory.reservedAfter,
        referenceType: command.referenceType,
        referenceId: command.referenceId,
        note: command.note,
      },
    });

    return {
      inventoryId: inventory.id,
      ledgerId: ledger.id,
      warehouseId: line.warehouseId,
      variantId: line.variantId,
      onHand: inventory.onHand,
      reservedBefore: inventory.reservedBefore,
      reservedAfter: inventory.reservedAfter,
    };
  }

  private async mutateReservedOne(
    transaction: PrismaTransactionClient,
    line: ReserveInventoryLine,
    command: StockMutationCommand,
    type: InventoryTxType,
    operation: 'RELEASE' | 'SALE',
  ): Promise<InventoryStockMutation | null> {
    const sale = operation === 'SALE';
    const rows = sale
      ? await transaction.$queryRaw<UpdatedStockRow[]>`
          UPDATE "inventories"
          SET
            "on_hand" = "on_hand" - ${line.quantity},
            "reserved" = "reserved" - ${line.quantity},
            "updated_at" = CURRENT_TIMESTAMP
          WHERE
            "warehouse_id" = ${line.warehouseId}::uuid
            AND "variant_id" = ${line.variantId}::uuid
            AND "reserved" >= ${line.quantity}
            AND "on_hand" >= ${line.quantity}
          RETURNING
            "id",
            "on_hand" + ${line.quantity} AS "onHandBefore",
            "on_hand" AS "onHandAfter",
            "reserved" + ${line.quantity} AS "reservedBefore",
            "reserved" AS "reservedAfter"
        `
      : await transaction.$queryRaw<UpdatedStockRow[]>`
          UPDATE "inventories"
          SET
            "reserved" = "reserved" - ${line.quantity},
            "updated_at" = CURRENT_TIMESTAMP
          WHERE
            "warehouse_id" = ${line.warehouseId}::uuid
            AND "variant_id" = ${line.variantId}::uuid
            AND "reserved" >= ${line.quantity}
          RETURNING
            "id",
            "on_hand" AS "onHandBefore",
            "on_hand" AS "onHandAfter",
            "reserved" + ${line.quantity} AS "reservedBefore",
            "reserved" AS "reservedAfter"
        `;

    const inventory = rows[0];
    if (!inventory) return null;
    const ledger = await transaction.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        warehouseId: line.warehouseId,
        variantId: line.variantId,
        actorId: command.actorId,
        type,
        quantity: line.quantity,
        onHandBefore: inventory.onHandBefore,
        onHandAfter: inventory.onHandAfter,
        reservedBefore: inventory.reservedBefore,
        reservedAfter: inventory.reservedAfter,
        referenceType: command.referenceType,
        referenceId: command.referenceId,
        note: command.note,
      },
    });
    return {
      inventoryId: inventory.id,
      ledgerId: ledger.id,
      warehouseId: line.warehouseId,
      variantId: line.variantId,
      onHand: inventory.onHandAfter,
      onHandBefore: inventory.onHandBefore,
      onHandAfter: inventory.onHandAfter,
      reservedBefore: inventory.reservedBefore,
      reservedAfter: inventory.reservedAfter,
    };
  }

  private async mutationResponse(
    transaction: PrismaTransactionClient,
    variantId: string,
    warehouseId: string,
    ledger: TransactionRow,
  ): Promise<InventoryMutationResponseDto> {
    const row = await transaction.productVariant.findUnique({
      where: { id: variantId },
      include: variantInclude(warehouseId),
    });
    if (!row) throw new InventoryVariantNotFoundError(variantId);
    const warehouse = await transaction.warehouse.findUnique({
      where: { id: warehouseId },
      select: WAREHOUSE_SELECT,
    });
    if (!warehouse) throw new InventoryWarehouseNotFoundError(warehouseId);
    return {
      inventory: itemResponse(row, warehouse),
      transaction: transactionResponse(ledger),
    };
  }

  private async ensureInventory(
    transaction: PrismaTransactionClient,
    warehouseId: string,
    variantId: string,
  ) {
    const existing = await transaction.inventory.findUnique({
      where: { warehouseId_variantId: { warehouseId, variantId } },
    });
    if (existing) return existing;
    try {
      return await transaction.inventory.create({
        data: { warehouseId, variantId, onHand: 0, reserved: 0 },
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const raced = await transaction.inventory.findUnique({
        where: { warehouseId_variantId: { warehouseId, variantId } },
      });
      if (!raced) throw error;
      return raced;
    }
  }

  private async requireWarehouse(warehouseId: string): Promise<WarehouseRow> {
    const row = await this.db.warehouse.findUnique({
      where: { id: warehouseId },
      select: WAREHOUSE_SELECT,
    });
    if (!row) throw new InventoryWarehouseNotFoundError(warehouseId);
    if (row.status !== EntityStatus.ACTIVE) {
      throw new InventoryConflictError('WAREHOUSE_UNAVAILABLE');
    }
    return row;
  }

  private async lockWarehouse(
    transaction: PrismaTransactionClient,
    warehouseId: string,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<
      Array<{ id: string; status: EntityStatus }>
    >`
      SELECT "id", "status"
      FROM "warehouses"
      WHERE "id" = ${warehouseId}::uuid
      FOR UPDATE
    `;
    const warehouse = rows[0];
    if (!warehouse) throw new InventoryWarehouseNotFoundError(warehouseId);
    if (warehouse.status !== EntityStatus.ACTIVE) {
      throw new InventoryConflictError('WAREHOUSE_UNAVAILABLE');
    }
  }

  private async lockVariant(
    transaction: PrismaTransactionClient,
    variantId: string,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "product_variants"
      WHERE "id" = ${variantId}::uuid
      FOR UPDATE
    `;
    if (!rows[0]) throw new InventoryVariantNotFoundError(variantId);
  }

  private validateAndSortLines(
    lines: ReserveInventoryLine[],
  ): ReserveInventoryLine[] {
    if (lines.length === 0) {
      throw new Error('At least one inventory line is required');
    }

    const uniqueKeys = new Set<string>();
    for (const line of lines) {
      if (
        !Number.isSafeInteger(line.quantity) ||
        line.quantity <= 0 ||
        line.quantity > 2_147_483_647
      ) {
        throw new Error('Inventory quantity must be a positive safe integer');
      }

      const key = `${line.warehouseId}:${line.variantId}`;
      if (uniqueKeys.has(key)) {
        throw new Error(`Duplicate inventory line: ${key}`);
      }
      uniqueKeys.add(key);
    }

    return [...lines].sort(
      (left, right) =>
        left.warehouseId.localeCompare(right.warehouseId) ||
        left.variantId.localeCompare(right.variantId),
    );
  }
}
