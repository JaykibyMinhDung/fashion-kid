import { HttpStatus, Injectable } from '@nestjs/common';
import { EntityStatus } from '../../generated/prisma/client';
import { ApiException } from '../../common/errors/api-error';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  AdjustInventoryRequestDto,
  CreateInventoryImportRequestDto,
  InventoryHistoryResponseDto,
  InventoryItemResponseDto,
  InventoryListResponseDto,
  InventoryMutationResponseDto,
  ListInventoryHistoryQueryDto,
  ListInventoryQueryDto,
  MAIN_WAREHOUSE_CODE,
} from './dto/inventory.dto';
import {
  InventoryConflictError,
  InventoryNotFoundError,
  InventoryRepository,
  InventoryVariantNotFoundError,
  InventoryWarehouseNotFoundError,
  InsufficientInventoryError,
} from './repositories/inventory.repository';

const CONFLICT_MESSAGES = {
  NOOP: 'Mức tồn kho mới không thay đổi dữ liệu hiện tại',
  TARGET_BELOW_RESERVED:
    'On hand đích không thể nhỏ hơn số lượng đang được giữ chỗ',
  WAREHOUSE_UNAVAILABLE: 'Kho không hoạt động hoặc không sẵn sàng',
} as const;

function notFound(
  code: 'INVENTORY_VARIANT_NOT_FOUND' | 'INVENTORY_WAREHOUSE_NOT_FOUND',
  message: string,
): ApiException {
  return new ApiException(HttpStatus.NOT_FOUND, code, message);
}

function conflict(
  code:
    | 'INVENTORY_NOOP'
    | 'INVENTORY_TARGET_BELOW_RESERVED'
    | 'INVENTORY_WAREHOUSE_UNAVAILABLE'
    | 'INVENTORY_INSUFFICIENT',
  message: string,
): ApiException {
  return new ApiException(HttpStatus.CONFLICT, code, message);
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: InventoryRepository,
  ) {}

  async list(query: ListInventoryQueryDto): Promise<InventoryListResponseDto> {
    const warehouse = await this.resolveWarehouse(query.warehouseCode);
    try {
      return await this.repository.list({
        page: query.page,
        limit: query.limit,
        q: query.q,
        sort: query.sort,
        warehouseId: warehouse.id,
      });
    } catch (error) {
      this.rethrowMapped(error);
    }
  }

  async get(
    variantId: string,
    warehouseCode?: string,
  ): Promise<InventoryItemResponseDto> {
    const warehouse = await this.resolveWarehouse(warehouseCode);
    try {
      const item = await this.repository.findByVariant(variantId, warehouse.id);
      if (!item) {
        throw new InventoryVariantNotFoundError(variantId);
      }
      return item;
    } catch (error) {
      this.rethrowMapped(error);
    }
  }

  async history(
    variantId: string | undefined,
    query: ListInventoryHistoryQueryDto,
  ): Promise<InventoryHistoryResponseDto> {
    const warehouse = await this.resolveWarehouse(query.warehouseCode);
    try {
      if (variantId) {
        const item = await this.repository.findByVariant(
          variantId,
          warehouse.id,
        );
        if (!item) {
          throw new InventoryVariantNotFoundError(variantId);
        }
      }
      return await this.repository.listHistory({
        page: query.page,
        limit: query.limit,
        type: query.type,
        warehouseId: warehouse.id,
        variantId,
      });
    } catch (error) {
      this.rethrowMapped(error);
    }
  }

  async import(
    actorId: string,
    input: CreateInventoryImportRequestDto,
  ): Promise<InventoryMutationResponseDto> {
    const warehouse = await this.resolveWarehouse(input.warehouseCode);
    try {
      return await this.prisma.$transaction((transaction) =>
        this.repository.importOne(transaction, {
          variantId: input.variantId,
          quantity: input.quantity,
          referenceId: input.referenceId,
          note: input.note,
          warehouseId: warehouse.id,
          actorId,
        }),
      );
    } catch (error) {
      this.rethrowMapped(error);
    }
  }

  async adjust(
    actorId: string,
    variantId: string,
    input: AdjustInventoryRequestDto,
  ): Promise<InventoryMutationResponseDto> {
    const warehouse = await this.resolveWarehouse();
    try {
      return await this.prisma.$transaction((transaction) =>
        this.repository.adjustOne(transaction, {
          variantId,
          targetOnHand: input.targetOnHand,
          reason: input.reason,
          note: input.note,
          referenceId: input.referenceId,
          warehouseId: warehouse.id,
          actorId,
        }),
      );
    } catch (error) {
      this.rethrowMapped(error);
    }
  }

  private async resolveWarehouse(code?: string) {
    const warehouseCode = (code ?? MAIN_WAREHOUSE_CODE).trim().toUpperCase();
    const warehouse = await this.repository.findWarehouseByCode(warehouseCode);
    if (!warehouse) {
      throw notFound(
        'INVENTORY_WAREHOUSE_NOT_FOUND',
        `Không tìm thấy kho ${warehouseCode}`,
      );
    }
    if (warehouse.status !== EntityStatus.ACTIVE) {
      throw conflict(
        'INVENTORY_WAREHOUSE_UNAVAILABLE',
        CONFLICT_MESSAGES.WAREHOUSE_UNAVAILABLE,
      );
    }
    return warehouse;
  }

  private rethrowMapped(error: unknown): never {
    if (error instanceof InventoryVariantNotFoundError) {
      throw notFound(
        'INVENTORY_VARIANT_NOT_FOUND',
        'Không tìm thấy Product Variant',
      );
    }
    if (error instanceof InventoryWarehouseNotFoundError) {
      throw notFound('INVENTORY_WAREHOUSE_NOT_FOUND', 'Không tìm thấy kho');
    }
    if (error instanceof InventoryNotFoundError) {
      throw notFound(
        'INVENTORY_VARIANT_NOT_FOUND',
        'Không tìm thấy dòng tồn kho',
      );
    }
    if (error instanceof InventoryConflictError) {
      if (error.reason === 'NOOP') {
        throw conflict('INVENTORY_NOOP', CONFLICT_MESSAGES.NOOP);
      }
      if (error.reason === 'TARGET_BELOW_RESERVED') {
        throw conflict(
          'INVENTORY_TARGET_BELOW_RESERVED',
          CONFLICT_MESSAGES.TARGET_BELOW_RESERVED,
        );
      }
      throw conflict(
        'INVENTORY_WAREHOUSE_UNAVAILABLE',
        CONFLICT_MESSAGES.WAREHOUSE_UNAVAILABLE,
      );
    }
    if (error instanceof InsufficientInventoryError) {
      throw conflict(
        'INVENTORY_INSUFFICIENT',
        `Không đủ tồn kho để thực hiện ${error.operation.toLowerCase()}`,
      );
    }
    throw error;
  }
}
