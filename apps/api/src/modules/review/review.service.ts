import { HttpStatus, Injectable } from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  ReviewStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ApiException } from '../../common/errors/api-error';
import { AuditService } from '../audit/audit.service';
import {
  AdminReviewListResponseDto,
  AdminReviewResponseDto,
  CreateReviewRequestDto,
  ListAdminReviewsQueryDto,
  ListMyReviewsQueryDto,
  ListPublicReviewsQueryDto,
  ModerateReviewRequestDto,
  PublicReviewListResponseDto,
  ReviewListResponseDto,
  ReviewResponseDto,
  UpdateReviewRequestDto,
} from './dto/review.dto';
import {
  ReviewRepository,
  UpdateReviewContent,
} from './repositories/review.repository';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ReviewRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    input: CreateReviewRequestDto,
  ): Promise<ReviewResponseDto> {
    const orderItem = await this.repository.findOrderItemForReview(
      input.orderItemId,
    );
    // Anti-IDOR: không tồn tại HOẶC không thuộc user → 404 (không lộ)
    if (!orderItem || orderItem.orderUserId !== userId) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'REVIEW_NOT_ELIGIBLE',
        'Không đủ điều kiện đánh giá sản phẩm này',
      );
    }
    if (orderItem.orderStatus !== OrderStatus.COMPLETED) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'REVIEW_NOT_ELIGIBLE',
        'Chỉ có thể đánh giá sau khi đơn hàng hoàn tất',
        [{ field: 'orderItemId', message: 'Đơn hàng chưa COMPLETED' }],
      );
    }

    try {
      return await this.repository.create({
        userId,
        productId: orderItem.productId,
        orderItemId: orderItem.id,
        rating: input.rating,
        comment: this.normalizeComment(input.comment),
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'REVIEW_ALREADY_EXISTS',
          'Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi',
        );
      }
      throw error;
    }
  }

  async updateOwn(
    userId: string,
    id: string,
    input: UpdateReviewRequestDto,
  ): Promise<ReviewResponseDto> {
    const existing = await this.repository.findOwnById(id, userId);
    if (!existing) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'REVIEW_NOT_FOUND',
        'Không tìm thấy đánh giá',
      );
    }

    const data: UpdateReviewContent = {};
    if (input.rating !== undefined) {
      data.rating = input.rating;
    }
    if (input.comment !== undefined) {
      data.comment = this.normalizeComment(input.comment);
    }
    if (data.rating === undefined && data.comment === undefined) {
      return existing;
    }
    // Chỉ sửa rating/comment; KHÔNG đổi status (review HIDDEN vẫn HIDDEN).
    return this.repository.updateContent(id, data);
  }

  listMine(
    userId: string,
    query: ListMyReviewsQueryDto,
  ): Promise<ReviewListResponseDto> {
    return this.repository.listMine({
      userId,
      page: query.page,
      limit: query.limit,
    });
  }

  listPublic(
    productId: string,
    query: ListPublicReviewsQueryDto,
  ): Promise<PublicReviewListResponseDto> {
    return this.repository.listPublic({
      productId,
      page: query.page,
      limit: query.limit,
      rating: query.rating,
      sort: query.sort,
    });
  }

  listAdmin(
    query: ListAdminReviewsQueryDto,
  ): Promise<AdminReviewListResponseDto> {
    return this.repository.listAdmin({
      page: query.page,
      limit: query.limit,
      q: query.q,
      status: query.status,
      rating: query.rating,
      productId: query.productId,
      userId: query.userId,
    });
  }

  async moderate(
    actorId: string,
    id: string,
    input: ModerateReviewRequestDto,
  ): Promise<AdminReviewResponseDto> {
    const before = await this.repository.findByIdAdmin(id);
    if (!before) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'REVIEW_NOT_FOUND',
        'Không tìm thấy đánh giá',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const after = await this.repository.updateStatus(tx, id, input.status);
      const action =
        input.status === ReviewStatus.HIDDEN
          ? 'REVIEW_HIDDEN'
          : 'REVIEW_PUBLISHED';
      await this.audit.record(tx, {
        actorId,
        action,
        entityType: 'Review',
        entityId: id,
        oldValues: { status: before.status },
        newValues: { status: after.status },
        metadata: input.reason ? { reason: input.reason } : null,
      });
      return after;
    });
  }

  private normalizeComment(comment: string | null | undefined): string | null {
    if (comment === undefined || comment === null) {
      return null;
    }
    const trimmed = comment.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
