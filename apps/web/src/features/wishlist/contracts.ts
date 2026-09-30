export interface WishlistItem {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  minPrice: string;
  maxPrice: string;
  createdAt: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}

export interface WishlistCheckResponse {
  inWishlist: boolean;
}
