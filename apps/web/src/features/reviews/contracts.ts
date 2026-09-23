export type ReviewStatus = "PUBLISHED" | "HIDDEN";

export type ReviewProductSummary = {
  id: string;
  name: string;
  slug: string;
};

/** Own review / result of create-update (ReviewResponseDto). */
export type Review = {
  id: string;
  productId: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  product: ReviewProductSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewListResponse = {
  items: Review[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
};

export const PUBLIC_REVIEW_SORTS = [
  "newest",
  "oldest",
  "rating_high",
  "rating_low",
] as const;
export type PublicReviewSort = (typeof PUBLIC_REVIEW_SORTS)[number];

export type PublicReviewListResponse = {
  items: PublicReview[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  averageRating: number | null;
  reviewCount: number;
};

export type PublicReviewListQuery = {
  page: number;
  limit: number;
  rating?: number;
  sort?: PublicReviewSort;
};

export type CreateReviewInput = {
  orderItemId: string;
  rating: number;
  comment?: string;
};

export type UpdateReviewInput = {
  rating?: number;
  comment?: string | null;
};
