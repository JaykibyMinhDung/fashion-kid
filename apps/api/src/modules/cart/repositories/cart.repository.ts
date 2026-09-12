import type {
  AddCartItemRequestDto,
  CartResponseDto,
  UpdateCartItemRequestDto,
} from '../dto/cart.dto';

export type AddCartItemCommand = AddCartItemRequestDto & {
  userId: string;
  maxQuantity: number;
};

export type UpdateCartItemCommand = UpdateCartItemRequestDto & {
  userId: string;
  cartItemId: string;
  maxQuantity: number;
};

export class CartVariantNotFoundError extends Error {
  constructor(readonly variantId: string) {
    super(`Variant ${variantId} was not found`);
    this.name = 'CartVariantNotFoundError';
  }
}

export class CartVariantNotSellableError extends Error {
  constructor(readonly variantId: string) {
    super(`Variant ${variantId} is not sellable`);
    this.name = 'CartVariantNotSellableError';
  }
}

export class CartItemNotFoundError extends Error {
  constructor(readonly cartItemId: string) {
    super(`Cart item ${cartItemId} was not found`);
    this.name = 'CartItemNotFoundError';
  }
}

export class CartQuantityInvalidError extends Error {
  constructor() {
    super('Cart quantity is invalid');
    this.name = 'CartQuantityInvalidError';
  }
}

export class CartQuantityLimitExceededError extends Error {
  constructor(readonly maxQuantity: number) {
    super(`Cart quantity cannot exceed ${maxQuantity}`);
    this.name = 'CartQuantityLimitExceededError';
  }
}

export class CartOutOfStockError extends Error {
  constructor(readonly variantId: string) {
    super(`Variant ${variantId} is out of stock`);
    this.name = 'CartOutOfStockError';
  }
}

export class CartInsufficientStockError extends Error {
  constructor(
    readonly variantId: string,
    readonly available: number,
  ) {
    super(`Variant ${variantId} has only ${available} available`);
    this.name = 'CartInsufficientStockError';
  }
}

export class CartConflictError extends Error {
  constructor() {
    super('Cart mutation conflict');
    this.name = 'CartConflictError';
  }
}

export abstract class CartRepository {
  abstract getCart(userId: string): Promise<CartResponseDto>;

  abstract addItem(command: AddCartItemCommand): Promise<CartResponseDto>;

  abstract updateItem(command: UpdateCartItemCommand): Promise<CartResponseDto>;

  abstract removeItem(
    userId: string,
    cartItemId: string,
  ): Promise<CartResponseDto>;

  abstract clearCart(userId: string): Promise<CartResponseDto>;
}
