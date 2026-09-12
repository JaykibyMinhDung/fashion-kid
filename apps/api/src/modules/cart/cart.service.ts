import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../common/errors/api-error';
import type {
  AddCartItemRequestDto,
  CartResponseDto,
  UpdateCartItemRequestDto,
} from './dto/cart.dto';
import {
  CartConflictError,
  CartInsufficientStockError,
  CartItemNotFoundError,
  CartOutOfStockError,
  CartQuantityInvalidError,
  CartQuantityLimitExceededError,
  CartRepository,
  CartVariantNotFoundError,
  CartVariantNotSellableError,
} from './repositories/cart.repository';

@Injectable()
export class CartService {
  constructor(
    private readonly repository: CartRepository,
    private readonly config: ConfigService,
  ) {}

  getCart(userId: string): Promise<CartResponseDto> {
    return this.execute(() => this.repository.getCart(userId));
  }

  addItem(
    userId: string,
    input: AddCartItemRequestDto,
  ): Promise<CartResponseDto> {
    return this.execute(() =>
      this.repository.addItem({
        ...input,
        userId,
        maxQuantity: this.maxQuantity(),
      }),
    );
  }

  updateItem(
    userId: string,
    cartItemId: string,
    input: UpdateCartItemRequestDto,
  ): Promise<CartResponseDto> {
    return this.execute(() =>
      this.repository.updateItem({
        ...input,
        userId,
        cartItemId,
        maxQuantity: this.maxQuantity(),
      }),
    );
  }

  removeItem(userId: string, cartItemId: string): Promise<CartResponseDto> {
    return this.execute(() => this.repository.removeItem(userId, cartItemId));
  }

  clearCart(userId: string): Promise<CartResponseDto> {
    return this.execute(() => this.repository.clearCart(userId));
  }

  private maxQuantity(): number {
    return this.config.get<number>('MAX_CART_ITEM_QTY') ?? 99;
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.rethrowMapped(error);
    }
  }

  private rethrowMapped(error: unknown): never {
    if (error instanceof CartItemNotFoundError) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'CART_ITEM_NOT_FOUND',
        'Không tìm thấy sản phẩm trong giỏ hàng',
      );
    }
    if (error instanceof CartVariantNotFoundError) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'VARIANT_NOT_FOUND',
        'Không tìm thấy Product Variant',
      );
    }
    if (error instanceof CartVariantNotSellableError) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'VARIANT_NOT_SELLABLE',
        'Product Variant không còn khả dụng để mua',
      );
    }
    if (error instanceof CartOutOfStockError) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'OUT_OF_STOCK',
        'Product Variant hiện đã hết hàng',
      );
    }
    if (error instanceof CartInsufficientStockError) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'INSUFFICIENT_AVAILABLE_STOCK',
        `Chỉ còn ${error.available} sản phẩm khả dụng`,
      );
    }
    if (error instanceof CartQuantityInvalidError) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'CART_QUANTITY_INVALID',
        'Số lượng phải là số nguyên dương',
      );
    }
    if (error instanceof CartQuantityLimitExceededError) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'CART_QUANTITY_LIMIT_EXCEEDED',
        `Số lượng tối đa cho mỗi Variant là ${error.maxQuantity}`,
      );
    }
    if (error instanceof CartConflictError) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'CART_CONFLICT',
        'Giỏ hàng vừa được cập nhật, vui lòng thử lại',
      );
    }
    throw error;
  }
}
