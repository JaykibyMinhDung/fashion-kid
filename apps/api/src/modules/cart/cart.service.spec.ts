import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../common/errors/api-error';
import type { CartResponseDto } from './dto/cart.dto';
import {
  CartInsufficientStockError,
  CartQuantityLimitExceededError,
  CartRepository,
  CartVariantNotSellableError,
} from './repositories/cart.repository';
import { CartService } from './cart.service';

function cart(): CartResponseDto {
  return {
    items: [],
    subtotal: '0',
    itemCount: 0,
    isCheckoutReady: false,
    warnings: [],
  };
}

function repositoryStub(): jest.Mocked<CartRepository> {
  return {
    getCart: jest.fn().mockResolvedValue(cart()),
    addItem: jest.fn().mockResolvedValue(cart()),
    updateItem: jest.fn().mockResolvedValue(cart()),
    removeItem: jest.fn().mockResolvedValue(cart()),
    clearCart: jest.fn().mockResolvedValue(cart()),
  };
}

function configStub(maxQuantity = 99): ConfigService {
  return {
    get: jest.fn().mockReturnValue(maxQuantity),
  } as unknown as ConfigService;
}

describe('CartService', () => {
  it('passes authenticated ownership and configured quantity limit to repository', async () => {
    const repository = repositoryStub();
    const service = new CartService(repository, configStub(7));

    await service.addItem('user-1', { variantId: 'variant-1', quantity: 2 });
    await service.updateItem('user-1', 'item-1', { quantity: 3 });

    expect(repository.addItem.mock.calls[0]?.[0]).toEqual({
      variantId: 'variant-1',
      quantity: 2,
      userId: 'user-1',
      maxQuantity: 7,
    });
    expect(repository.updateItem.mock.calls[0]?.[0]).toEqual({
      quantity: 3,
      userId: 'user-1',
      cartItemId: 'item-1',
      maxQuantity: 7,
    });
  });

  it.each([
    [
      new CartVariantNotSellableError('variant-1'),
      'VARIANT_NOT_SELLABLE',
      HttpStatus.CONFLICT,
    ],
    [
      new CartInsufficientStockError('variant-1', 2),
      'INSUFFICIENT_AVAILABLE_STOCK',
      HttpStatus.CONFLICT,
    ],
    [
      new CartQuantityLimitExceededError(7),
      'CART_QUANTITY_LIMIT_EXCEEDED',
      HttpStatus.BAD_REQUEST,
    ],
  ])('maps %s to a stable API error', async (error, code, status) => {
    const repository = repositoryStub();
    repository.addItem.mockRejectedValue(error);
    const service = new CartService(repository, configStub(7));

    await expect(
      service.addItem('user-1', { variantId: 'variant-1', quantity: 2 }),
    ).rejects.toMatchObject<ApiException>({ code, status });
  });
});
