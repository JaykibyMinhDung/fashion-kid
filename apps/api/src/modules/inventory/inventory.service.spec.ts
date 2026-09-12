import { HttpStatus } from '@nestjs/common';
import { EntityStatus } from '../../generated/prisma/client';
import { ApiException } from '../../common/errors/api-error';
import type {
  InventoryHistoryResponseDto,
  InventoryItemResponseDto,
  InventoryListResponseDto,
  InventoryMutationResponseDto,
  InventoryWarehouseResponseDto,
} from './dto/inventory.dto';
import {
  InventoryConflictError,
  InventoryRepository,
  InventoryVariantNotFoundError,
} from './repositories/inventory.repository';
import { InventoryService } from './inventory.service';

function warehouse(): InventoryWarehouseResponseDto {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'MAIN_WAREHOUSE',
    name: 'Kho chính',
    address: null,
    status: EntityStatus.ACTIVE,
  };
}

function item(): InventoryItemResponseDto {
  return {
    inventoryId: null,
    variantId: '22222222-2222-4222-8222-222222222222',
    warehouse: warehouse(),
    variant: {
      id: '22222222-2222-4222-8222-222222222222',
      sku: 'TEST-SKU',
      product: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Test product',
        slug: 'test-product',
      },
      size: {
        id: '44444444-4444-4444-8444-444444444444',
        code: '90',
        name: '90',
      },
      color: {
        id: '55555555-5555-4555-8555-555555555555',
        code: 'RED',
        name: 'Red',
        hexCode: '#FF0000',
      },
    },
    onHand: 0,
    reserved: 0,
    available: 0,
    updatedAt: '2026-09-04T00:00:00.000Z',
  };
}

function mutation(): InventoryMutationResponseDto {
  return {
    inventory: item(),
    transaction: {
      id: '66666666-6666-4666-8666-666666666666',
      inventoryId: '77777777-7777-4777-8777-777777777777',
      variantId: item().variantId,
      warehouseId: warehouse().id,
      type: 'IMPORT',
      quantity: 3,
      onHandBefore: 0,
      onHandAfter: 3,
      reservedBefore: 0,
      reservedAfter: 0,
      referenceType: 'ADMIN_IMPORT',
      referenceId: null,
      actor: null,
      note: null,
      createdAt: '2026-09-04T00:00:00.000Z',
    },
  };
}

function repositoryStub(): jest.Mocked<InventoryRepository> {
  return {
    findWarehouseByCode: jest.fn().mockResolvedValue(warehouse()),
    list: jest.fn().mockResolvedValue({
      items: [item()],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    } satisfies InventoryListResponseDto),
    findByVariant: jest.fn().mockResolvedValue(item()),
    listHistory: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    } satisfies InventoryHistoryResponseDto),
    importOne: jest.fn().mockResolvedValue(mutation()),
    adjustOne: jest.fn().mockResolvedValue(mutation()),
    reserveMany: jest.fn(),
    releaseMany: jest.fn(),
    saleMany: jest.fn(),
  };
}

describe('InventoryService', () => {
  it('resolves MAIN_WAREHOUSE and delegates list with warehouse id', async () => {
    const repository = repositoryStub();
    const service = new InventoryService(
      { $transaction: jest.fn() } as never,
      repository,
    );

    const result = await service.list({ page: 1, limit: 20, sort: 'sku:asc' });

    expect(result.total).toBe(1);
    expect(repository.findWarehouseByCode.mock.calls).toContainEqual([
      'MAIN_WAREHOUSE',
    ]);
    expect(repository.list.mock.calls[0]).toEqual([
      expect.objectContaining({ warehouseId: warehouse().id, sort: 'sku:asc' }),
    ]);
  });

  it('maps missing variant to a stable 404 API error', async () => {
    const repository = repositoryStub();
    repository.findByVariant.mockResolvedValue(null);
    const service = new InventoryService(
      { $transaction: jest.fn() } as never,
      repository,
    );

    await expect(
      service.get('22222222-2222-4222-8222-222222222222'),
    ).rejects.toMatchObject<ApiException>({
      status: HttpStatus.NOT_FOUND,
      code: 'INVENTORY_VARIANT_NOT_FOUND',
    });
  });

  it('owns the transaction for import and passes actor/reference data', async () => {
    const repository = repositoryStub();
    const transaction = {};
    const prisma = {
      $transaction: jest.fn((callback: (value: unknown) => unknown) =>
        callback(transaction),
      ),
    };
    const service = new InventoryService(prisma as never, repository);

    await service.import('88888888-8888-4888-8888-888888888888', {
      variantId: item().variantId,
      quantity: 3,
      note: 'Import',
    });

    expect(repository.importOne.mock.calls[0]).toEqual([
      transaction,
      expect.objectContaining({
        variantId: item().variantId,
        quantity: 3,
        actorId: '88888888-8888-4888-8888-888888888888',
        warehouseId: warehouse().id,
      }),
    ]);
  });

  it('maps target adjustment conflict without allowing a generic stock patch', async () => {
    const repository = repositoryStub();
    repository.adjustOne.mockRejectedValue(
      new InventoryConflictError('TARGET_BELOW_RESERVED'),
    );
    const prisma = {
      $transaction: jest.fn((callback: (value: unknown) => unknown) =>
        callback({}),
      ),
    };
    const service = new InventoryService(prisma as never, repository);

    await expect(
      service.adjust('88888888-8888-4888-8888-888888888888', item().variantId, {
        targetOnHand: 1,
        reason: 'Kiểm kê',
      }),
    ).rejects.toMatchObject<ApiException>({
      status: HttpStatus.CONFLICT,
      code: 'INVENTORY_TARGET_BELOW_RESERVED',
    });
  });

  it('does not swallow unexpected repository failures', async () => {
    const repository = repositoryStub();
    repository.findByVariant.mockRejectedValue(
      new InventoryVariantNotFoundError(item().variantId),
    );
    const service = new InventoryService(
      { $transaction: jest.fn() } as never,
      repository,
    );

    await expect(service.get(item().variantId)).rejects.toMatchObject({
      code: 'INVENTORY_VARIANT_NOT_FOUND',
    });
  });
});
