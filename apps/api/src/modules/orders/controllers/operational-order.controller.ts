import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../authorization/require-permissions.decorator';
import type { AuthenticatedRequestUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import {
  CancelOrderRequestDto,
  OrderDetailResponseDto,
  OrderListResponseDto,
  OperationalOrderQueryDto,
} from '../dto/order.dto';
import { OrderQueryService } from '../services/order-query.service';
import { OrderTransitionService } from '../services/order-transition.service';

@ApiTags('operational-orders')
@ApiBearerAuth()
@Controller('operational/orders')
export class OperationalOrderController {
  constructor(
    private readonly orderQueryService: OrderQueryService,
    private readonly orderTransitionService: OrderTransitionService,
  ) {}

  @Get()
  @RequirePermissions('ORDER_READ_ALL')
  @ApiOperation({
    summary: 'Lấy danh sách đơn hàng cho nhân viên vận hành / quản trị',
  })
  @ApiOkResponse({ type: OrderListResponseDto })
  getOrders(
    @Query() query: OperationalOrderQueryDto,
  ): Promise<OrderListResponseDto> {
    return this.orderQueryService.getOperationalOrders(query);
  }

  @Get(':id')
  @RequirePermissions('ORDER_READ_ALL')
  @ApiOperation({
    summary:
      'Lấy chi tiết đơn hàng cho nhân viên vận hành / quản trị kèm allowedActions',
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  getOrderDetail(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailResponseDto> {
    return this.orderQueryService.getOperationalOrderDetail(
      id,
      user.role,
      user.id,
    );
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_CONFIRM')
  @ApiOperation({ summary: 'Xác nhận đơn hàng (Sales Staff / Admin)' })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  confirmOrder(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailResponseDto> {
    return this.orderTransitionService.confirm(id, user.id, user.role);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_CANCEL_ANY')
  @ApiOperation({
    summary: 'Huỷ đơn hàng vận hành kèm lý do (Sales Staff / Admin)',
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  cancelOrder(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelOrderRequestDto,
  ): Promise<OrderDetailResponseDto> {
    return this.orderTransitionService.cancelByStaff(
      id,
      user.id,
      user.role,
      body.reason,
    );
  }

  @Post(':id/start-packing')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_PACK')
  @ApiOperation({
    summary: 'Bắt đầu đóng gói đơn hàng (Warehouse Staff / Admin)',
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  startPacking(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailResponseDto> {
    return this.orderTransitionService.startPacking(id, user.id, user.role);
  }

  @Post(':id/ship')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_SHIP')
  @ApiOperation({
    summary:
      'Xuất kho và chuyển sang giao hàng (Warehouse Staff / Admin) - trừ tồn kho SALE',
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  shipOrder(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailResponseDto> {
    return this.orderTransitionService.ship(id, user.id, user.role);
  }

  @Post(':id/deliver')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_DELIVER')
  @ApiOperation({ summary: 'Xác nhận đơn đã giao thành công (Admin / System)' })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  deliverOrder(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailResponseDto> {
    return this.orderTransitionService.deliver(id, user.id, user.role);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_COMPLETE')
  @ApiOperation({
    summary: 'Hoàn tất đơn hàng COD và quyết toán thanh toán PAID (Admin)',
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  completeOrder(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailResponseDto> {
    return this.orderTransitionService.complete(id, user.id, user.role);
  }
}
