import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ReportingExportController } from './controllers/reporting-export.controller';
import { ReportingExportService } from './export/reporting-export.service';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { PrismaReportingRepository } from './repositories/prisma-reporting.repository';
import { ReportingRepository } from './repositories/reporting.repository';

@Module({
  imports: [AuditModule],
  controllers: [ReportingController, ReportingExportController],
  providers: [
    ReportingService,
    ReportingExportService,
    PrismaReportingRepository,
    { provide: ReportingRepository, useExisting: PrismaReportingRepository },
  ],
  exports: [ReportingService, ReportingExportService, ReportingRepository],
})
export class ReportingModule {}
