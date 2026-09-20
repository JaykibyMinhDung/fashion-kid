import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../authorization/require-permissions.decorator';
import type { AuthenticatedRequestUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import {
  ShipmentService,
  ShippingBlockDto,
} from '../services/shipment.service';

@ApiTags('operational-shipping')
@ApiBearerAuth()
@Controller()
export class ShippingOperationalController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post('operational/orders/:id/shipping/create')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_SHIP')
  @ApiOperation({
    summary: 'Tạo vận đơn GHN cho đơn hàng (nhân viên kho / quản trị)',
  })
  async createShipment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ShippingBlockDto> {
    return this.shipmentService.createShipment(id, user.id);
  }

  @Post('operational/orders/:id/shipping/sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_READ_ALL')
  @ApiOperation({
    summary: 'Đồng bộ trạng thái vận chuyển từ GHN (nhân viên vận hành)',
  })
  async syncShipment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ShippingBlockDto> {
    return this.shipmentService.syncStatus(id, user.id);
  }

  @Get(['operational/orders/:id/shipping', 'orders/:id/shipping'])
  @RequirePermissions('ORDER_READ_OWN')
  @ApiOperation({
    summary: 'Lấy thông tin khối giao vận của đơn hàng',
  })
  async getShippingBlock(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ShippingBlockDto> {
    return this.shipmentService.getShippingBlock(id);
  }
}
