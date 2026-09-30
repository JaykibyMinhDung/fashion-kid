import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator';
import {
  ListPublicReviewsQueryDto,
  PublicReviewListResponseDto,
} from './dto/review.dto';
import { ReviewService } from './review.service';

@ApiTags('reviews')
@Controller('products/:productId/reviews')
export class ReviewPublicController {
  constructor(private readonly service: ReviewService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List published reviews for a product' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiOkResponse({ type: PublicReviewListResponseDto })
  list(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Query() query: ListPublicReviewsQueryDto,
  ): Promise<PublicReviewListResponseDto> {
    return this.service.listPublic(productId, query);
  }
}
