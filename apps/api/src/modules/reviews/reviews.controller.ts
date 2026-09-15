import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  ReviewQueryDto,
  ReviewStatusDto,
  UpdateReviewDto,
} from './dto/review.dto';
@Controller()
export class ReviewsController {
  constructor(private s: ReviewsService) {}
  @Post('reviews') @RequirePermissions('REVIEW_CREATE') create(
    @CurrentUser() u: AuthenticatedRequestUser,
    @Body() d: CreateReviewDto,
  ) {
    return this.s.create(u.id, d);
  }
  @Get('me/reviews') @RequirePermissions('REVIEW_UPDATE_OWN') me(
    @CurrentUser() u: AuthenticatedRequestUser,
  ) {
    return this.s.me(u.id);
  }
  @Patch('reviews/:id') @RequirePermissions('REVIEW_UPDATE_OWN') update(
    @CurrentUser() u: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() d: UpdateReviewDto,
  ) {
    return this.s.update(u.id, id, d);
  }
  @Get('products/:productId/reviews') product(
    @Param('productId') id: string,
    @Query() q: ReviewQueryDto,
  ) {
    return this.s.product(id, q);
  }
  @Get('admin/reviews') @RequirePermissions('REVIEW_MODERATE') admin(
    @Query() q: ReviewQueryDto,
  ) {
    return this.s.admin(q);
  }
  @Patch('admin/reviews/:id/status')
  @RequirePermissions('REVIEW_MODERATE')
  moderate(
    @CurrentUser() u: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() d: ReviewStatusDto,
  ) {
    return this.s.moderate(id, d, u.id);
  }
}
