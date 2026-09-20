import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../authorization/require-permissions.decorator';
import type { AuthenticatedRequestUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { InvoiceDetailResponseDto } from '../dto/invoice.dto';
import { InvoiceService } from '../services/invoice.service';

@ApiTags('customer-invoices')
@ApiBearerAuth()
@Controller('orders')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get(':orderId/invoice')
  @RequirePermissions('ORDER_READ_OWN')
  @ApiOperation({
    summary:
      'Lấy hoá đơn / biên nhận bán hàng của đơn hàng (chống IDOR, trả về 404 nếu không khớp)',
  })
  @ApiOkResponse({ type: InvoiceDetailResponseDto })
  async getOrderInvoice(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<InvoiceDetailResponseDto> {
    return this.invoiceService.getForOwner(orderId, user.id);
  }
}
