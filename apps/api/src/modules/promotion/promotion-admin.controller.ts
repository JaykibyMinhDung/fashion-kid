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
  CouponListResponseDto,
  CouponResponseDto,
  CouponUsageListResponseDto,
  CreateCouponRequestDto,
  ListCouponUsagesQueryDto,
  ListCouponsQueryDto,
  UpdateCouponRequestDto,
  UpdateCouponStatusRequestDto,
} from './dto/admin-coupon.dto';
import { CouponAdminService } from './coupon-admin.service';

@ApiTags('admin-coupons')
@ApiBearerAuth()
@Controller('admin/coupons')
export class PromotionAdminController {
  constructor(private readonly service: CouponAdminService) {}

  @Get()
  @RequirePermissions('PROMOTION_MANAGE')
  @ApiOperation({ summary: 'List coupons' })
  @ApiOkResponse({ type: CouponListResponseDto })
  list(@Query() query: ListCouponsQueryDto): Promise<CouponListResponseDto> {
    return this.service.list(query);
  }

  @Post()
  @RequirePermissions('PROMOTION_MANAGE')
  @ApiOperation({ summary: 'Create a coupon' })
  @ApiCreatedResponse({ type: CouponResponseDto })
  create(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Body() input: CreateCouponRequestDto,
  ): Promise<CouponResponseDto> {
    return this.service.create(actor.id, input);
  }

  @Get(':id')
  @RequirePermissions('PROMOTION_MANAGE')
  @ApiOperation({ summary: 'Read a coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CouponResponseDto })
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CouponResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('PROMOTION_MANAGE')
  @ApiOperation({ summary: 'Update editable coupon fields' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CouponResponseDto })
  update(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCouponRequestDto,
  ): Promise<CouponResponseDto> {
    return this.service.update(actor.id, id, input);
  }

  @Patch(':id/status')
  @RequirePermissions('PROMOTION_MANAGE')
  @ApiOperation({ summary: 'Enable/disable a coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CouponResponseDto })
  updateStatus(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCouponStatusRequestDto,
  ): Promise<CouponResponseDto> {
    return this.service.updateStatus(actor.id, id, input.status);
  }

  @Get(':id/usages')
  @RequirePermissions('PROMOTION_MANAGE')
  @ApiOperation({ summary: 'List usages of a coupon (append-only history)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CouponUsageListResponseDto })
  usages(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ListCouponUsagesQueryDto,
  ): Promise<CouponUsageListResponseDto> {
    return this.service.listUsages(id, query);
  }
}
