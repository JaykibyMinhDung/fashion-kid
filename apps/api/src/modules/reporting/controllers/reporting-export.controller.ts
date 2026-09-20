import {
  Controller,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../../common/auth/authenticated-user';
import { RequirePermissions } from '../../../authorization/require-permissions.decorator';
import {
  CouponsReportQueryDto,
  DateRangeQueryDto,
  InventoryAlertsQueryDto,
  OrdersReportQueryDto,
  RevenueSeriesQueryDto,
  TopProductsQueryDto,
} from '../dto/reporting-query.dto';
import {
  type ExportContext,
  type ExportResult,
  ReportingExportService,
} from '../export/reporting-export.service';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('reporting-export')
@ApiBearerAuth()
@RequirePermissions('REPORT_READ')
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Controller('reporting')
export class ReportingExportController {
  constructor(private readonly exportService: ReportingExportService) {}

  private extractContext(
    user: AuthenticatedRequestUser,
    req: Request,
  ): ExportContext {
    const requestIdHeader = req.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader;
    return {
      actorId: user.id,
      ipAddress: req.ip ?? null,
      requestId: requestId ?? null,
    };
  }

  private async streamWorkbook(
    res: Response,
    result: ExportResult,
  ): Promise<void> {
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('Cache-Control', 'no-store');

    await result.workbook.xlsx.write(res);
    res.end();
  }

  @Get('summary/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo tổng quan KPI' })
  @ApiProduces(XLSX_MIME)
  async exportSummary(
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportSummary(query, context);
    await this.streamWorkbook(res, result);
  }

  @Get('revenue/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo doanh thu' })
  @ApiProduces(XLSX_MIME)
  async exportRevenue(
    @Query() query: RevenueSeriesQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportRevenue(query, context);
    await this.streamWorkbook(res, result);
  }

  @Get('orders/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo đơn hàng' })
  @ApiProduces(XLSX_MIME)
  async exportOrders(
    @Query() query: OrdersReportQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportOrders(query, context);
    await this.streamWorkbook(res, result);
  }

  @Get('products/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo top sản phẩm bán chạy' })
  @ApiProduces(XLSX_MIME)
  async exportProducts(
    @Query() query: TopProductsQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportProducts(query, context);
    await this.streamWorkbook(res, result);
  }

  @Get('inventory/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo cảnh báo tồn kho' })
  @ApiProduces(XLSX_MIME)
  async exportInventory(
    @Query() query: InventoryAlertsQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportInventory(query, context);
    await this.streamWorkbook(res, result);
  }

  @Get('coupons/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo mã khuyến mãi' })
  @ApiProduces(XLSX_MIME)
  async exportCoupons(
    @Query() query: CouponsReportQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportCoupons(query, context);
    await this.streamWorkbook(res, result);
  }

  @Get('reviews/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo đánh giá' })
  @ApiProduces(XLSX_MIME)
  async exportReviews(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportReviews(context);
    await this.streamWorkbook(res, result);
  }

  @Get('payments/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo phương thức thanh toán' })
  @ApiProduces(XLSX_MIME)
  async exportPayments(
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportPayments(query, context);
    await this.streamWorkbook(res, result);
  }

  @Get('tax/export')
  @ApiOperation({ summary: 'Xuất file Excel báo cáo thuế GTGT (VAT 8%)' })
  @ApiProduces(XLSX_MIME)
  async exportTax(
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportTax(query, context);
    await this.streamWorkbook(res, result);
  }

  @Get('export/workbook')
  @ApiOperation({ summary: 'Xuất Workbook tổng hợp 9 sheet báo cáo' })
  @ApiProduces(XLSX_MIME)
  async exportConsolidatedWorkbook(
    @Query() query: RevenueSeriesQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const context = this.extractContext(user, req);
    const result = await this.exportService.exportConsolidatedWorkbook(
      query,
      context,
    );
    await this.streamWorkbook(res, result);
  }
}
