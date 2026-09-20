import { Injectable } from '@nestjs/common';
import { Prisma, ReviewStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  AdminReviewListResponseDto,
  AdminReviewResponseDto,
  PublicReviewListResponseDto,
  PublicReviewResponseDto,
  ReviewListResponseDto,
  ReviewResponseDto,
} from '../dto/review.dto';
import {
  AdminReviewListQuery,
  CreateReviewData,
  MyReviewListQuery,
  OrderItemForReview,
  PublicReviewListQuery,
  ReviewRepository,
  UpdateReviewContent,
} from './review.repository';

const PRODUCT_SELECT = {
  select: { id: true, name: true, slug: true },
} as const;
const USER_SELECT = {
  select: { id: true, fullName: true, email: true },
} as const;

type OwnReviewRow = Prisma.ReviewGetPayload<{
  include: { product: typeof PRODUCT_SELECT };
}>;
type PublicReviewRow = Prisma.ReviewGetPayload<{
  include: { user: typeof USER_SELECT };
}>;
type AdminReviewRow = Prisma.ReviewGetPayload<{
  include: { user: typeof USER_SELECT; product: typeof PRODUCT_SELECT };
}>;

@Injectable()
export class PrismaReviewRepository extends ReviewRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findOrderItemForReview(
    orderItemId: string,
  ): Promise<OrderItemForReview | null> {
    const row = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        variant: { select: { productId: true } },
        order: { select: { userId: true, status: true } },
      },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      productId: row.variant.productId,
      orderUserId: row.order.userId,
      orderStatus: row.order.status,
    };
  }

  async create(data: CreateReviewData): Promise<ReviewResponseDto> {
    const row = await this.prisma.review.create({
      data: {
        userId: data.userId,
        productId: data.productId,
        orderItemId: data.orderItemId,
        rating: data.rating,
        comment: data.comment,
        status: ReviewStatus.PUBLISHED,
      },
      include: { product: PRODUCT_SELECT },
    });
    return this.toOwnResponse(row);
  }

  async findOwnById(
    id: string,
    userId: string,
  ): Promise<ReviewResponseDto | null> {
    const row = await this.prisma.review.findFirst({
      where: { id, userId },
      include: { product: PRODUCT_SELECT },
    });
    return row ? this.toOwnResponse(row) : null;
  }

  async updateContent(
    id: string,
    data: UpdateReviewContent,
  ): Promise<ReviewResponseDto> {
    const row = await this.prisma.review.update({
      where: { id },
      data: { rating: data.rating, comment: data.comment },
      include: { product: PRODUCT_SELECT },
    });
    return this.toOwnResponse(row);
  }

  async listMine(query: MyReviewListQuery): Promise<ReviewListResponseDto> {
    const where: Prisma.ReviewWhereInput = { userId: query.userId };
    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: { product: PRODUCT_SELECT },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      items: rows.map((row) => this.toOwnResponse(row)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async listPublic(
    query: PublicReviewListQuery,
  ): Promise<PublicReviewListResponseDto> {
    const where: Prisma.ReviewWhereInput = {
      productId: query.productId,
      status: ReviewStatus.PUBLISHED,
      ...(query.rating ? { rating: query.rating } : {}),
    };

    const [total, rows, aggregate] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: { user: USER_SELECT },
        orderBy: this.publicOrderBy(query.sort),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.review.aggregate({
        where: {
          productId: query.productId,
          status: ReviewStatus.PUBLISHED,
        },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const avg = aggregate._avg.rating;
    return {
      items: rows.map((row) => this.toPublicResponse(row)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
      reviewCount: aggregate._count,
    };
  }

  async findByIdAdmin(id: string): Promise<AdminReviewResponseDto | null> {
    const row = await this.prisma.review.findUnique({
      where: { id },
      include: { user: USER_SELECT, product: PRODUCT_SELECT },
    });
    return row ? this.toAdminResponse(row) : null;
  }

  async updateStatus(
    transaction: PrismaTransactionClient,
    id: string,
    status: ReviewStatus,
  ): Promise<AdminReviewResponseDto> {
    const row = await transaction.review.update({
      where: { id },
      data: { status },
      include: { user: USER_SELECT, product: PRODUCT_SELECT },
    });
    return this.toAdminResponse(row);
  }

  async listAdmin(
    query: AdminReviewListQuery,
  ): Promise<AdminReviewListResponseDto> {
    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.q
        ? { comment: { contains: query.q, mode: 'insensitive' } }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: { user: USER_SELECT, product: PRODUCT_SELECT },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map((row) => this.toAdminResponse(row)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private publicOrderBy(
    sort: PublicReviewListQuery['sort'],
  ): Prisma.ReviewOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return [{ createdAt: 'asc' }, { id: 'asc' }];
      case 'rating_high':
        return [{ rating: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];
      case 'rating_low':
        return [{ rating: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
  }

  private toOwnResponse(row: OwnReviewRow): ReviewResponseDto {
    return {
      id: row.id,
      productId: row.productId,
      orderItemId: row.orderItemId,
      rating: row.rating,
      comment: row.comment,
      status: row.status,
      verifiedPurchase: true,
      product: row.product
        ? { id: row.product.id, name: row.product.name, slug: row.product.slug }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublicResponse(row: PublicReviewRow): PublicReviewResponseDto {
    return {
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      reviewerName: row.user.fullName,
      verifiedPurchase: true,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAdminResponse(row: AdminReviewRow): AdminReviewResponseDto {
    return {
      id: row.id,
      productId: row.productId,
      orderItemId: row.orderItemId,
      rating: row.rating,
      comment: row.comment,
      status: row.status,
      user: {
        id: row.user.id,
        fullName: row.user.fullName,
        email: row.user.email,
      },
      product: row.product
        ? { id: row.product.id, name: row.product.name, slug: row.product.slug }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
