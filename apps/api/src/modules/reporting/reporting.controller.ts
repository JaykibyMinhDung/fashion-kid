import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import {
  InventoryReportQueryDto,
  ProductReportQueryDto,
  ReportRangeQueryDto,
} from './dto/report-range.dto';
import { ReportingService } from './reporting.service';

@ApiTags('admin-reporting')
@ApiBearerAuth()
@Controller('admin/reports')
@RequirePermissions('REPORT_READ')
export class ReportingController {
  constructor(private readonly service: ReportingService) {}
  @Get('dashboard') @ApiOkResponse() dashboard(
    @Query() q: ReportRangeQueryDto,
  ) {
    return this.service.summary(q);
  }
  @Get('summary') @ApiOkResponse() summary(@Query() q: ReportRangeQueryDto) {
    return this.service.summary(q);
  }
  @Get('revenue') @ApiOkResponse() revenue(@Query() q: ReportRangeQueryDto) {
    return this.service.revenue(q);
  }
  @Get('products') @ApiOkResponse() products(
    @Query() q: ProductReportQueryDto,
  ) {
    return this.service.products(q);
  }
  @Get('inventory') @ApiOkResponse() inventory(
    @Query() q: InventoryReportQueryDto,
  ) {
    return this.service.inventory(q);
  }
}
