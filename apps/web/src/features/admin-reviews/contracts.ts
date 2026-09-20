export type ReviewStatus = "PUBLISHED" | "HIDDEN";

export type AdminReviewUser = {
  id: string;
  fullName: string;
  email: string;
};

export type AdminReviewProduct = {
  id: string;
  name: string;
  slug: string;
};

export type AdminReview = {
  id: string;
  productId: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  user: AdminReviewUser | null;
  product: AdminReviewProduct | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminReviewListResponse = {
  items: AdminReview[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminReviewListQuery = {
  page: number;
  limit: number;
  q?: string;
  status?: ReviewStatus;
  rating?: number;
  productId?: string;
  userId?: string;
};

export type ModerateReviewInput = {
  status: ReviewStatus;
  reason?: string;
};
