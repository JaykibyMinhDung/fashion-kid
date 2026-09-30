import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../authorization/require-permissions.decorator';
import { AdminInvoiceQueryDto } from '../dto/admin-invoice-query.dto';
import {
  InvoiceDetailResponseDto,
  InvoicePaginatedResponseDto,
} from '../dto/invoice.dto';
import { InvoiceService } from '../services/invoice.service';

@ApiTags('admin-invoices')
@ApiBearerAuth()
@Controller('admin/invoices')
export class AdminInvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @RequirePermissions('ORDER_READ_ALL')
  @ApiOperation({
    summary:
      'Lấy danh sách hoá đơn / biên nhận bán hàng cho quản trị viên / kế toán',
  })
  @ApiOkResponse({ type: InvoicePaginatedResponseDto })
  async getInvoices(
    @Query() query: AdminInvoiceQueryDto,
  ): Promise<InvoicePaginatedResponseDto> {
    return this.invoiceService.listAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('ORDER_READ_ALL')
  @ApiOperation({
    summary:
      'Lấy chi tiết hoá đơn theo ID hoặc theo số hoá đơn cho quản trị viên',
  })
  @ApiOkResponse({ type: InvoiceDetailResponseDto })
  async getInvoiceDetail(
    @Param('id') id: string,
  ): Promise<InvoiceDetailResponseDto> {
    return this.invoiceService.getAdmin(id);
  }
}
