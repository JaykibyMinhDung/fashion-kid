import type { InventoryTxType } from '../../../generated/prisma/client';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  AdjustInventoryRequestDto,
  CreateInventoryImportRequestDto,
  InventoryHistoryResponseDto,
  InventoryItemResponseDto,
  InventoryListResponseDto,
  InventoryMutationResponseDto,
  InventoryWarehouseResponseDto,
  ListInventoryHistoryQueryDto,
  ListInventoryQueryDto,
} from '../dto/inventory.dto';

export type InventoryListQuery = Pick<
  ListInventoryQueryDto,
  'page' | 'limit' | 'q' | 'sort'
> & { warehouseId: string };

export type InventoryHistoryQuery = Pick<
  ListInventoryHistoryQueryDto,
  'page' | 'limit' | 'type'
> & { warehouseId: string; variantId?: string };

export type InventoryImportCommand = Omit<
  CreateInventoryImportRequestDto,
  'warehouseCode'
> & { warehouseId: string; actorId: string };

export type InventoryAdjustmentCommand = Omit<
  AdjustInventoryRequestDto,
  'referenceId'
> & {
  warehouseId: string;
  variantId: string;
  actorId: string;
  referenceId?: string;
};

export type ReserveInventoryLine = {
  warehouseId: string;
  variantId: string;
  quantity: number;
};

export type ReserveInventoryCommand = {
  lines: ReserveInventoryLine[];
  referenceType: string;
  referenceId?: string;
  actorId?: string;
  note?: string;
};

export type InventoryReservation = {
  inventoryId: string;
  ledgerId: string;
  warehouseId: string;
  variantId: string;
  onHand: number;
  reservedBefore: number;
  reservedAfter: number;
};

export type InventoryStockMutation = InventoryReservation & {
  onHandBefore: number;
  onHandAfter: number;
};

export type StockMutationCommand = {
  lines: ReserveInventoryLine[];
  referenceType: string;
  referenceId?: string;
  actorId?: string;
  note?: string;
};

export class InventoryVariantNotFoundError extends Error {
  constructor(readonly variantId: string) {
    super(`Variant ${variantId} was not found`);
    this.name = 'InventoryVariantNotFoundError';
  }
}

export class InventoryWarehouseNotFoundError extends Error {
  constructor(readonly warehouseId: string) {
    super(`Warehouse ${warehouseId} was not found`);
    this.name = 'InventoryWarehouseNotFoundError';
  }
}

export class InventoryNotFoundError extends Error {
  constructor(
    readonly variantId: string,
    readonly warehouseId: string,
  ) {
    super(`Inventory for variant ${variantId} was not found`);
    this.name = 'InventoryNotFoundError';
  }
}

export type InventoryConflictReason =
  'NOOP' | 'TARGET_BELOW_RESERVED' | 'WAREHOUSE_UNAVAILABLE';

export class InventoryConflictError extends Error {
  constructor(readonly reason: InventoryConflictReason) {
    super(reason);
    this.name = 'InventoryConflictError';
  }
}

export class InsufficientInventoryError extends Error {
  constructor(
    readonly warehouseId: string,
    readonly variantId: string,
    readonly operation: 'RESERVE' | 'RELEASE' | 'SALE' = 'RESERVE',
  ) {
    super(`Insufficient inventory for variant ${variantId}`);
    this.name = 'InsufficientInventoryError';
  }
}

export abstract class InventoryRepository {
  abstract findWarehouseByCode(
    code: string,
  ): Promise<InventoryWarehouseResponseDto | null>;

  abstract list(query: InventoryListQuery): Promise<InventoryListResponseDto>;

  abstract findByVariant(
    variantId: string,
    warehouseId: string,
  ): Promise<InventoryItemResponseDto | null>;

  abstract listHistory(
    query: InventoryHistoryQuery,
  ): Promise<InventoryHistoryResponseDto>;

  abstract importOne(
    transaction: PrismaTransactionClient,
    command: InventoryImportCommand,
  ): Promise<InventoryMutationResponseDto>;

  abstract adjustOne(
    transaction: PrismaTransactionClient,
    command: InventoryAdjustmentCommand,
  ): Promise<InventoryMutationResponseDto>;

  abstract reserveMany(
    transaction: PrismaTransactionClient,
    command: ReserveInventoryCommand,
  ): Promise<InventoryReservation[]>;

  abstract releaseMany(
    transaction: PrismaTransactionClient,
    command: StockMutationCommand,
  ): Promise<InventoryStockMutation[]>;

  abstract saleMany(
    transaction: PrismaTransactionClient,
    command: StockMutationCommand,
  ): Promise<InventoryStockMutation[]>;
}

export type InventoryTransactionType = InventoryTxType;
