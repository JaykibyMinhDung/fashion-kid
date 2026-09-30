import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ReviewController } from './review.controller';
import { ReviewPublicController } from './review-public.controller';
import { ReviewAdminController } from './review-admin.controller';
import { ReviewService } from './review.service';
import { ReviewRepository } from './repositories/review.repository';
import { PrismaReviewRepository } from './repositories/prisma-review.repository';

@Module({
  imports: [AuditModule],
  controllers: [
    ReviewController,
    ReviewPublicController,
    ReviewAdminController,
  ],
  providers: [
    ReviewService,
    PrismaReviewRepository,
    { provide: ReviewRepository, useExisting: PrismaReviewRepository },
  ],
  exports: [ReviewService],
})
export class ReviewModule {}
