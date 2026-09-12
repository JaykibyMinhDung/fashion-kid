import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../generated/prisma/client';
import {
  EntityStatus,
  ProductStatus,
  VariantStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
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
  type AddCartItemCommand,
  type UpdateCartItemCommand,
} from './cart.repository';
import type {
  CartAvailability,
  CartResponseDto,
  CartWarningCode,
} from '../dto/cart.dto';

export const MAIN_WAREHOUSE_CODE = 'MAIN_WAREHOUSE';

const CART_VARIANT_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      category: { select: { status: true } },
      brand: { select: { status: true } },
      images: {
        where: { isPrimary: true },
        orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
        take: 1,
        select: { id: true, url: true, altText: true },
      },
    },
  },
  size: { select: { id: true, code: true, name: true, status: true } },
  color: {
    select: { id: true, code: true, name: true, hexCode: true, status: true },
  },
  inventories: {
    where: {
      warehouse: {
        code: MAIN_WAREHOUSE_CODE,
        status: EntityStatus.ACTIVE,
      },
    },
    select: { onHand: true, reserved: true },
    take: 1,
  },
} satisfies Prisma.ProductVariantInclude;

const CART_INCLUDE = {
  items: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    include: { variant: { include: CART_VARIANT_INCLUDE } },
  },
} satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{ include: typeof CART_INCLUDE }>;
type CartVariantRow = CartRow['items'][number]['variant'];

function isSellable(variant: CartVariantRow): boolean {
  return (
    variant.status === VariantStatus.ACTIVE &&
    variant.product.status === ProductStatus.ACTIVE &&
    variant.product.category.status === EntityStatus.ACTIVE &&
    (variant.product.brand === null ||
      variant.product.brand.status === EntityStatus.ACTIVE) &&
    variant.size.status === EntityStatus.ACTIVE &&
    variant.color.status === EntityStatus.ACTIVE &&
    (variant.weightGrams ?? 0) > 0 &&
    (variant.lengthCm ?? 0) > 0 &&
    (variant.widthCm ?? 0) > 0 &&
    (variant.heightCm ?? 0) > 0 &&
    variant.product.images.length > 0
  );
}

function availableForPreview(variant: CartVariantRow): number {
  const inventory = variant.inventories[0];
  if (!inventory) return 0;
  return Math.max(0, inventory.onHand - inventory.reserved);
}

function itemWarning(
  variant: CartVariantRow,
  quantity: number,
  available: number,
): CartWarningCode | null {
  if (!isSellable(variant)) return 'VARIANT_NOT_SELLABLE';
  if (available === 0) return 'OUT_OF_STOCK';
  if (quantity > available) return 'INSUFFICIENT_AVAILABLE_STOCK';
  return null;
}

function warningMessage(code: CartWarningCode): string {
  switch (code) {
    case 'OUT_OF_STOCK':
      return 'Sản phẩm hiện đã hết hàng';
    case 'INSUFFICIENT_AVAILABLE_STOCK':
      return 'Số lượng trong giỏ vượt quá tồn kho hiện tại';
    case 'VARIANT_NOT_SELLABLE':
      return 'Sản phẩm không còn khả dụng để mua';
  }
}

function toCart(row: CartRow): CartResponseDto {
  const warnings: CartResponseDto['warnings'] = [];
  let subtotal = 0n;
  let itemCount = 0;
  const items = row.items.map((item) => {
    const variant = item.variant;
    const available = availableForPreview(variant);
    const warning = itemWarning(variant, item.quantity, available);
    const lineSubtotal = variant.price * BigInt(item.quantity);
    subtotal += lineSubtotal;
    itemCount += item.quantity;
    if (warning) {
      warnings.push({
        code: warning,
        cartItemId: item.id,
        message: warningMessage(warning),
      });
    }
    const availability: CartAvailability =
      warning === 'VARIANT_NOT_SELLABLE'
        ? 'NOT_SELLABLE'
        : warning === 'OUT_OF_STOCK'
          ? 'OUT_OF_STOCK'
          : warning === 'INSUFFICIENT_AVAILABLE_STOCK'
            ? 'INSUFFICIENT_STOCK'
            : 'AVAILABLE';
    const image = variant.product.images[0] ?? null;
    return {
      cartItemId: item.id,
      variantId: variant.id,
      sku: variant.sku,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        slug: variant.product.slug,
      },
      size: {
        id: variant.size.id,
        code: variant.size.code,
        name: variant.size.name,
      },
      color: {
        id: variant.color.id,
        code: variant.color.code,
        name: variant.color.name,
        hexCode: variant.color.hexCode,
      },
      primaryImage: image
        ? { id: image.id, url: image.url, altText: image.altText }
        : null,
      quantity: item.quantity,
      currentUnitPrice: variant.price.toString(10),
      lineSubtotal: lineSubtotal.toString(10),
      availability,
      maxAvailableForPreview: available,
      isPurchasable: warning === null,
      warning,
    };
  });

  return {
    items,
    subtotal: subtotal.toString(10),
    itemCount,
    isCheckoutReady:
      items.length > 0 && items.every((item) => item.isPurchasable),
    warnings,
  };
}

