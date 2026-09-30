import type {
  OrderStatus,
  ReviewStatus,
} from '../../../generated/prisma/client';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  AdminReviewListResponseDto,
  AdminReviewResponseDto,
  PublicReviewListResponseDto,
  PublicReviewSort,
  ReviewListResponseDto,
  ReviewResponseDto,
} from '../dto/review.dto';

export type OrderItemForReview = {
  id: string;
  productId: string;
  orderUserId: string;
  orderStatus: OrderStatus;
};

export type CreateReviewData = {
  userId: string;
  productId: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
};

export type UpdateReviewContent = {
  rating?: number;
  comment?: string | null;
};

export type MyReviewListQuery = {
  userId: string;
  page: number;
  limit: number;
};

export type PublicReviewListQuery = {
  productId: string;
  page: number;
  limit: number;
  rating?: number;
  sort: PublicReviewSort;
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

export abstract class ReviewRepository {
  abstract findOrderItemForReview(
    orderItemId: string,
  ): Promise<OrderItemForReview | null>;
  abstract create(data: CreateReviewData): Promise<ReviewResponseDto>;
  abstract findOwnById(
    id: string,
    userId: string,
  ): Promise<ReviewResponseDto | null>;
  abstract updateContent(
    id: string,
    data: UpdateReviewContent,
  ): Promise<ReviewResponseDto>;
  abstract listMine(query: MyReviewListQuery): Promise<ReviewListResponseDto>;
  abstract listPublic(
    query: PublicReviewListQuery,
  ): Promise<PublicReviewListResponseDto>;
  abstract findByIdAdmin(id: string): Promise<AdminReviewResponseDto | null>;
  abstract updateStatus(
    transaction: PrismaTransactionClient,
    id: string,
    status: ReviewStatus,
  ): Promise<AdminReviewResponseDto>;
  abstract listAdmin(
    query: AdminReviewListQuery,
  ): Promise<AdminReviewListResponseDto>;
}
