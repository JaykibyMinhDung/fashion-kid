import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  CreateCouponRequestDto,
  ListCouponsQueryDto,
  UpdateCouponRequestDto,
  UpdateCouponStatusRequestDto,
  ValidateCouponRequestDto,
} from './dto/coupon.dto';
import { PromotionsService } from './promotions.service';
@ApiTags('coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CouponsController {
  constructor(private readonly service: PromotionsService) {}
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_CREATE')
  @ApiOkResponse()
  validate(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() input: ValidateCouponRequestDto,
  ) {
    return this.service.validate(user.id, input.code);
  }
}
@ApiTags('admin-coupons')
@ApiBearerAuth()
@Controller('admin/coupons')
@RequirePermissions('PROMOTION_MANAGE')
export class AdminCouponsController {
  constructor(private readonly service: PromotionsService) {}
  @Get() list(@Query() query: ListCouponsQueryDto) {
    return this.service.list(query);
  }
  @Get(':id') detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.detail(id);
  }
  @Post() @ApiCreatedResponse() create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() input: CreateCouponRequestDto,
  ) {
    return this.service.create(user.id, input);
  }
  @Patch(':id') update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCouponRequestDto,
  ) {
    return this.service.update(user.id, id, input);
  }
  @Patch(':id/status') status(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCouponStatusRequestDto,
  ) {
    return this.service.status(user.id, id, input.status);
  }
  @Get(':id/usages') usages(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.usages(id);
  }
}
