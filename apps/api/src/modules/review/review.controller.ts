import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  CreateReviewRequestDto,
  ListMyReviewsQueryDto,
  ReviewListResponseDto,
  ReviewResponseDto,
  UpdateReviewRequestDto,
} from './dto/review.dto';
import { ReviewService } from './review.service';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller()
export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  @Post('reviews')
  @RequirePermissions('REVIEW_CREATE')
  @ApiOperation({
    summary: 'Create a review for a purchased & completed order item',
  })
  @ApiCreatedResponse({ type: ReviewResponseDto })
  create(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Body() input: CreateReviewRequestDto,
  ): Promise<ReviewResponseDto> {
    return this.service.create(actor.id, input);
  }

  @Get('me/reviews')
  @RequirePermissions('REVIEW_UPDATE_OWN')
  @ApiOperation({ summary: "List the current customer's own reviews" })
  @ApiOkResponse({ type: ReviewListResponseDto })
  listMine(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Query() query: ListMyReviewsQueryDto,
  ): Promise<ReviewListResponseDto> {
    return this.service.listMine(actor.id, query);
  }

  @Patch('reviews/:id')
  @RequirePermissions('REVIEW_UPDATE_OWN')
  @ApiOperation({ summary: 'Edit own review content (rating/comment only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ReviewResponseDto })
  update(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateReviewRequestDto,
  ): Promise<ReviewResponseDto> {
    return this.service.updateOwn(actor.id, id, input);
  }
}
