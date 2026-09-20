import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { WishlistItemDto } from './dto/wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all wishlist items for a user, with product details and price range.
   */
  async getWishlist(userId: string): Promise<WishlistItemDto[]> {
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
            variants: {
              select: { price: true },
            },
          },
        },
      },
    });

    return wishlistItems.map((item) => {
      const prices = item.product.variants.map((v) => v.price);
      const minPrice =
        prices.length > 0
          ? prices.reduce((a, b) => (a < b ? a : b))
          : BigInt(0);
      const maxPrice =
        prices.length > 0
          ? prices.reduce((a, b) => (a > b ? a : b))
          : BigInt(0);

      return {
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        imageUrl: item.product.images[0]?.url ?? null,
        minPrice: minPrice.toString(),
        maxPrice: maxPrice.toString(),
        createdAt: item.createdAt,
      };
    });
  }

  /**
   * Add a product to the user's wishlist (idempotent via upsert).
   */
  async addToWishlist(userId: string, productId: string): Promise<void> {
    // Validate that the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    // Upsert so adding the same product twice is a no-op
    await this.prisma.wishlistItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: { userId, productId },
      update: {}, // nothing to update — item already exists
    });
  }

  /**
   * Remove a product from the user's wishlist.
   */
  async removeFromWishlist(
    userId: string,
    productId: string,
  ): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  }

  /**
   * Check whether a specific product is in the user's wishlist.
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.wishlistItem.findFirst({
      where: { userId, productId },
      select: { id: true },
    });

    return item !== null;
  }
}
