import { Module } from '@nestjs/common';
import { AdminInvoiceController } from './controllers/admin-invoice.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceRepository } from './repositories/invoice.repository';
import { PrismaInvoiceRepository } from './repositories/prisma-invoice.repository';
import { InvoiceNumberService } from './services/invoice-number.service';
import { InvoiceService } from './services/invoice.service';
import { TaxConfigService } from './services/tax-config.service';

@Module({
  controllers: [InvoiceController, AdminInvoiceController],
  providers: [
    TaxConfigService,
    InvoiceNumberService,
    {
      provide: InvoiceRepository,
      useClass: PrismaInvoiceRepository,
    },
    InvoiceService,
  ],
  exports: [InvoiceService, TaxConfigService, InvoiceRepository],
})
export class BillingModule {}