@Injectable()
export class PrismaCartRepository extends CartRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getCart(userId: string): Promise<CartResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      await this.ensureCart(transaction, userId);
      return this.readCart(transaction, userId);
    });
  }

  async addItem(command: AddCartItemCommand): Promise<CartResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.ensureCart(transaction, command.userId);
      await this.lockCart(transaction, cart.id);
      const variant = await this.findVariant(transaction, command.variantId);
      if (!variant) throw new CartVariantNotFoundError(command.variantId);
      if (!isSellable(variant)) {
        throw new CartVariantNotSellableError(command.variantId);
      }
      this.assertQuantityLimit(command.quantity, command.maxQuantity);

      const available = availableForPreview(variant);
      if (available === 0) throw new CartOutOfStockError(command.variantId);
      if (command.quantity > available) {
        throw new CartInsufficientStockError(command.variantId, available);
      }

      const existing = await transaction.cartItem.findUnique({
        where: {
          cartId_variantId: { cartId: cart.id, variantId: command.variantId },
        },
        select: { quantity: true },
      });
      const nextQuantity = (existing?.quantity ?? 0) + command.quantity;
      this.assertQuantityLimit(nextQuantity, command.maxQuantity);
      if (nextQuantity > available) {
        throw new CartInsufficientStockError(command.variantId, available);
      }

      if (existing) {
        await transaction.cartItem.update({
          where: {
            cartId_variantId: { cartId: cart.id, variantId: command.variantId },
          },
          data: { quantity: nextQuantity },
        });
      } else {
        await transaction.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: command.variantId,
            quantity: command.quantity,
          },
        });
      }
      await this.touchCart(transaction, cart.id);
      return this.readCart(transaction, command.userId);
    });
  }

  async updateItem(command: UpdateCartItemCommand): Promise<CartResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.ensureCart(transaction, command.userId);
      await this.lockCart(transaction, cart.id);
      const item = await transaction.cartItem.findFirst({
        where: { id: command.cartItemId, cartId: cart.id },
        select: { id: true, variantId: true },
      });
      if (!item) throw new CartItemNotFoundError(command.cartItemId);
      this.assertQuantityLimit(command.quantity, command.maxQuantity);

      const variant = await this.findVariant(transaction, item.variantId);
      if (!variant) throw new CartVariantNotFoundError(item.variantId);
      if (isSellable(variant)) {
        const available = availableForPreview(variant);
        if (available === 0) throw new CartOutOfStockError(item.variantId);
        if (command.quantity > available) {
          throw new CartInsufficientStockError(item.variantId, available);
        }
      }
      await transaction.cartItem.update({
        where: { id: item.id },
        data: { quantity: command.quantity },
      });
      await this.touchCart(transaction, cart.id);
      return this.readCart(transaction, command.userId);
    });
  }

  async removeItem(
    userId: string,
    cartItemId: string,
  ): Promise<CartResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.ensureCart(transaction, userId);
      await this.lockCart(transaction, cart.id);
      const deleted = await transaction.cartItem.deleteMany({
        where: { id: cartItemId, cartId: cart.id },
      });
      if (deleted.count !== 1) throw new CartItemNotFoundError(cartItemId);
      await this.touchCart(transaction, cart.id);
      return this.readCart(transaction, userId);
    });
  }

  async clearCart(userId: string): Promise<CartResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.ensureCart(transaction, userId);
      await this.lockCart(transaction, cart.id);
      await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
      await this.touchCart(transaction, cart.id);
      return this.readCart(transaction, userId);
    });
  }

  protected async ensureCart(
    transaction: PrismaTransactionClient,
    userId: string,
  ): Promise<{ id: string }> {
    const current = await transaction.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (current) return current;
    await transaction.$executeRaw(
      Prisma.sql`INSERT INTO carts (id, user_id, created_at, updated_at)
        VALUES (${randomUUID()}::uuid, ${userId}::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO NOTHING`,
    );
    const raced = await transaction.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!raced) throw new CartConflictError();
    return raced;
  }

  private async findVariant(
    transaction: PrismaTransactionClient,
    variantId: string,
  ): Promise<CartVariantRow | null> {
    return transaction.productVariant.findUnique({
      where: { id: variantId },
      include: CART_VARIANT_INCLUDE,
    });
  }

  private async readCart(
    transaction: PrismaTransactionClient,
    userId: string,
  ): Promise<CartResponseDto> {
    const cart = await transaction.cart.findUnique({
      where: { userId },
      include: CART_INCLUDE,
    });
    if (!cart) throw new CartConflictError();
    return toCart(cart);
  }

  private async lockCart(
    transaction: PrismaTransactionClient,
    cartId: string,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM carts WHERE id = ${cartId}::uuid FOR UPDATE`,
    );
    if (rows.length === 0) throw new CartConflictError();
  }

  private async touchCart(
    transaction: PrismaTransactionClient,
    cartId: string,
  ): Promise<void> {
    await transaction.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });
  }

  private assertQuantityLimit(quantity: number, maxQuantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new CartQuantityInvalidError();
    }
    if (quantity > maxQuantity) {
      throw new CartQuantityLimitExceededError(maxQuantity);
    }
  }
}
