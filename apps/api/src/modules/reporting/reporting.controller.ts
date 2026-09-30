import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import {
  CouponsReportQueryDto,
  DateRangeQueryDto,
  InventoryAlertsQueryDto,
  OrdersReportQueryDto,
  RevenueSeriesQueryDto,
  TopProductsQueryDto,
} from './dto/reporting-query.dto';
import {
  CouponsReportResponseDto,
  DashboardSummaryDto,
  InventoryAlertsResponseDto,
  OrdersReportResponseDto,
  PaymentsReportResponseDto,
  RevenueSeriesResponseDto,
  ReviewsReportResponseDto,
  TaxSummaryResponseDto,
  TopProductsResponseDto,
} from './dto/reporting-response.dto';
import { ReportingService } from './reporting.service';

@ApiTags('admin-reports')
@ApiBearerAuth()
@RequirePermissions('REPORT_READ')
@Controller('admin/reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Lấy dữ liệu tổng quan KPI Dashboard' })
  @ApiOkResponse({ type: DashboardSummaryDto })
  getDashboardSummary(
    @Query() query: DateRangeQueryDto,
  ): Promise<DashboardSummaryDto> {
    return this.reportingService.getDashboardSummary(query);
  }

  @Get('tax')
  @ApiOperation({ summary: 'Lấy báo cáo thuế GTGT (VAT) theo kỳ' })
  @ApiOkResponse({ type: TaxSummaryResponseDto })
  getTaxSummary(
    @Query() query: DateRangeQueryDto,
  ): Promise<TaxSummaryResponseDto> {
    return this.reportingService.getTaxSummary(query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Lấy chuỗi thời gian doanh thu hoàn tất' })
  @ApiOkResponse({ type: RevenueSeriesResponseDto })
  getRevenueSeries(
    @Query() query: RevenueSeriesQueryDto,
  ): Promise<RevenueSeriesResponseDto> {
    return this.reportingService.getRevenueSeries(query);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Lấy báo cáo phân bổ và xu hướng đơn hàng' })
  @ApiOkResponse({ type: OrdersReportResponseDto })
  getOrdersReport(
    @Query() query: OrdersReportQueryDto,
  ): Promise<OrdersReportResponseDto> {
    return this.reportingService.getOrdersReport(query);
  }

  @Get('products')
  @ApiOperation({ summary: 'Lấy danh sách top sản phẩm bán chạy' })
  @ApiOkResponse({ type: TopProductsResponseDto })
  getTopProducts(
    @Query() query: TopProductsQueryDto,
  ): Promise<TopProductsResponseDto> {
    return this.reportingService.getTopProducts(query);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Lấy cảnh báo tồn kho' })
  @ApiOkResponse({ type: InventoryAlertsResponseDto })
  getInventoryAlerts(
    @Query() query: InventoryAlertsQueryDto,
  ): Promise<InventoryAlertsResponseDto> {
    return this.reportingService.getInventoryAlerts(query);
  }

  @Get('coupons')
  @ApiOperation({ summary: 'Lấy báo cáo sử dụng mã khuyến mãi' })
  @ApiOkResponse({ type: CouponsReportResponseDto })
  getCouponsReport(
    @Query() query: CouponsReportQueryDto,
  ): Promise<CouponsReportResponseDto> {
    return this.reportingService.getCouponsReport(query);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Lấy báo cáo đánh giá sản phẩm' })
  @ApiOkResponse({ type: ReviewsReportResponseDto })
  getReviewsReport(): Promise<ReviewsReportResponseDto> {
    return this.reportingService.getReviewsReport();
  }

  @Get('payments')
  @ApiOperation({ summary: 'Lấy phân bổ phương thức thanh toán' })
  @ApiOkResponse({ type: PaymentsReportResponseDto })
  getPaymentsReport(
    @Query() query: DateRangeQueryDto,
  ): Promise<PaymentsReportResponseDto> {
    return this.reportingService.getPaymentsReport(query);
  }
}
