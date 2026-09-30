import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  AdminReviewListResponseDto,
  AdminReviewResponseDto,
  ListAdminReviewsQueryDto,
  ModerateReviewRequestDto,
} from './dto/review.dto';
import { ReviewService } from './review.service';

@ApiTags('admin-reviews')
@ApiBearerAuth()
@Controller('admin/reviews')
export class ReviewAdminController {
  constructor(private readonly service: ReviewService) {}

  @Get()
  @RequirePermissions('REVIEW_MODERATE')
  @ApiOperation({ summary: 'List all reviews for moderation' })
  @ApiOkResponse({ type: AdminReviewListResponseDto })
  list(
    @Query() query: ListAdminReviewsQueryDto,
  ): Promise<AdminReviewListResponseDto> {
    return this.service.listAdmin(query);
  }

  @Patch(':id/status')
  @RequirePermissions('REVIEW_MODERATE')
  @ApiOperation({ summary: 'Hide/unhide a review (audited)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminReviewResponseDto })
  moderate(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: ModerateReviewRequestDto,
  ): Promise<AdminReviewResponseDto> {
    return this.service.moderate(actor.id, id, input);
  }
}
