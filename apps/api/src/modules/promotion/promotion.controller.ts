import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  CouponValidationResponseDto,
  ValidateCouponRequestDto,
} from './dto/coupon.dto';
import { PromotionService } from './promotion.service';

@ApiTags('coupons')
@ApiBearerAuth()
@Controller('coupons')
export class PromotionController {
  constructor(private readonly service: PromotionService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('CART_READ_OWN')
  @ApiOperation({
    summary: 'Preview a coupon against the current cart (no usage consumed)',
  })
  @ApiOkResponse({ type: CouponValidationResponseDto })
  validate(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Body() input: ValidateCouponRequestDto,
  ): Promise<CouponValidationResponseDto> {
    return this.service.validate(actor.id, input.code);
  }
}
