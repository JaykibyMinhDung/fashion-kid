import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// ── Request DTOs ──────────────────────────────────────────────

export class AddToWishlistDto {
  @ApiProperty({
    description: 'UUID of the product to add to wishlist',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  productId: string;
}

// ── Response DTOs ─────────────────────────────────────────────

export class WishlistItemDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Bluetooth Headphones',
  })
  productName: string;

  @ApiProperty({
    description: 'Product URL slug',
    example: 'wireless-bluetooth-headphones',
  })
  productSlug: string;

  @ApiProperty({
    description: 'Primary product image URL',
    example: 'https://cdn.example.com/images/product-1.jpg',
    nullable: true,
  })
  imageUrl: string | null;

  @ApiProperty({
    description: 'Minimum variant price (BigInt as string)',
    example: '299000',
  })
  minPrice: string;

  @ApiProperty({
    description: 'Maximum variant price (BigInt as string)',
    example: '599000',
  })
  maxPrice: string;

  @ApiProperty({
    description: 'Date when the item was added to the wishlist',
    example: '2026-09-20T10:30:00.000Z',
  })
  createdAt: Date;
}

export class WishlistResponseDto {
  @ApiProperty({
    description: 'List of wishlist items with product details',
    type: [WishlistItemDto],
  })
  items: WishlistItemDto[];

  @ApiProperty({
    description: 'Total number of items in the wishlist',
    example: 5,
  })
  total: number;
}

export class WishlistCheckResponseDto {
  @ApiProperty({
    description: 'Whether the product is in the user wishlist',
    example: true,
  })
  inWishlist: boolean;
}
