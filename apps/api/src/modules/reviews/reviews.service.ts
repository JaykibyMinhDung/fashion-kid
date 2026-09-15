import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { OrderStatus, ReviewStatus } from '../../generated/prisma/enums';
import {
  CreateReviewDto,
  ReviewQueryDto,
  ReviewStatusDto,
  UpdateReviewDto,
} from './dto/review.dto';
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, d: CreateReviewDto) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: d.orderItemId,
        order: { userId, status: OrderStatus.COMPLETED },
      },
      select: { id: true, variant: { select: { productId: true } } },
    });
    if (!item) throw new ForbiddenException('Verified purchase required');
    try {
      return await this.prisma.review.create({
        data: {
          userId,
          orderItemId: item.id,
          productId: item.variant.productId,
          rating: d.rating,
          comment: d.comment,
          status: ReviewStatus.PUBLISHED,
        },
      });
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('REVIEW_ALREADY_EXISTS');
      }
      throw e;
    }
  }
  me(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
  async update(userId: string, id: string, d: UpdateReviewDto) {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    if (r.userId !== userId) throw new NotFoundException();
    return this.prisma.review.update({ where: { id }, data: d });
  }
  async product(productId: string, q: ReviewQueryDto) {
    const take = Number(q.limit) || 20,
      skip = ((Number(q.page) || 1) - 1) * take;
    const orderBy =
      q.sort === 'rating'
        ? { rating: 'desc' as const }
        : q.sort === 'oldest'
          ? { createdAt: 'asc' as const }
          : { createdAt: 'desc' as const };
    return this.prisma.review.findMany({
      where: {
        productId,
        status: ReviewStatus.PUBLISHED,
        ...(q.rating ? { rating: q.rating } : {}),
      },
      skip,
      take,
      orderBy,
    });
  }
  admin(q: ReviewQueryDto) {
    return this.prisma.review.findMany({
      skip: ((Number(q.page) || 1) - 1) * (Number(q.limit) || 20),
      take: Number(q.limit) || 20,
      orderBy: { createdAt: 'desc' },
    });
  }
  async moderate(id: string, d: ReviewStatusDto, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id },
        data: { status: d.status },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'REVIEW_MODERATE',
          entityType: 'Review',
          entityId: id,
          metadata: { status: d.status },
        },
      });
      return r;
    });
  }
}
