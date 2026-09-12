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
  CustomerOrderQueryDto,
  OrderDetailResponseDto,
  OrderListResponseDto,
} from '../dto/order.dto';
import { OrderQueryService } from '../services/order-query.service';
import { OrderTransitionService } from '../services/order-transition.service';

@ApiTags('customer-orders')
@ApiBearerAuth()
@Controller('orders')
export class CustomerOrderController {
  constructor(
    private readonly orderQueryService: OrderQueryService,
    private readonly orderTransitionService: OrderTransitionService,
  ) {}

  @Get('my-orders')
  @RequirePermissions('ORDER_READ_OWN')
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng của khách hàng hiện tại' })
  @ApiOkResponse({ type: OrderListResponseDto })
  getMyOrders(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: CustomerOrderQueryDto,
  ): Promise<OrderListResponseDto> {
    return this.orderQueryService.getCustomerOrders(user.id, query);
  }

  @Get(':id')
  @RequirePermissions('ORDER_READ_OWN')
  @ApiOperation({
    summary: 'Lấy chi tiết đơn hàng của khách hàng hiện tại (chặn IDOR)',
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  getMyOrderDetail(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailResponseDto> {
    return this.orderQueryService.getCustomerOrderDetail(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_CANCEL_OWN')
  @ApiOperation({
    summary: 'Khách hàng huỷ đơn hàng khi ở trạng thái PENDING hoặc CONFIRMED',
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  cancelOrder(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelOrderRequestDto,
  ): Promise<OrderDetailResponseDto> {
    return this.orderTransitionService.cancelByCustomer(
      id,
      user.id,
      body.reason,
    );
  }
}
